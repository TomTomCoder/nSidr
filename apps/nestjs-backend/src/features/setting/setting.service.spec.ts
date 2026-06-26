/**
 * Unit tests for SettingService
 * GW-02: modality flags on gateway models catalog
 * GW-02/T-15-04: Ollama /api/tags proxy + SSRF mitigation
 */
import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingService } from './setting.service';

// ---- helpers ----

function makeService(): SettingService {
  // We test pure methods only — DI deps are not needed for these paths
  return Object.create(SettingService.prototype) as SettingService;
}

// ---- GW-02: modality catalog ----

describe('SettingService.getGatewayModels — GW-02 modality flags', () => {
  let service: SettingService;

  beforeEach(() => {
    service = makeService();
    // Bypass in-memory cache
    (service as unknown as { gatewayModelsCache: null }).gatewayModelsCache = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns models carrying type (modality) flags from upstream', async () => {
    // Simulate upstream response with mixed modalities.
    // The raw API uses `type` field (not `model_type`) per gatewayApiModelRawSchema.
    const upstreamData = {
      data: [
        {
          id: 'gpt-4o',
          owned_by: 'openai',
          type: 'language',
          tags: ['vision', 'tool-use'],
          context_window: 128000,
          max_tokens: 16384,
        },
        {
          id: 'text-embedding-3-small',
          owned_by: 'openai',
          type: 'embedding',
          tags: [],
          context_window: 8191,
          max_tokens: null,
        },
        {
          id: 'dall-e-3',
          owned_by: 'openai',
          type: 'image',
          tags: [],
          context_window: null,
          max_tokens: null,
        },
      ],
    };

    // Mock axios.get used inside getGatewayModels
    const axios = await import('axios');
    vi.spyOn(axios.default, 'get').mockResolvedValue({ data: upstreamData });

    const models = await service.getGatewayModels();

    // GW-02: each model carries a `type` (modality) flag
    expect(models.length).toBe(3);
    const types = models.map((m) => m.type);
    expect(types).toContain('language');
    expect(types).toContain('embedding');
    expect(types).toContain('image');
  });

  it('returns stale cache when upstream fetch fails', async () => {
    const staleModel = { id: 'gpt-4o', type: 'language' as const, tags: [] };
    (
      service as unknown as {
        gatewayModelsCache: { data: (typeof staleModel)[]; expiresAt: number };
      }
    ).gatewayModelsCache = {
      data: [staleModel],
      expiresAt: Date.now() - 1000, // already expired
    };

    const axios = await import('axios');
    vi.spyOn(axios.default, 'get').mockRejectedValue(new Error('Network error'));

    const models = await service.getGatewayModels();
    expect(models).toHaveLength(1);
    expect(models[0].id).toBe('gpt-4o');
  });
});

// ---- GW-02 / T-15-04: Ollama /api/tags proxy ----

describe('SettingService.listOllamaModels — Ollama proxy + SSRF (T-15-04)', () => {
  let service: SettingService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = makeService();

    // Patch global.fetch which listOllamaModels uses for server-side fetch
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: 'llama3:latest', modified_at: '2024-01-01T00:00:00Z', size: 4000000000 },
          { name: 'mistral:latest', modified_at: '2024-01-01T00:00:00Z', size: 3000000000 },
        ],
      }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proxies GET {ollamaUrl}/api/tags and returns parsed model names', async () => {
    const result = await service.listOllamaModels('http://localhost:11434');

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:11434/api/tags', expect.any(Object));
    expect(result.models).toHaveLength(2);
    expect(result.models[0].name).toBe('llama3:latest');
    expect(result.models[1].name).toBe('mistral:latest');
  });

  it('defaults to http://localhost:11434 when no URL supplied', async () => {
    await service.listOllamaModels();

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:11434/api/tags', expect.any(Object));
  });

  it('rejects cloud metadata endpoint URL (SSRF T-15-04)', async () => {
    await expect(service.listOllamaModels('http://169.254.169.254')).rejects.toThrow(
      BadRequestException
    );
  });

  it('rejects Kubernetes service account metadata URL (SSRF T-15-04)', async () => {
    await expect(service.listOllamaModels('http://kubernetes.default.svc')).rejects.toThrow(
      BadRequestException
    );
  });

  it('rejects non-http(s) scheme (SSRF T-15-04)', async () => {
    await expect(service.listOllamaModels('file:///etc/passwd')).rejects.toThrow(
      BadRequestException
    );
  });

  it('rejects loopback address other than localhost when it matches metadata pattern', async () => {
    // 169.254.x.x APIPA / link-local is always rejected
    await expect(service.listOllamaModels('http://169.254.100.200')).rejects.toThrow(
      BadRequestException
    );
  });

  it('throws BadRequestException when Ollama API returns non-ok response', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
    } as Response);

    await expect(service.listOllamaModels('http://localhost:11434')).rejects.toThrow(
      BadRequestException
    );
  });

  it('throws BadRequestException when Ollama is unreachable', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(service.listOllamaModels('http://localhost:11434')).rejects.toThrow(
      BadRequestException
    );
  });
});
