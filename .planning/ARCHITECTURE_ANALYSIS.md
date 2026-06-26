# Detailed Architecture Analysis - Coupling Issues & Fixes

Generated: 2026-05-22 | Based on graphify analysis + code inspection

---

## ISSUE 1: "God Module" Problem in AppModule (app.module.ts:70-125)

**Severity:** CRITICAL  
**Graph Impact:** NestJS Backend has 7 edges (2nd god node), Community 1 at 0.12 cohesion

### The Problem

All 49 feature modules are imported flat at the top level. This creates:
- No module hierarchy (monolithic import)
- Impossible to lazy-load features
- Any module change ripples through entire app
- Testing requires loading the entire backend

### Current Structure
```typescript
// apps/nestjs-backend/src/app.module.ts:70-125
exports const appModules = {
  imports: [
    AiModule,           // Line 111
    AgentModule,        // Line 112
    OAuthIntegrationModule,  // Line 105
    DocSearchModule,    // Line 108
    // ... 45 more modules
  ]
}
```

### Why It's Wrong

1. **No feature isolation** - Each module can import from any other module
2. **Circular dependency risk** - AiModule → AgentModule → AiModule (line 4 of agent.module.ts imports AiModule)
3. **Startup time** - All 49 modules must initialize before app starts
4. **Unclear dependencies** - New developers can't tell what depends on what

### Fix Strategy

Create a **feature layer architecture** with 4 tiers:

```
Tier 0: Global Services (Config, Logger, Cache, Tracing)
Tier 1: Data Access (Prisma wrapper, Repository layer)
Tier 2: Business Logic (Auth, Users, Spaces, Tables, Fields)
Tier 3: Features (Agent, AI, OAuth, Chat, Plugins)
Tier 4: API Layer (Controllers, OpenAPI modules)
```

### Concrete Fix

**Step 1: Create tier exports**
```typescript
// apps/nestjs-backend/src/features/core/core.module.ts (NEW)
@Module({
  imports: [ConfigModule, LoggerModule, CacheModule, ...],
  exports: [ConfigModule, LoggerModule, CacheModule, ...],
})
export class CoreModule {}

// apps/nestjs-backend/src/features/data-access/data-access.module.ts (NEW)
@Module({
  imports: [PrismaModule, ...],
  exports: [PrismaModule, ...],
})
export class DataAccessModule {}
```

**Step 2: Organize app.module.ts by tier**
```typescript
@Module({
  imports: [
    // Tier 0: Global
    GlobalModule,
    CoreModule,
    
    // Tier 1: Data Access
    DataAccessModule,
    
    // Tier 2: Business Logic
    AuthModule,
    UserModule,
    SpaceModule,
    BaseModule,
    
    // Tier 3: Features (only these can depend on Tier 0-2)
    AiModule,
    AgentModule,
    DocSearchModule,
    
    // Tier 4: API
    ApiModule,
  ]
})
```

**Step 3: Add import guards** (enforce via linting)
```javascript
// .eslintrc.js: depcheck or import-resolver
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          "!src/features/*/api/**",   // API layer can't import APIs from other features
          "!src/features/*/index.ts", // Force explicit imports
        ]
      }
    ]
  }
}
```

---

## ISSUE 2: Tight Coupling - AiModule Dependencies (ai.module.ts:13)

**Severity:** HIGH  
**Root Cause:** PromptService imports PrismaService directly (prompt.service.ts:2)

### The Problem

```typescript
// apps/nestjs-backend/src/features/ai/ai.module.ts:13
imports: [
  SettingModule,           // ✗ Why does prompt need Settings DB queries?
  TableOpenApiModule,      // ✗ Why does prompt need Table API?
  FieldOpenApiModule,      // ✗ Why does prompt need Field API?
  RecordOpenApiModule,     // ✗ Why does prompt need Record API?
  QueueModule
]
```

**Each import creates a dependency chain:**
- `FieldOpenApiModule` → `FieldModule` → `RecordRepository` → `PrismaService`
- `TableOpenApiModule` → `TableModule` → `TableRepository` → `PrismaService`

This violates **Single Responsibility Principle**: PromptService shouldn't care about database schema.

### Current Coupling

```typescript
// apps/nestjs-backend/src/features/ai/prompt.service.ts:1-2
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';  // ← DIRECT DB ACCESS

export class PromptService {
  // Uses PrismaService to... what? Query prompt overrides?
  // This should be in a PromptRepository instead
}
```

### Why It's Wrong

1. **Hard to test** - Can't test PromptService without mocking PrismaService
2. **Hard to reuse** - If you want PromptService in a different app (CLI, mobile), you need Prisma
3. **Unclear interface** - Constructor doesn't show what data PromptService actually needs
4. **Violates DIP** - Service depends on concrete DB implementation, not abstraction

### Fix Strategy

**Create a PromptRepository abstraction:**

```typescript
// apps/nestjs-backend/src/features/ai/prompt.repository.ts (NEW)
export interface IPromptRepository {
  getOverride(key: string): Promise<string | null>;
  setOverride(key: string, value: string): Promise<void>;
}

// Implement with Prisma
@Injectable()
export class PrismaPromptRepository implements IPromptRepository {
  constructor(private readonly prisma: PrismaService) {}
  
  async getOverride(key: string): Promise<string | null> {
    const row = await this.prisma.promptOverride.findUnique({ where: { key } });
    return row?.value ?? null;
  }
  
  async setOverride(key: string, value: string): Promise<void> {
    await this.prisma.promptOverride.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
```

**Update PromptService:**
```typescript
// apps/nestjs-backend/src/features/ai/prompt.service.ts (REFACTORED)
@Injectable()
export class PromptService {
  constructor(private readonly promptRepo: IPromptRepository) {}
  
  async get(key: string, defaultValue: string): Promise<string> {
    const override = await this.promptRepo.getOverride(key);
    return override ?? defaultValue;
  }
}
```

**Update ai.module.ts:**
```typescript
@Module({
  imports: [QueueModule],  // Only QueueModule needed, no DB modules!
  providers: [
    AiService,
    PromptService,
    {
      provide: 'IPromptRepository',
      useClass: PrismaPromptRepository,
    },
  ],
  exports: [AiService, PromptService],
})
export class AiModule {}
```

---

## ISSUE 3: Bidirectional Agent ↔️ AI Coupling (agent.module.ts:4, ai.module.ts:16)

**Severity:** MEDIUM  
**Graph Finding:** Surprising connection shows AgentExecutionService → PromptService

### The Problem

```typescript
// apps/nestjs-backend/src/features/agent/agent.module.ts:4
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule, ...],  // ← Agent depends on AI
  exports: [..., AiService, AiModule],     // ← Agent re-exports AI
})
export class AgentModule {}
```

Now if `AiModule` wants to use `AgentService` in the future:
```typescript
// This would create a CIRCULAR dependency
AgentModule → AiModule → AgentModule ❌
```

### Why It's Wrong

1. **Prevents modular testing** - Can't test Agent without AI
2. **Prevents feature reuse** - Can't use AI features without agents
3. **Creates version management complexity** - Changing one requires coordinating both
4. **Blocks parallel development** - Two teams can't work independently

### Fix Strategy

Create a **shared protocol layer:**

```typescript
// apps/nestjs-backend/src/shared/protocols/ai.protocol.ts (NEW)
export interface IAiGenerationRequest {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
}

export interface IAiGenerationResponse {
  text: string;
  tokensUsed: { input: number; output: number };
}

export const AI_GENERATION_SERVICE = 'IAiGenerationService';

export interface IAiGenerationService {
  generate(req: IAiGenerationRequest): Promise<IAiGenerationResponse>;
}
```

**Update agent.module.ts:**
```typescript
@Module({
  imports: [PrismaModule, BullModule],  // NO AiModule import
  providers: [
    AgentService,
    AgentExecutionService,
    // ... other services
  ],
  exports: [AgentService, AgentExecutionService],
})
export class AgentModule {}

// In agent-execution.service.ts constructor:
constructor(
  @Inject(AI_GENERATION_SERVICE) 
  private readonly aiClient: IAiGenerationService,
  // ... other deps
) {}
```

**Update ai.module.ts:**
```typescript
@Module({
  imports: [QueueModule],
  providers: [
    AiService,
    {
      provide: AI_GENERATION_SERVICE,
      useExisting: AiService,  // AiService implements the protocol
    },
  ],
})
export class AiModule {}
```

Now both modules are independent:
```
AgentModule ←(inject)─ AI_GENERATION_SERVICE
AiModule ─(provides)→ AI_GENERATION_SERVICE
```

---

## ISSUE 4: Low-Cohesion Community 1 (Doc Import, Agent, Features mixed)

**Severity:** MEDIUM  
**Graph Data:** 16 nodes at 0.12 cohesion

### The Problem

Graph shows these nodes loosely connected:
- `@teable/v2/adapter-logger-pino` (should be in Core)
- `AgentService`, `AgentExecutionService` (should be in Agent boundary)
- `Calculation Feature`, `Formula Field` (should be in Field boundary)
- `NestJS Backend` (god node - bridges too many communities)

### Why It's Wrong

1. **Conceptually incoherent** - Logging, agents, and field math shouldn't be in the same community
2. **Signals missing module boundaries** - Features are bleeding into each other
3. **Makes refactoring harder** - Where do you move code to without breaking things?

### Fix Strategy

**Split into 3 focused communities:**

**Community A: Core Infrastructure**
```
- Logger, Tracing, Caching
- Config, Secrets
- Database (Prisma wrapper)
```

**Community B: Agent System**
```
- AgentService, AgentExecutionService
- AgentMemoryService, AgentToolRegistry
- BullMQ scheduling
```

**Community C: Feature Services**
```
- Field logic (Calculation, Formula, Conditional)
- Record operations
- Import/Export pipeline
```

Update app.module.ts to reflect this:
```typescript
@Module({
  imports: [
    // Community A
    CoreModule,
    
    // Community B  
    AgentModule,
    
    // Community C
    FieldModule,
    RecordModule,
    // ... rest
  ]
})
```

---

## ISSUE 5: 66 Weakly-Connected Nodes (Documentation Gap)

**Severity:** LOW  
**Examples:** `Prisma Schema`, `Foreign Key Field`, `Topological Sort`

### The Problem

These components exist in code but aren't referenced in any README. Graph extraction found them as isolated nodes because no `.md` file mentions them.

### Why It's Wrong

1. **New developers don't know they exist**
2. **Can't understand why certain design decisions were made**
3. **Bug fixes might duplicate existing functionality**

### Fix Strategy

Create `.planning/ARCHITECTURE.md` sections:

```markdown
# Architecture Deep Dive

## Database Schema (Prisma)
- **Location:** `packages/db-main-prisma/prisma/schema.prisma`
- **Key Models:** 
  - User, Space, Base, Table
  - Field (polymorphic: FormulField, LookupField, ...)
  - Record, Attachment
  - OAuthIntegration, PromptOverride
- **Relationships:**
  - Table → Field (one-to-many)
  - Field → Field (self-referential for lookups/rollups)
  - Record → Attachment (one-to-many)

## Field System
- **Polymorphic Design:** Each field type (Formula, Lookup, etc.) inherits from BaseField
- **Cascade Rules:** When field is deleted, cascade updates dependent fields
- **Validation:** Each field type has custom validation (FormulField validates syntax, etc.)

## Algorithms
- **Topological Sort:** Used in `packages/db-main-prisma/src/prisma/topological-sort.ts`
  - Ensures computed fields are evaluated in dependency order
  - Prevents circular references (e.g., Field A depends on B, B depends on A)
```

---

## IMPLEMENTATION PRIORITY

1. **Week 1:** Fix ISSUE 1 (God Module) → Split app.module into tiers ⭐⭐⭐
2. **Week 2:** Fix ISSUE 2 (AI Coupling) → Create PromptRepository ⭐⭐
3. **Week 3:** Fix ISSUE 3 (Circular Deps) → Create shared protocol layer ⭐⭐
4. **Week 4:** Fix ISSUE 4 (Low Cohesion) → Reorganize modules by community
5. **Ongoing:** Fix ISSUE 5 (Documentation) → Add ARCHITECTURE.md sections

---

## TESTING STRATEGY

After each fix, verify with graphify:

```bash
# Re-run graphify on modified codebase
/graphify apps/nestjs-backend --update

# Query to verify fix worked:
/graphify query "What modules does AppModule import now?"
/graphify query "What does PromptService depend on?"
/graphify query "Is there still a circular dependency between Agent and AI?"

# Expected outcomes:
# - AppModule imports reduced to ~15 (tier modules instead of 49)
# - PromptService depends only on IPromptRepository (not PrismaService)
# - AgentModule and AiModule are independent
```

---

## VALIDATION CHECKLIST

- [ ] app.module.ts split into 4 tiers with ~15 imports (down from 49)
- [ ] PromptService uses IPromptRepository interface (not PrismaService directly)
- [ ] AgentModule and AiModule can be tested independently
- [ ] AI_GENERATION_SERVICE protocol used instead of direct AiService injection
- [ ] graphify graph shows 3 coherent communities instead of 18 loose ones
- [ ] No circular import warnings in `npm run build`
- [ ] All tests pass with `npm test`
- [ ] New developers can understand module structure from `ARCHITECTURE.md`
