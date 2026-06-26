# Architecture Refactor Implementation Plan

## Visual Comparison: Current vs. Proposed

### CURRENT (PROBLEMATIC)

```
AppModule
├── 49 modules flat (no hierarchy)
│   ├── CoreModule
│   ├── AuthModule
│   ├── AiModule ←──────┐
│   │   ├── PromptService (imports PrismaService directly) ✗
│   │   ├── TableOpenApiModule ✗ (unnecessary dependency)
│   │   ├── FieldOpenApiModule ✗ (unnecessary dependency)
│   │   └── RecordOpenApiModule ✗ (unnecessary dependency)
│   │
│   ├── AgentModule ──→ AiModule (circular risk) ✗
│   │   ├── AgentExecutionService
│   │   ├── AgentOAuthService
│   │   └── imports PrismaService directly ✗
│   │
│   ├── OAuthIntegrationModule
│   │   └── imports PrismaService directly ✗
│   │
│   ├── DocSearchModule (OK - clean)
│   │   └── DocIngestionService
│   │
│   └── ... 41 more modules

Problems:
- No clear tier structure
- Hard to understand dependencies
- Circular import risks
- Everything depends on everything
- Tests must load entire app
- Slow startup time
```

### PROPOSED (CLEAN)

```
AppModule
├── Tier 0: GlobalModule
│   ├── ConfigModule
│   ├── LoggerModule
│   ├── CacheModule
│   └── TracingModule
│
├── Tier 1: DataAccessModule
│   ├── PrismaModule
│   ├── RepositoryFactory
│   └── Exports: IBaseRepository, IFieldRepository, IPromptRepository
│
├── Tier 2: BusinessLogicModule
│   ├── AuthModule
│   ├── UserModule
│   ├── SpaceModule
│   ├── BaseModule
│   └── TableModule
│
├── Tier 3: FeatureModule
│   ├── AiModule
│   │   ├── AiService (implements IAiGenerationService)
│   │   ├── PromptService (uses IPromptRepository, NOT PrismaService)
│   │   └── Exports: IAiGenerationService, PromptService
│   │
│   ├── AgentModule (INDEPENDENT from Ai)
│   │   ├── AgentExecutionService (injects AI_GENERATION_SERVICE)
│   │   ├── AgentToolRegistryService
│   │   └── Exports: AgentService
│   │
│   ├── OAuthIntegrationModule
│   │   ├── OAuthIntegrationService (uses ITokenRepository)
│   │   └── Exports: OAuthIntegrationService
│   │
│   └── DocSearchModule (clean - no changes)
│       ├── DocIngestionService
│       └── Exports: DocSearchService
│
└── Tier 4: ApiModule
    ├── AiController (calls AiService)
    ├── AgentController (calls AgentService)
    ├── DocSearchController (calls DocSearchService)
    └── ... rest of controllers

Benefits:
✓ Clear dependency direction (top → bottom only)
✓ Easy to understand module relationships
✓ No circular imports possible
✓ Can lazy-load features
✓ Each module independently testable
✓ New developers understand structure
✓ Parallel development possible
```

---

## Phase-by-Phase Migration

### Phase 1: Establish Core & Data Access Tiers (Week 1)

**Target:** 49 modules → 15 tier modules

**Files to Create:**
```
apps/nestjs-backend/src/core/
├── core.module.ts          (GlobalModule moved here)
├── logger/
├── cache/
├── config/
└── tracing/

apps/nestjs-backend/src/data-access/
├── data-access.module.ts   (NEW - exports repositories)
├── repositories/
│   ├── prompt.repository.ts (NEW - IPromptRepository interface)
│   ├── oauth-token.repository.ts (NEW - ITokenRepository interface)
│   └── index.ts
├── prisma-repositories/
│   ├── prompt.repository.ts (implementation)
│   ├── oauth-token.repository.ts (implementation)
│   └── index.ts
└── schemas/
    └── (type defs for repository patterns)
```

**Changes Required:**
1. Move existing core modules into Tier 0
2. Create repository interfaces (don't implement yet)
3. Update app.module.ts to import [CoreModule, DataAccessModule, ...]
4. Run tests - nothing should break yet (repositories are just interfaces)

**Validation:**
```bash
npm run build  # Should succeed
npm run test   # Should still pass
graphify query "What modules does AppModule import?"
# Expected: 15 imports (previously 49)
```

---

### Phase 2: Decouple AI Service (Week 2)

**Target:** PromptService stops importing PrismaService

**Files to Create:**
```
apps/nestjs-backend/src/features/ai/
├── protocols/
│   └── prompt.repository.ts (IPromptRepository moved here from data-access)
├── prompt.repository.ts     (PrismaPromptRepository implementation)
├── ai.module.ts             (UPDATED - only imports QueueModule)
└── prompt.service.ts        (REFACTORED - uses IPromptRepository)
```

**Changes Required:**
1. Extract IPromptRepository interface (from data-access)
2. Implement PrismaPromptRepository (keep in ai module or separate)
3. Update PromptService constructor: `PrismaService` → `IPromptRepository`
4. Remove from ai.module.ts: `TableOpenApiModule`, `FieldOpenApiModule`, `RecordOpenApiModule`
5. Update agent-execution.service.ts: only `AgentService`, `PromptService` injected (not full AiModule)

**Before:**
```typescript
// prompt.service.ts
constructor(private readonly prisma: PrismaService) {}
```

**After:**
```typescript
// prompt.service.ts
constructor(private readonly promptRepo: IPromptRepository) {}

// agent-execution.service.ts
constructor(
  private readonly aiService: AiService,
  private readonly promptService: PromptService
) {}  // No PrismaService directly!
```

**Validation:**
```bash
npm run build
npm test -- ai.module    # AI module tests should pass independently
graphify query "What does AiModule import?"
# Expected: QueueModule only (not table/field/record modules)
```

---

### Phase 3: Create AI Protocol Layer (Week 3)

**Target:** AgentModule and AiModule can be tested independently

**Files to Create:**
```
apps/nestjs-backend/src/shared/protocols/
├── ai-generation.protocol.ts     (IAiGenerationService interface)
├── ai-generation.module.ts       (NEW - provides the service)
└── index.ts
```

**Protocol Definition:**
```typescript
// ai-generation.protocol.ts
export interface IAiGenerationRequest {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  tools?: object[];
}

export interface IAiGenerationResponse {
  text: string;
  tokensUsed?: { input: number; output: number };
  toolCalls?: Array<{ name: string; args: object }>;
}

export const AI_GENERATION_SERVICE = Symbol('IAiGenerationService');

export interface IAiGenerationService {
  generate(req: IAiGenerationRequest): Promise<IAiGenerationResponse>;
  streamGenerate(req: IAiGenerationRequest): AsyncIterable<string>;
}
```

**Changes Required:**
1. Create `AIGenerationModule` that provides `AI_GENERATION_SERVICE`
2. Update `AiModule` to provide the implementation:
   ```typescript
   {
     provide: AI_GENERATION_SERVICE,
     useExisting: AiService,
   }
   ```
3. Update `AgentModule` to inject via symbol:
   ```typescript
   constructor(
     @Inject(AI_GENERATION_SERVICE)
     private readonly aiClient: IAiGenerationService
   ) {}
   ```
4. Remove direct `AiModule` import from `AgentModule`

**Before:**
```typescript
// agent.module.ts
imports: [PrismaModule, AiModule, BullModule]  // ← Tightly coupled

// agent-execution.service.ts
constructor(
  private readonly aiService: AiService  // ← Direct dependency
) {}
```

**After:**
```typescript
// agent.module.ts
imports: [PrismaModule, BullModule]  // ← No AiModule!

// agent-execution.service.ts
constructor(
  @Inject(AI_GENERATION_SERVICE)
  private readonly aiClient: IAiGenerationService  // ← Protocol-based
) {}
```

**Validation:**
```bash
npm run build
npm test -- agent.module      # Can run without AiModule loaded
npm test -- ai.module         # Can run without AgentModule loaded
graphify query "Are Agent and AI modules independent?"
# Expected: No imports between them
```

---

### Phase 4: Refactor Low-Cohesion Communities (Week 4)

**Target:** Split Community 1 into 3 focused communities

**No new files - just reorganization:**
1. Move Logger to CoreModule
2. Move Calculation/Formula logic into FieldModule
3. Keep Agent system as independent feature
4. Document the new structure in ARCHITECTURE.md

**Validation:**
```bash
/graphify apps/nestjs-backend --update
# Expected: Cohesion scores improve
#   Community A (Core): 0.8+
#   Community B (Agent): 0.7+
#   Community C (Features): 0.7+
```

---

### Phase 5: Document & Verify (Ongoing)

**Create/Update Documentation:**
- `.planning/ARCHITECTURE.md` - Deep dive on each module
- `README.md` files in each Tier directory
- Dependency graph in `.planning/ARCHITECTURE_REFACTOR_PLAN.md` (this file)

**Automated Verification:**
```bash
# Add to pre-commit hook
npm run build --strict        # Catch circular imports
npm run lint --fix            # Enforce module boundaries
npm run test -- --coverage    # Verify tests still pass
graphify query "Any circular dependencies?"  # Graph-based check
```

---

## Risk Assessment

| Phase | Risk | Mitigation |
|-------|------|-----------|
| 1 | Breaking imports of core modules | Branch → test on branch → merge with PR review |
| 2 | PromptService API changes | Gradual: add new interface → deprecate old one → remove |
| 3 | AgentModule can't find AiService | Integration tests before merge; inject AI_GENERATION_SERVICE correctly |
| 4 | Moving code breaks something | Use git diff to understand changes; review line-by-line |
| 5 | Docs go stale | Create ARCHITECTURE.md before Phase 1, update after each phase |

---

## Success Criteria

### Code Metrics
- [ ] app.module.ts: 49 → 15 imports
- [ ] PromptService: 0 direct Prisma imports (uses IPromptRepository instead)
- [ ] AgentModule: 0 AiModule imports (uses AI_GENERATION_SERVICE)
- [ ] No circular dependency warnings in build output

### Graph Metrics
- [ ] 18 communities → 6-8 coherent communities (based on tier structure)
- [ ] Community 0 (Doc Import): cohesion ≥0.5 (from 0.14)
- [ ] Community 1 (Agent): cohesion ≥0.5 (from 0.12)
- [ ] All 66 weakly-connected nodes have documentation in ARCHITECTURE.md

### Developer Experience
- [ ] New developers understand module structure without asking
- [ ] Can test individual modules without loading entire app
- [ ] Can parallel-develop features without merge conflicts
- [ ] ARCHITECTURE.md mentions all major components (Prisma schema, Field system, Algorithms, etc.)

---

## Timeline & Estimate

| Phase | Duration | Dev Cost | Risk |
|-------|----------|----------|------|
| 1: Tier structure | 2-3 days | 1 dev | Low |
| 2: AI decoupling | 2-3 days | 1 dev | Medium |
| 3: Protocol layer | 1-2 days | 1 dev | Medium |
| 4: Community split | 1 day | 1 dev | Low |
| 5: Documentation | Ongoing | 0.5 dev | None |
| **Total** | **~2 weeks** | **~4-5 dev days** | **Low-Medium** |

**Quick win:** Complete Phase 1 (tier structure) to immediately reduce cognitive load. Even without Phases 2-3, a hierarchical module structure dramatically improves codebase understandability.
