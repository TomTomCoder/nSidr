import { LLMProviderType } from '@teable/openapi';
import { generateImage as aiGenerateImage } from 'ai';
import axios from 'axios';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingOpenApiService } from './setting-open-api.service';

vi.mock('ai', () => ({
  generateImage: vi.fn(),
  generateText: vi.fn(),
  tool: vi.fn((config) => config),
}));

const providerName = 'custom-openai';
const apiKey = 'sk-test';
const openAIBaseUrl = 'https://api.openai.com/v1';
const gptImage2Model = 'gpt-image-2';
const gptImage2ModelKey = `${LLMProviderType.OPENAI}@${gptImage2Model}@${providerName}`;
const testImageBuffer = Buffer.from([1, 2, 3]);

// Sentinel image model object returned by getModelInstance(key, providers, true)
const mockImageModelInstance = { specificationVersion: 'v2', provider: 'mock', modelId: 'mock' };
// Sentinel text model object returned by getModelInstance(key, providers)
const mockTextModelInstance = { specificationVersion: 'v2', provider: 'mock', modelId: 'text' };
// Sentinel gateway model object returned by getAdHocGatewayModelInstance
const mockGatewayModelInstance = {
  specificationVersion: 'v2',
  provider: 'gateway',
  modelId: 'gw-model',
};

describe('SettingOpenApiService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BUILD_VERSION;
    delete process.env.NEXT_PUBLIC_BUILD_VERSION;
    delete process.env.APP_VERSION;
    vi.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createService = () =>
    new SettingOpenApiService(
      undefined as never,
      undefined as never,
      { provider: 'local' } as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never
    );

  it('sends runtime build version to public access checker', async () => {
    process.env.BUILD_VERSION = '20260429.1';
    process.env.NEXT_PUBLIC_BUILD_VERSION = 'legacy-build';
    const getSpy = vi.spyOn(axios, 'get').mockResolvedValue({
      data: {
        success: true,
        statusCode: 200,
        latencyMs: 10,
        checkedFrom: 'test',
      },
    });

    await (
      createService() as unknown as {
        checkUrlAccessible: (
          url: string,
          setting: { instanceId?: string; createdTime?: string }
        ) => Promise<unknown>;
      }
    ).checkUrlAccessible('https://teable.ai/health', {
      instanceId: 'ins_123',
      createdTime: '2026-04-29T00:00:00.000Z',
    });

    expect(getSpy).toHaveBeenCalledWith(
      'https://access-checker.teable.ai/check',
      expect.objectContaining({
        params: {
          url: 'https://teable.ai/health',
          instanceId: 'ins_123',
          version: '20260429.1',
          deployedAt: '2026-04-29T00:00:00.000Z',
        },
      })
    );
  });
});

describe('SettingOpenApiService.testLLM image generation', () => {
  const service = Object.create(SettingOpenApiService.prototype) as SettingOpenApiService;
  let getTestFileBufferMock: ReturnType<typeof vi.fn>;
  let getModelInstanceMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    getTestFileBufferMock = vi.fn().mockResolvedValue(testImageBuffer);
    (
      service as unknown as {
        getTestFileBuffer: typeof getTestFileBufferMock;
      }
    ).getTestFileBuffer = getTestFileBufferMock;

    // Mock aiService on the prototype instance
    getModelInstanceMock = vi
      .fn()
      .mockImplementation(async (_key: string, _providers: unknown, isImage?: boolean) =>
        isImage ? mockImageModelInstance : mockTextModelInstance
      );
    (
      service as unknown as {
        aiService: {
          getModelInstance: typeof getModelInstanceMock;
          getAdHocGatewayModelInstance: ReturnType<typeof vi.fn>;
        };
      }
    ).aiService = {
      getModelInstance: getModelInstanceMock,
      getAdHocGatewayModelInstance: vi.fn().mockReturnValue(mockGatewayModelInstance),
    };

    vi.mocked(aiGenerateImage).mockResolvedValue({
      image: { mediaType: 'image/png', uint8Array: new Uint8Array([1]) },
      images: [{ mediaType: 'image/png', uint8Array: new Uint8Array([1]) }],
      warnings: [],
      responses: [],
      providerMetadata: {},
      usage: {
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
      },
    } as never);
  });

  it('uses the catalog default size when testing GPT image text-to-image generation', async () => {
    const result = await service.testLLM({
      type: LLMProviderType.OPENAI,
      name: providerName,
      apiKey,
      baseUrl: openAIBaseUrl,
      models: gptImage2Model,
      modelKey: gptImage2ModelKey,
      testImageGeneration: true,
    });

    expect(result.success).toBe(true);
    expect(aiGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'A simple test: draw a small red circle',
        n: 1,
        size: '1024x1024',
      })
    );
    // Image path routes through gateway with isImageGeneration=true
    expect(getModelInstanceMock).toHaveBeenCalledWith(gptImage2ModelKey, expect.any(Array), true);
  });

  it('infers image generation testing from catalog when testImageGeneration is omitted', async () => {
    const result = await service.testLLM({
      type: LLMProviderType.OPENAI,
      name: providerName,
      apiKey,
      baseUrl: openAIBaseUrl,
      models: gptImage2Model,
      modelKey: gptImage2ModelKey,
    });

    expect(result.success).toBe(true);
    expect(aiGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'A simple test: draw a small red circle',
        n: 1,
        size: '1024x1024',
      })
    );
    // Catalog-inferred image generation also routes through gateway
    expect(getModelInstanceMock).toHaveBeenCalledWith(gptImage2ModelKey, expect.any(Array), true);
  });

  it('uses prompt images when testing GPT image image-to-image generation', async () => {
    const result = await service.testLLM({
      type: LLMProviderType.OPENAI,
      name: providerName,
      apiKey,
      baseUrl: openAIBaseUrl,
      models: gptImage2Model,
      modelKey: gptImage2ModelKey,
      testImageGeneration: true,
      testImageToImage: true,
    });

    expect(result.success).toBe(true);
    expect(aiGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: {
          text: 'Create a very simple variation of this image.',
          images: [testImageBuffer],
        },
        n: 1,
        size: '1024x1024',
      })
    );
    expect(getTestFileBufferMock).toHaveBeenCalledWith('static/test/test-image.png');
    expect(vi.mocked(aiGenerateImage).mock.calls[0][0]).not.toHaveProperty(
      'providerOptions.openai.image'
    );
  });
});

describe('SettingOpenApiService gateway routing', () => {
  const service = Object.create(SettingOpenApiService.prototype) as SettingOpenApiService;
  let getModelInstanceMock: ReturnType<typeof vi.fn>;
  let getAdHocGatewayModelInstanceMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    getModelInstanceMock = vi
      .fn()
      .mockImplementation(async (_key: string, _providers: unknown, isImage?: boolean) =>
        isImage ? mockImageModelInstance : mockTextModelInstance
      );
    getAdHocGatewayModelInstanceMock = vi.fn().mockReturnValue(mockGatewayModelInstance);

    (
      service as unknown as {
        aiService: {
          getModelInstance: typeof getModelInstanceMock;
          getAdHocGatewayModelInstance: typeof getAdHocGatewayModelInstanceMock;
        };
      }
    ).aiService = {
      getModelInstance: getModelInstanceMock,
      getAdHocGatewayModelInstance: getAdHocGatewayModelInstanceMock,
    };

    // Mock generateText for text-gen routing tests
    vi.mocked(vi.fn()).mockResolvedValue({ text: 'Connection successful!' });
  });

  it('text-gen path calls getModelInstance with isImageGeneration falsy', async () => {
    // Arrange: mock generateText to succeed
    const { generateText: gt } = await import('ai');
    vi.mocked(gt as ReturnType<typeof vi.fn>).mockResolvedValue({ text: 'ok' } as never);

    (
      service as unknown as {
        testChatModelAbility: ReturnType<typeof vi.fn>;
        logger: { error: ReturnType<typeof vi.fn>; log: ReturnType<typeof vi.fn> };
      }
    ).testChatModelAbility = vi.fn().mockResolvedValue({});
    (
      service as unknown as {
        logger: { error: ReturnType<typeof vi.fn>; log: ReturnType<typeof vi.fn> };
      }
    ).logger = { error: vi.fn(), log: vi.fn() } as never;

    await service.testLLM({
      type: LLMProviderType.OPENAI,
      name: 'my-provider',
      apiKey: 'sk-text',
      baseUrl: 'https://api.openai.com/v1',
      models: 'gpt-4o',
      modelKey: `${LLMProviderType.OPENAI}@gpt-4o@my-provider`,
    });

    // Text-gen path: isImageGeneration arg is absent (falsy)
    expect(getModelInstanceMock).toHaveBeenCalledWith(
      `${LLMProviderType.OPENAI}@gpt-4o@my-provider`,
      expect.any(Array)
    );
    const callArgs = getModelInstanceMock.mock.calls[0];
    expect(callArgs[2]).toBeFalsy();
  });

  it('image-gen path calls getModelInstance with isImageGeneration=true', async () => {
    vi.mocked(aiGenerateImage).mockResolvedValue({
      image: { mediaType: 'image/png', uint8Array: new Uint8Array([1]) },
      images: [],
      warnings: [],
      responses: [],
      providerMetadata: {},
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    } as never);

    (
      service as unknown as {
        getTestFileBuffer: ReturnType<typeof vi.fn>;
        logger: { error: ReturnType<typeof vi.fn>; log: ReturnType<typeof vi.fn> };
      }
    ).getTestFileBuffer = vi.fn().mockResolvedValue(testImageBuffer);
    (
      service as unknown as {
        logger: { error: ReturnType<typeof vi.fn>; log: ReturnType<typeof vi.fn> };
      }
    ).logger = { error: vi.fn(), log: vi.fn() } as never;

    await service.testLLM({
      type: LLMProviderType.OPENAI,
      name: providerName,
      apiKey: 'sk-img',
      baseUrl: openAIBaseUrl,
      models: gptImage2Model,
      modelKey: gptImage2ModelKey,
      testImageGeneration: true,
    });

    // Image-gen path: isImageGeneration=true
    expect(getModelInstanceMock).toHaveBeenCalledWith(gptImage2ModelKey, expect.any(Array), true);
  });
});
