import { FieldType } from '@teable/core';
import { LLMProviderType } from '@teable/openapi';
import type { LLMProvider } from '@teable/openapi';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiOutputValidationService } from './ai-output-validation.service';
import { AiService } from './ai.service';

// Mock the `ai` package — generateText / generateObject are stubbed; AiService
// still uses the real AiOutputValidationService instance so validation shape
// drift is caught at compile/runtime (Phase 17.1 mock-shape-drift hedge).
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn(),
    generateObject: vi.fn(),
    embedMany: vi.fn(),
  };
});

const openAIProviderName = 'custom-openai';
const openRouterProviderName = 'custom-openrouter';
const gptImage2Model = 'gpt-image-2';
const openRouterModel = `openai/${gptImage2Model}`;
const imageGenerationTag = 'image-generation';

describe('AiService.getModelTags', () => {
  const service = Object.create(AiService.prototype) as AiService;

  it('does not infer tags for direct OpenAI GPT image models without explicit config', async () => {
    const tags = await service.getModelTags(
      `${LLMProviderType.OPENAI}@${gptImage2Model}@${openAIProviderName}`,
      [
        {
          type: LLMProviderType.OPENAI,
          name: openAIProviderName,
          models: gptImage2Model,
        },
      ]
    );

    expect(tags).toEqual([]);
  });

  it('returns explicit direct OpenAI GPT image tags without inference', async () => {
    const tags = await service.getModelTags(
      `${LLMProviderType.OPENAI}@${gptImage2Model}@${openAIProviderName}`,
      [
        {
          type: LLMProviderType.OPENAI,
          name: openAIProviderName,
          models: gptImage2Model,
          modelConfigs: {
            [gptImage2Model]: {
              tags: [imageGenerationTag],
            },
          },
        },
      ]
    );

    expect(tags).toEqual([imageGenerationTag]);
  });

  it('does not infer tags for OpenRouter models without explicit config', async () => {
    const tags = await service.getModelTags(
      `${LLMProviderType.OPENROUTER}@${openRouterModel}@${openRouterProviderName}`,
      [
        {
          type: LLMProviderType.OPENROUTER,
          name: openRouterProviderName,
          models: openRouterModel,
        },
      ]
    );

    expect(tags).toEqual([]);
  });
});

describe('AiService.generateForField', () => {
  // Use a prototype-spy harness (no DI bootstrap) — matches the existing
  // pattern at the top of this file. We attach the real AiOutputValidationService
  // and stub only the methods that hit IO (getGenerationModelInstance).
  const buildService = (options: {
    provider: 'openai' | 'anthropic' | 'unknown';
    generateTextReturns?: string[];
    generateObjectReturns?: unknown;
    generateObjectThrows?: Error;
  }) => {
    const svc = Object.create(AiService.prototype) as AiService & {
      aiOutputValidationService: AiOutputValidationService;
      logger: { warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    };
    // Real validation service — drift in validator output shape breaks tests.
    (svc as any).aiOutputValidationService = new AiOutputValidationService();
    (svc as any).logger = { warn: vi.fn(), error: vi.fn() };
    // Stub model-resolution to return a synthetic instance the provider check sees.
    (svc as any).getGenerationModelInstance = vi.fn().mockResolvedValue({
      provider: options.provider,
    });

    return svc;
  };

  const aiPkg = vi.hoisted(() => ({ generateText: vi.fn(), generateObject: vi.fn() }));

  // Bind the hoisted mocks every test (cleared between tests by vitest restoreMocks).
  const setupMocks = async (cfg: {
    generateTextReturns?: string[];
    generateObjectReturns?: unknown;
    generateObjectThrows?: Error;
  }) => {
    const { generateObject, generateText } = await import('ai');
    const mockGenText = generateText as unknown as ReturnType<typeof vi.fn>;
    const mockGenObj = generateObject as unknown as ReturnType<typeof vi.fn>;
    mockGenText.mockReset();
    mockGenObj.mockReset();
    if (cfg.generateObjectThrows) {
      mockGenObj.mockRejectedValue(cfg.generateObjectThrows);
    } else if (cfg.generateObjectReturns !== undefined) {
      mockGenObj.mockResolvedValue({ object: cfg.generateObjectReturns });
    }
    if (cfg.generateTextReturns) {
      for (const t of cfg.generateTextReturns) {
        mockGenText.mockResolvedValueOnce({ text: t });
      }
    }
    return { mockGenText, mockGenObj };
  };

  const textField = {
    id: 'fldAiText',
    type: FieldType.SingleLineText,
  } as unknown as Parameters<AiService['generateForField']>[1];

  const singleSelectField = {
    id: 'fldAiSel',
    type: FieldType.SingleSelect,
    options: { choices: [{ name: 'red' }, { name: 'blue' }] },
  } as unknown as Parameters<AiService['generateForField']>[1];

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('structured-output path: generateObject success returns { validated:true, attempts:1 }', async () => {
    const svc = buildService({ provider: 'openai' });
    await setupMocks({ generateObjectReturns: 'red' });

    const result = await svc.generateForField('base1', singleSelectField, 'pick a color');

    expect(result.validated).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.value).toBe('red');
  });

  it('text+validate path (provider unsupported): success on first try → attempts:1', async () => {
    const svc = buildService({ provider: 'unknown' });
    await setupMocks({ generateTextReturns: ['hello world'] });

    const result = await svc.generateForField('base1', textField, 'say hello');

    expect(result.validated).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.value).toBe('hello world');
  });

  it('text+validate path: retry-then-success → attempts:2', async () => {
    const svc = buildService({ provider: 'unknown' });
    // First attempt: invalid (purple not in choices). Second attempt: valid (red).
    await setupMocks({ generateTextReturns: ['purple', 'red'] });

    const result = await svc.generateForField('base1', singleSelectField, 'pick a color');

    expect(result.validated).toBe(true);
    expect(result.attempts).toBe(2);
    expect(result.value).toBe('red');
  });

  it('text+validate path: retry-then-fail → { validated:false, attempts:2, error }', async () => {
    const svc = buildService({ provider: 'unknown' });
    await setupMocks({ generateTextReturns: ['purple', 'still wrong'] });

    const result = await svc.generateForField('base1', singleSelectField, 'pick a color');

    expect(result.validated).toBe(false);
    expect(result.attempts).toBe(2);
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('structured-output throws → falls back to text+validate (still surfaces)', async () => {
    const svc = buildService({ provider: 'openai' });
    await setupMocks({
      generateObjectThrows: new Error('provider rejected schema'),
      generateTextReturns: ['red'],
    });

    const result = await svc.generateForField('base1', singleSelectField, 'pick a color');

    expect(result.validated).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.value).toBe('red');
  });
});

// ---------------------------------------------------------------------------
// GW-05 cascade resolution tests (Task 1 stubs — implemented in Task 3)
// Fixture: one provider with provider-level apiKey + one model with a model-level override
// ---------------------------------------------------------------------------

const cascadeModel = 'gpt-4o';
const cascadeProviderName = 'my-openai';
const cascadeModelKey = `${LLMProviderType.OPENAI}@${cascadeModel}@${cascadeProviderName}`;

const buildCascadeProviders = (opts: {
  providerApiKey?: string;
  modelApiKey?: string;
}): LLMProvider[] => [
  {
    type: LLMProviderType.OPENAI,
    name: cascadeProviderName,
    models: cascadeModel,
    apiKey: opts.providerApiKey,
    modelConfigs: opts.modelApiKey ? { [cascadeModel]: { apiKey: opts.modelApiKey } } : undefined,
  },
];

describe('AiService.resolveApiKey — GW-05 cascade', () => {
  const service = Object.create(AiService.prototype) as AiService;

  it('cascade: model override wins', () => {
    const providers = buildCascadeProviders({
      providerApiKey: 'prov-key',
      modelApiKey: 'model-key',
    });
    const result = service.resolveApiKey(cascadeModelKey, providers);
    expect(result).toBe('model-key');
  });

  it('cascade: provider default used when no override', () => {
    const providers = buildCascadeProviders({ providerApiKey: 'prov-key' });
    const result = service.resolveApiKey(cascadeModelKey, providers);
    expect(result).toBe('prov-key');
  });

  it('cascade: fail loud names model', () => {
    const providers = buildCascadeProviders({});
    expect(() => service.resolveApiKey(cascadeModelKey, providers)).toThrow(cascadeModelKey);
  });
});

// ---------------------------------------------------------------------------
// GW-04 embed routing test — embed() routes through getEmbeddingModelInstance,
// not a hardcoded OpenAI instance
// ---------------------------------------------------------------------------

describe('AiService.embed — GW-04 routing', () => {
  it('embed routes through configured provider', async () => {
    const svc = Object.create(AiService.prototype) as AiService;

    // Stub getEmbeddingModelInstance to return a sentinel model object
    const sentinelModel = { provider: 'test-provider', modelId: 'text-embedding-sentinel' };
    (svc as any).getEmbeddingModelInstance = vi.fn().mockResolvedValue(sentinelModel);

    // Stub embedMany to return known embeddings
    const { embedMany: mockEmbedMany } = await import('ai');
    const mockEmbedFn = mockEmbedMany as unknown as ReturnType<typeof vi.fn>;
    mockEmbedFn.mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] });

    const providers: LLMProvider[] = [
      {
        type: LLMProviderType.OPENAI,
        name: cascadeProviderName,
        models: 'text-embedding-3-small',
        apiKey: 'prov-key',
      },
    ];

    const embeddingKey = `${LLMProviderType.OPENAI}@text-embedding-3-small@${cascadeProviderName}`;
    const result = await svc.embed(['hello'], embeddingKey, providers);

    // Verify the model passed to embedMany came from getEmbeddingModelInstance (the sentinel)
    expect(mockEmbedFn).toHaveBeenCalledWith(expect.objectContaining({ model: sentinelModel }));
    expect(result).toEqual([[0.1, 0.2, 0.3]]);
  });
});
