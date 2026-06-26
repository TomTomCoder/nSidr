# Concrete Code Examples: Before → After

## Example 1: Decoupling PromptService from PrismaService

### BEFORE (Current - Tightly Coupled)

**File:** `apps/nestjs-backend/src/features/ai/prompt.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';  // ← Direct DB import

export const PROMPT_KEY = {
  TABLE_CREATE: 'table.create',
  // ...
} as const;

@Injectable()
export class PromptService {
  constructor(private readonly prisma: PrismaService) {}
  
  async get(key: string, defaultValue: string): Promise<string> {
    try {
      // Direct database query in business logic
      const override = await this.prisma.promptOverride.findUnique({
        where: { key },
      });
      return override?.value ?? defaultValue;
    } catch (error) {
      // If Prisma fails, entire service fails
      throw error;
    }
  }
  
  async set(key: string, value: string): Promise<void> {
    // Again, direct Prisma usage
    await this.prisma.promptOverride.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
```

**File:** `apps/nestjs-backend/src/features/ai/ai.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { FieldOpenApiModule } from '../field/open-api/field-open-api.module';    // ← Unnecessary!
import { QueueModule } from '../queue/queue.module';
import { RecordOpenApiModule } from '../record/open-api/record-open-api.module'; // ← Unnecessary!
import { SettingModule } from '../setting/setting.module';                       // ← Unnecessary!
import { TableOpenApiModule } from '../table/open-api/table-open-api.module';   // ← Unnecessary!
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';

@Module({
  // These 4 modules are ONLY needed because PromptService directly uses Prisma
  // which comes indirectly through their chain of dependencies
  imports: [
    SettingModule,          // ✗ Imports SettingService which uses Prisma
    TableOpenApiModule,     // ✗ Imports TableService which uses Prisma
    FieldOpenApiModule,     // ✗ Imports FieldService which uses Prisma
    RecordOpenApiModule,    // ✗ Imports RecordService which uses Prisma
    QueueModule,
  ],
  controllers: [AiController, PromptController],
  providers: [AiService, PromptService],
  exports: [AiService, PromptService],
})
export class AiModule {}
```

**Problem:** 
- PromptService has hard dependency on Prisma schema (knows about `promptOverride` table)
- Can't test PromptService without mocking entire Prisma service
- Can't use PromptService in other contexts (CLI, mobile, serverless)
- Adding 4 unnecessary module imports that drag in 20+ indirect dependencies

---

### AFTER (Decoupled - Clean Interface)

**File:** `apps/nestjs-backend/src/features/ai/repositories/prompt.repository.ts` (NEW)
```typescript
/**
 * Abstraction for prompt override storage.
 * Implementations can use Prisma, Redis, file system, etc.
 */
export interface IPromptRepository {
  /**
   * Get prompt override value, or null if not found.
   * Falls back to default via caller.
   */
  getOverride(key: string): Promise<string | null>;

  /**
   * Set or update a prompt override.
   */
  setOverride(key: string, value: string): Promise<void>;

  /**
   * Delete a prompt override.
   */
  deleteOverride(key: string): Promise<void>;
}
```

**File:** `apps/nestjs-backend/src/features/ai/prompt.service.ts` (REFACTORED)
```typescript
import { Injectable } from '@nestjs/common';
import { IPromptRepository } from './repositories/prompt.repository';

export const PROMPT_KEY = {
  TABLE_CREATE: 'table.create',
  // ...
} as const;

@Injectable()
export class PromptService {
  constructor(private readonly promptRepo: IPromptRepository) {}  // ← Abstraction!
  
  async get(key: string, defaultValue: string): Promise<string> {
    const override = await this.promptRepo.getOverride(key);
    return override ?? defaultValue;
  }
  
  async set(key: string, value: string): Promise<void> {
    await this.promptRepo.setOverride(key, value);
  }
}
```

**File:** `apps/nestjs-backend/src/features/ai/repositories/prisma-prompt.repository.ts` (NEW)
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { IPromptRepository } from './prompt.repository';

/**
 * Prisma-based implementation of prompt repository.
 * Only this file knows about the database schema.
 */
@Injectable()
export class PrismaPromptRepository implements IPromptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOverride(key: string): Promise<string | null> {
    const row = await this.prisma.promptOverride.findUnique({
      where: { key },
    });
    return row?.value ?? null;
  }

  async setOverride(key: string, value: string): Promise<void> {
    await this.prisma.promptOverride.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async deleteOverride(key: string): Promise<void> {
    await this.prisma.promptOverride.delete({
      where: { key },
    });
  }
}
```

**File:** `apps/nestjs-backend/src/features/ai/ai.module.ts` (SIMPLIFIED)
```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '@teable/db-main-prisma';
import { QueueModule } from '../queue/queue.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';
import { IPromptRepository } from './repositories/prompt.repository';
import { PrismaPromptRepository } from './repositories/prisma-prompt.repository';

@Module({
  imports: [
    PrismaModule,  // ← NOW EXPLICIT - Only needed for Prisma repository
    QueueModule,
  ],
  controllers: [AiController, PromptController],
  providers: [
    AiService,
    PromptService,
    // Provide IPromptRepository interface via PrismaPromptRepository implementation
    {
      provide: IPromptRepository,
      useClass: PrismaPromptRepository,
    },
  ],
  exports: [AiService, PromptService],
})
export class AiModule {}
```

**Benefits:**
✓ Removed 4 unnecessary imports (SettingModule, TableOpenApiModule, etc.)
✓ PromptService has clean constructor signature (one interface)
✓ Can test PromptService in isolation - just mock IPromptRepository
✓ Can swap implementations: `PrismaPromptRepository` → `RedisPromptRepository`
✓ Can reuse PromptService anywhere (CLI, mobile, serverless)

---

## Example 2: Breaking Circular Dependency (Agent ↔️ AI)

### BEFORE (Circular Risk)

**File:** `apps/nestjs-backend/src/features/agent/agent.module.ts`
```typescript
import { AiModule } from '../ai/ai.module';  // ← Tight coupling

@Module({
  imports: [
    PrismaModule,
    AiModule,  // ← Agent depends on AI
    BullModule.registerQueue({ name: AGENT_CRON_QUEUE }),
  ],
  providers: [AgentService, AgentExecutionService, ...],
})
export class AgentModule {}
```

**File:** `apps/nestjs-backend/src/features/agent/agent-execution.service.ts`
```typescript
import { AiService } from '../ai/ai.service';      // ← Direct import
import { PromptService } from '../ai/prompt.service';  // ← Direct import

@Injectable()
export class AgentExecutionService {
  constructor(
    private readonly agentService: AgentService,
    private readonly aiService: AiService,        // ← Direct dependency
    private readonly promptService: PromptService, // ← Direct dependency
    private readonly prismaService: PrismaService,
  ) {}
  
  async *run(ctx: AgentRunContext): AsyncGenerator<AgentRunEvent> {
    // Use aiService directly - tightly coupled
    const response = await this.aiService.generate({...});
  }
}
```

**Problem:**
- If AiModule wants to use AgentService in future → CIRCULAR dependency
- AgentModule can't be lazy-loaded (AiModule must always be loaded)
- Can't test Agent without loading AI (and all its dependencies)

---

### AFTER (Dependency Inversion)

**File:** `apps/nestjs-backend/src/shared/protocols/ai-generation.protocol.ts` (NEW)
```typescript
/**
 * Protocol for AI text generation.
 * Any module can depend on this interface without creating circular dependencies.
 */

export interface IAiGenerationRequest {
  modelId: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: object;
  }>;
}

export interface IAiGenerationResponse {
  text: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
  toolCalls?: Array<{
    name: string;
    args: object;
  }>;
}

/**
 * Service token for dependency injection.
 * This is a Symbol (not a string) to prevent naming conflicts.
 */
export const AI_GENERATION_SERVICE = Symbol('IAiGenerationService');

/**
 * Implementation must provide this interface.
 */
export interface IAiGenerationService {
  generate(request: IAiGenerationRequest): Promise<IAiGenerationResponse>;

  /**
   * Stream generation for real-time responses.
   */
  streamGenerate(
    request: IAiGenerationRequest
  ): AsyncIterable<{ delta: string }>;
}
```

**File:** `apps/nestjs-backend/src/features/ai/ai.module.ts` (UPDATED)
```typescript
import { Module } from '@nestjs/common';
import { AI_GENERATION_SERVICE } from '../../shared/protocols/ai-generation.protocol';
import { AiService } from './ai.service';
import { PromptService } from './prompt.service';

@Module({
  imports: [PrismaModule, QueueModule],
  providers: [
    AiService,
    PromptService,
    {
      provide: IPromptRepository,
      useClass: PrismaPromptRepository,
    },
    // ← NEW: Provide the protocol
    {
      provide: AI_GENERATION_SERVICE,
      useExisting: AiService,  // AiService implements IAiGenerationService
    },
  ],
  exports: [AiService, PromptService],
})
export class AiModule {}
```

**File:** `apps/nestjs-backend/src/features/ai/ai.service.ts` (UPDATED)
```typescript
import { Injectable } from '@nestjs/common';
import {
  IAiGenerationRequest,
  IAiGenerationResponse,
  IAiGenerationService,
} from '../../shared/protocols/ai-generation.protocol';

@Injectable()
export class AiService implements IAiGenerationService {  // ← Explicit interface
  async generate(request: IAiGenerationRequest): Promise<IAiGenerationResponse> {
    // Implementation...
  }

  async *streamGenerate(
    request: IAiGenerationRequest
  ): AsyncIterable<{ delta: string }> {
    // Implementation...
  }
}
```

**File:** `apps/nestjs-backend/src/features/agent/agent.module.ts` (SIMPLIFIED)
```typescript
import { Module } from '@nestjs/common';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: AGENT_CRON_QUEUE }),
    // ← NO AiModule import! Agent is independent now.
  ],
  providers: [
    AgentService,
    AgentExecutionService,
    AgentToolRegistryService,
    AgentMemoryService,
    AgentTriggerService,
    AgentSchedulerService,
    AgentOAuthService,
  ],
  exports: [
    AgentService,
    AgentExecutionService,
    AgentToolRegistryService,
    AgentMemoryService,
    AgentTriggerService,
    AgentSchedulerService,
    AgentOAuthService,
  ],
})
export class AgentModule {}
```

**File:** `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` (REFACTORED)
```typescript
import { Inject, Injectable } from '@nestjs/common';
import {
  AI_GENERATION_SERVICE,
  IAiGenerationService,
} from '../../shared/protocols/ai-generation.protocol';
import { AgentService } from './agent.service';
import { AgentToolRegistryService } from './agent-tool-registry.service';
import { AgentMemoryService } from './agent-memory.service';

@Injectable()
export class AgentExecutionService {
  constructor(
    private readonly agentService: AgentService,
    private readonly toolRegistry: AgentToolRegistryService,
    private readonly memoryService: AgentMemoryService,
    @Inject(AI_GENERATION_SERVICE)  // ← Inject via protocol
    private readonly aiClient: IAiGenerationService,  // ← Not AiService!
    private readonly prismaService: PrismaService,
  ) {}

  async *run(ctx: AgentRunContext): AsyncGenerator<AgentRunEvent> {
    // Use aiClient via protocol interface - loosely coupled
    const response = await this.aiClient.generate({
      modelId: 'gpt-4',
      messages: [...],
    });

    // Now AiModule can depend on AgentService without circular risk!
  }
}
```

**Benefits:**
✓ No circular imports possible (protocol in shared layer)
✓ AgentModule is independent - can test without AiModule
✓ AiModule can now depend on AgentService if needed (no circular risk)
✓ Can swap AI implementations: OpenAI → Claude → Local LLM
✓ AgentExecutionService doesn't care what AI provider is used
✓ New implementations of IAiGenerationService register themselves at app startup

**How this works:**
```
AppModule imports [AiModule, AgentModule, ...]
    ↓
AiModule registers: { provide: AI_GENERATION_SERVICE, useExisting: AiService }
    ↓
AgentModule asks: @Inject(AI_GENERATION_SERVICE) → receives AiService instance
    ↓
Both modules are independent; AiModule could also inject AgentService if needed
```

---

## Example 3: Simplifying AppModule (Tier Structure)

### BEFORE (49 flat imports)

**File:** `apps/nestjs-backend/src/app.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { AiModule } from './features/ai/ai.module';
import { AgentModule } from './features/agent/agent.module';
import { AttachmentsModule } from './features/attachments/attachments.module';
import { AuthModule } from './features/auth/auth.module';
import { AuthorityMatrixModule } from './features/authority-matrix/authority-matrix.module';
import { BaseModule } from './features/base/base.module';
// ... 43 more imports

@Module({
  imports: [
    SentryModule.forRoot(),
    LoggerModule.register(),
    MailSenderOpenApiModule,
    // ... all 49 modules in random order - no structure!
    AiModule,
    AgentModule,
    AttachmentsModule,
    AuthModule,
    // ... etc
  ],
  providers: [InitBootstrapProvider],
})
export class AppModule {}
```

**Problem:**
- No clear dependency order
- New developers don't know which modules are core vs. features
- Impossible to see what depends on what
- Can't lazy-load features

---

### AFTER (Tiered structure with 5 imports)

**File:** `apps/nestjs-backend/src/core/core.module.ts` (NEW)
```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { CacheModule } from '../cache/cache.module';
import { ConfigModule } from '../configs/config.module';
import { TracingModule } from '../tracing/tracing.module';

/**
 * Tier 0: Global infrastructure - available to all other modules.
 * Never depends on business logic.
 */
@Module({
  imports: [
    LoggerModule.register(),
    CacheModule,
    ConfigModule,
    TracingModule,
  ],
  exports: [
    LoggerModule,
    CacheModule,
    ConfigModule,
    TracingModule,
  ],
})
export class CoreModule {}
```

**File:** `apps/nestjs-backend/src/data-access/data-access.module.ts` (NEW)
```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '@teable/db-main-prisma';
import { PrismaPromptRepository } from '../features/ai/repositories/prisma-prompt.repository';
import { PrismaOAuthTokenRepository } from '../features/oauth/repositories/prisma-token.repository';

/**
 * Tier 1: Data Access - repositories and database abstraction.
 * Depends on: Tier 0
 * Depended on by: Tier 2, 3
 */
@Module({
  imports: [PrismaModule],
  providers: [
    PrismaPromptRepository,
    PrismaOAuthTokenRepository,
    // Add more repository implementations as needed
  ],
  exports: [
    PrismaModule,
    PrismaPromptRepository,
    PrismaOAuthTokenRepository,
  ],
})
export class DataAccessModule {}
```

**File:** `apps/nestjs-backend/src/business-logic/business-logic.module.ts` (NEW)
```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../features/auth/auth.module';
import { UserModule } from '../features/user/user.module';
import { SpaceModule } from '../features/space/space.module';
import { BaseModule } from '../features/base/base.module';
import { TableModule } from '../features/table/table.module';

/**
 * Tier 2: Business Logic - core entities and services.
 * Depends on: Tier 0, 1
 * Depended on by: Tier 3
 */
@Module({
  imports: [
    AuthModule,
    UserModule,
    SpaceModule,
    BaseModule,
    TableModule,
  ],
  exports: [
    AuthModule,
    UserModule,
    SpaceModule,
    BaseModule,
    TableModule,
  ],
})
export class BusinessLogicModule {}
```

**File:** `apps/nestjs-backend/src/features/features.module.ts` (NEW)
```typescript
import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { AgentModule } from './agent/agent.module';
import { OAuthIntegrationModule } from './oauth-integration/oauth-integration.module';
import { DocSearchModule } from './doc-search/doc-search.module';
import { ChatModule } from './chat/chat.module';

/**
 * Tier 3: Features - optional, cross-cutting features.
 * Depends on: Tier 0, 1, 2
 * Depended on by: Tier 4 (API)
 */
@Module({
  imports: [
    AiModule,
    AgentModule,
    OAuthIntegrationModule,
    DocSearchModule,
    ChatModule,
    // ... other features
  ],
  exports: [
    AiModule,
    AgentModule,
    OAuthIntegrationModule,
    DocSearchModule,
    ChatModule,
  ],
})
export class FeaturesModule {}
```

**File:** `apps/nestjs-backend/src/app.module.ts` (SIMPLIFIED)
```typescript
import { Module } from '@nestjs/common';
import { SentryModule } from '@sentry/nestjs/setup';
import { GlobalModule } from './global/global.module';
import { CoreModule } from './core/core.module';
import { DataAccessModule } from './data-access/data-access.module';
import { BusinessLogicModule } from './business-logic/business-logic.module';
import { FeaturesModule } from './features/features.module';
import { InitBootstrapProvider } from './global/init-bootstrap.provider';

/**
 * App Module - orchestrates the entire application.
 *
 * Dependency order (top to bottom only):
 * Tier 0: Global infrastructure (Logger, Cache, Config)
 *     ↓
 * Tier 1: Data access (Prisma, repositories)
 *     ↓
 * Tier 2: Business logic (Auth, Users, Spaces)
 *     ↓
 * Tier 3: Features (AI, Agents, OAuth, Chat)
 *     ↓
 * Tier 4: API (Controllers, OpenAPI)
 */
@Module({
  imports: [
    // Tier 0 + Tier 1
    GlobalModule,
    CoreModule,
    DataAccessModule,

    // Tier 2 + 3
    BusinessLogicModule,
    FeaturesModule,

    // Sentry should be first
    SentryModule.forRoot(),
  ],
  providers: [InitBootstrapProvider],
})
export class AppModule {}
```

**Benefits:**
✓ Clear structure - new developers understand dependency order immediately
✓ Can lazy-load features (FeaturesModule)
✓ Can disable features without touching AppModule (just comment out import)
✓ Easy to add new features - just add to FeaturesModule
✓ Prevents circular imports (structure enforces top → bottom flow)
✓ Reduces cognitive load - go from "49 modules" to "understand 5 tiers"

---

## Testing Examples

### BEFORE - Hard to test

```typescript
// Test PromptService - must set up Prisma, tables, tables_open_api, etc.
describe('PromptService', () => {
  let service: PromptService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        AiModule,  // ← Imports TableOpenApiModule, FieldOpenApiModule, etc.
        // Now must mock: Prisma, TableService, FieldService, ...
      ],
    }).compile();

    service = module.get<PromptService>(PromptService);
  });

  it('should get default if no override', async () => {
    const result = await service.get('test.key', 'default');
    expect(result).toBe('default');
  });
});
```

### AFTER - Easy to test

```typescript
// Test PromptService - mock only the repository
describe('PromptService', () => {
  let service: PromptService;

  const mockRepository = {
    getOverride: jest.fn().mockResolvedValue(null),
    setOverride: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    const module = Test.createTestingModule({
      providers: [
        PromptService,
        {
          provide: IPromptRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PromptService>(PromptService);
  });

  it('should get default if no override', async () => {
    const result = await service.get('test.key', 'default');
    expect(result).toBe('default');
    expect(mockRepository.getOverride).toHaveBeenCalledWith('test.key');
  });
});
```

---

## Validation Queries

After implementing these changes, run graphify to verify:

```bash
# Verify tier structure
/graphify query "What are the top-level module dependencies in AppModule?"
# Expected: CoreModule, DataAccessModule, BusinessLogicModule, FeaturesModule

# Verify decoupling
/graphify query "Does AiModule depend on AgentModule?"
# Expected: No

# Verify no circular imports
/graphify query "Are there any circular dependencies?"
# Expected: None

# Verify cohesion improvement
/graphify query "What is the cohesion score of Community 1?"
# Expected: Increased from 0.12 to 0.5+
```
