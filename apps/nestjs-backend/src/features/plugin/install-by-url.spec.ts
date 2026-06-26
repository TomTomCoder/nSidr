/**
 * Unit tests for PluginService.installByUrl (EXT-02, Phase 19).
 *
 * Fully mocked — no database, no real network. Tests SSRF guard, tool manifest
 * field whitelisting (T-19-02), and consent gate (T-19-03).
 */

import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HttpErrorCode } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import { ClsService } from 'nestjs-cls';
import { SsrfBlockedError, SsrfGuardService } from '../external-connection/ssrf-guard.service';
import { UserService } from '../user/user.service';
import { PluginService } from './plugin.service';

// ─────────────────────────────────────────────────────────────────────────────
// Mock factories
// ─────────────────────────────────────────────────────────────────────────────

function buildMockPrisma() {
  const plugin = {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    delete: vi.fn(),
  };
  const pluginInstall = {
    create: vi.fn(),
  };
  const user = {
    findMany: vi.fn(),
    delete: vi.fn(),
  };

  const prisma: Record<string, unknown> = { plugin, pluginInstall, user };

  const $tx = vi.fn(async (cb: (p: typeof prisma) => Promise<unknown>) => cb(prisma));

  return {
    ...prisma,
    txClient: vi.fn(() => prisma),
    $tx,
    _plugin: plugin,
    _pluginInstall: pluginInstall,
  };
}

function buildMockCls(userId = 'user-123') {
  return { get: vi.fn((key: string) => (key === 'user.id' ? userId : undefined)) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeFetchOk(tools: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ result: { tools } }),
  });
}

const VALID_TOOL = {
  name: 'get_weather',
  description: 'Get weather',
  inputSchema: { type: 'object', properties: {} },
};

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe('PluginService.installByUrl', () => {
  let service: PluginService;
  let mockPrisma: ReturnType<typeof buildMockPrisma>;
  let mockSsrfGuard: { assertHostAllowed: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPrisma = buildMockPrisma();
    mockSsrfGuard = { assertHostAllowed: vi.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ClsService, useValue: buildMockCls() },
        { provide: UserService, useValue: {} },
        { provide: SsrfGuardService, useValue: mockSsrfGuard },
      ],
    }).compile();

    service = module.get<PluginService>(PluginService);
  });

  // ─── Test 1: SSRF guard blocks private-IP URLs ─────────────────────────────

  it('rejects private-IP URL via SSRF guard (T-19-01)', async () => {
    mockSsrfGuard.assertHostAllowed.mockRejectedValueOnce(
      new SsrfBlockedError('169.254.169.254', 'link-local/cloud-metadata address')
    );

    // The service wraps SsrfBlockedError but since it's thrown by assertHostAllowed
    // (before fetch), the error should propagate. SsrfBlockedError is not a
    // CustomHttpException — it re-throws directly from assertHostAllowed.
    await expect(service.installByUrl('space-1', 'http://169.254.169.254/mcp')).rejects.toThrow(
      SsrfBlockedError
    );

    // No DB writes should have occurred
    expect(mockPrisma._plugin.create).not.toHaveBeenCalled();
    expect(mockPrisma._pluginInstall.create).not.toHaveBeenCalled();
  });

  // ─── Test 2: unreachable URL causes VALIDATION_ERROR ──────────────────────

  it('rejects unreachable URL with VALIDATION_ERROR', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    let caughtErr: unknown;
    try {
      await service.installByUrl('space-1', 'http://mcp.example.com/tools');
    } catch (err) {
      caughtErr = err;
    }

    expect(caughtErr).toBeDefined();
    // CustomHttpException stores the code in `.code` property
    expect((caughtErr as { code?: string }).code).toBe(HttpErrorCode.VALIDATION_ERROR);
    expect(mockPrisma._plugin.create).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  // ─── Test 3: valid manifest creates Plugin + PluginInstall ─────────────────

  it('creates Plugin and PluginInstall for valid manifest response', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockImplementationOnce(makeFetchOk([VALID_TOOL]) as unknown as typeof fetch);

    const fakePlugin = { id: 'plugin-abc', name: 'mcp.example.com' };
    mockPrisma._plugin.create.mockResolvedValueOnce(fakePlugin);
    mockPrisma._pluginInstall.create.mockResolvedValueOnce({});

    const result = await service.installByUrl('space-1', 'http://mcp.example.com/tools');

    expect(result).toEqual({ pluginId: 'plugin-abc' });

    // Plugin created with isExtension=true
    expect(mockPrisma._plugin.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isExtension: true,
          mcpUrl: 'http://mcp.example.com/tools',
        }),
      })
    );

    // PluginInstall created with position='extension'
    expect(mockPrisma._pluginInstall.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          position: 'extension',
          positionId: 'space-1',
          baseId: 'space-1',
        }),
      })
    );

    fetchSpy.mockRestore();
  });

  // ─── Test 4: unknown keys are stripped from tool manifest (T-19-02) ────────

  it('whitelists tool fields — drops unknown keys (T-19-02)', async () => {
    const rawToolWithExtraKeys = {
      name: 'safe_tool',
      description: 'A safe tool',
      inputSchema: { type: 'object', properties: {} },
      malicious: 'constructor',
      extraKey: 'should-be-stripped',
      injected: { nested: true },
    };
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockImplementationOnce(makeFetchOk([rawToolWithExtraKeys]) as unknown as typeof fetch);

    mockPrisma._plugin.create.mockResolvedValueOnce({ id: 'plugin-xyz', name: 'mcp.example.com' });
    mockPrisma._pluginInstall.create.mockResolvedValueOnce({});

    await service.installByUrl('space-1', 'http://mcp.example.com/tools');

    const createCall = mockPrisma._plugin.create.mock.calls[0][0];
    const storedManifest = createCall.data.toolManifest as Array<Record<string, unknown>>;

    expect(storedManifest).toHaveLength(1);
    const storedTool = storedManifest[0];

    // Only whitelisted keys present
    expect(storedTool).toHaveProperty('name', 'safe_tool');
    expect(storedTool).toHaveProperty('description', 'A safe tool');
    expect(storedTool).toHaveProperty('inputSchema');

    // Unknown keys stripped
    expect(storedTool).not.toHaveProperty('malicious');
    expect(storedTool).not.toHaveProperty('extraKey');
    expect(storedTool).not.toHaveProperty('injected');

    fetchSpy.mockRestore();
  });

  // ─── Test 5: consentedAt is null after install (T-19-03) ──────────────────

  it('stores consentedAt=null after install (T-19-03)', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockImplementationOnce(makeFetchOk([VALID_TOOL]) as unknown as typeof fetch);

    mockPrisma._plugin.create.mockResolvedValueOnce({ id: 'plugin-c', name: 'mcp.example.com' });
    mockPrisma._pluginInstall.create.mockResolvedValueOnce({});

    await service.installByUrl('space-1', 'http://mcp.example.com/tools');

    const createCall = mockPrisma._plugin.create.mock.calls[0][0];
    expect(createCall.data.consentedAt).toBeNull();

    fetchSpy.mockRestore();
  });
});
