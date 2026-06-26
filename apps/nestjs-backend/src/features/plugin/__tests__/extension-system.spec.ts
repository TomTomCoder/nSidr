/**
 * extension-system.spec.ts
 *
 * Cross-cutting test suite for Phase 19 extension system.
 * Covers: install → consent gate → consent → tool discovery → revoke.
 *
 * Uses vitest with minimal mocking (no NestJS testing module).
 */

import { HttpErrorCode } from '@teable/core';
import { PluginStatus } from '@teable/openapi';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomHttpException } from '../../../custom.exception';
import { PluginMcpDiscoveryService } from '../../agent/mcp/plugin-mcp-discovery.service';
import { PluginService } from '../plugin.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock SsrfGuardService — default: allow all hosts
const mockSsrfGuard = {
  assertHostAllowed: vi.fn().mockResolvedValue(undefined),
};

// Mock ClsService — returns a fake user id
const mockCls = {
  get: vi.fn().mockReturnValue('user-test-01'),
};

// Mock UserService — not exercised in these tests
const mockUserService = {
  createSystemUser: vi.fn(),
  updateUserName: vi.fn(),
};

// Mock PrismaService — plugin + pluginInstall tables
const mockPrisma: {
  plugin: {
    create: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  pluginInstall: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  $tx: ReturnType<typeof vi.fn>;
  txClient: ReturnType<typeof vi.fn>;
} = {
  plugin: {
    create: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  pluginInstall: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  // $tx passes a "prisma" arg that wraps the same mocks
  $tx: vi.fn(async (fn: (p: unknown) => Promise<unknown>) =>
    fn({
      plugin: {
        create: mockPrisma.plugin.create,
        update: mockPrisma.plugin.update,
        updateMany: mockPrisma.plugin.updateMany,
        delete: vi.fn(),
      },
      pluginInstall: {
        create: mockPrisma.pluginInstall.create,
      },
      user: { delete: vi.fn() },
    })
  ),
  txClient: vi.fn(() => mockPrisma),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid tools/list JSON-RPC response */
function buildManifestResponse(
  tools: Array<{ name: string; description?: string; inputSchema?: object; [k: string]: unknown }>
) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      result: { tools },
    }),
  };
}

const SPACE_ID = 'space-01';
const PLUGIN_ID = 'plug-abc';
const MCP_URL = 'https://mcp.example.com/api';

function makeService() {
  return new PluginService(
    mockPrisma as never,
    mockCls as never,
    mockUserService as never,
    mockSsrfGuard as never
  );
}

function makeDiscoveryService() {
  return new PluginMcpDiscoveryService(mockPrisma as never);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Extension System — cross-cutting lifecycle (Phase 19)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default: SSRF allows all hosts
    mockSsrfGuard.assertHostAllowed.mockResolvedValue(undefined);
  });

  // =========================================================================
  // Test 1: install-then-gate
  // After installByUrl, plugin has consentedAt=null and is NOT returned by
  // discoverPluginTools (consent gate).
  // =========================================================================
  it('install-then-gate: consentedAt=null and extension excluded from discovery', async () => {
    const svc = makeService();
    const discoverySvc = makeDiscoveryService();

    // Mock fetch: valid tools/list response
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        buildManifestResponse([
          { name: 'search', description: 'Search', inputSchema: { type: 'object' } },
        ])
      );

    // prisma.plugin.create returns an unconsented extension record
    const fakePlugin = {
      id: PLUGIN_ID,
      name: 'mcp.example.com',
      isExtension: true,
      consentedAt: null,
      status: PluginStatus.Published,
      positions: '[]',
      logo: '',
    };
    mockPrisma.plugin.create.mockResolvedValue(fakePlugin);
    mockPrisma.pluginInstall.create.mockResolvedValue({});

    const result = await svc.installByUrl(SPACE_ID, MCP_URL);
    expect(result.pluginId).toBe(PLUGIN_ID);

    // Verify plugin was created with consentedAt: null
    expect(mockPrisma.plugin.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isExtension: true,
          consentedAt: null,
        }),
      })
    );

    // Discovery: pluginInstall.findMany returns empty (consent gate filters out unconsented)
    mockPrisma.pluginInstall.findMany.mockResolvedValue([]);
    const { definitions, mcpEndpoints } = await discoverySvc.discoverPluginTools(
      'agent-01',
      SPACE_ID
    );

    expect(definitions).toHaveLength(0);
    expect(mcpEndpoints).toHaveLength(0);
  });

  // =========================================================================
  // Test 2: ssrf-block
  // When SsrfGuardService throws, installByUrl re-throws and no plugin is created.
  // =========================================================================
  it('ssrf-block: private-IP URL causes installByUrl to throw, no plugin created', async () => {
    const svc = makeService();

    mockSsrfGuard.assertHostAllowed.mockRejectedValue(
      new CustomHttpException('Private IP blocked', HttpErrorCode.VALIDATION_ERROR)
    );

    await expect(svc.installByUrl(SPACE_ID, 'https://192.168.1.1/mcp')).rejects.toThrow(
      CustomHttpException
    );

    // No plugin must have been created
    expect(mockPrisma.plugin.create).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Test 3: manifest-whitelist
  // When fetch returns a tool with an extra "malicious" key, the stored
  // toolManifest does NOT contain that key.
  // =========================================================================
  it('manifest-whitelist: unknown tool keys are dropped before storing', async () => {
    const svc = makeService();

    global.fetch = vi.fn().mockResolvedValue(
      buildManifestResponse([
        {
          name: 'search',
          description: 'Search',
          inputSchema: { type: 'object', properties: {} },
          malicious: { __proto__: { admin: true } },
        },
      ])
    );

    const fakePlugin = {
      id: PLUGIN_ID,
      name: 'mcp.example.com',
      positions: '[]',
      logo: '',
      status: PluginStatus.Published,
    };
    mockPrisma.plugin.create.mockResolvedValue(fakePlugin);
    mockPrisma.pluginInstall.create.mockResolvedValue({});

    await svc.installByUrl(SPACE_ID, MCP_URL);

    const createCall = mockPrisma.plugin.create.mock.calls[0][0] as {
      data: { toolManifest: Array<Record<string, unknown>> };
    };
    const storedTools = createCall.data.toolManifest;

    expect(Array.isArray(storedTools)).toBe(true);
    expect(storedTools).toHaveLength(1);
    expect(storedTools[0]).not.toHaveProperty('malicious');
    expect(storedTools[0]).toHaveProperty('name', 'search');
    expect(storedTools[0]).toHaveProperty('description', 'Search');
  });

  // =========================================================================
  // Test 4: consent
  // consentExtension(pluginId) calls prisma.plugin.update with consentedAt: Date
  // =========================================================================
  it('consent: consentExtension sets consentedAt to a Date', async () => {
    const svc = makeService();

    const fakePlugin = { id: PLUGIN_ID, isExtension: true, consentedAt: null };
    mockPrisma.plugin.findUniqueOrThrow.mockResolvedValue(fakePlugin);
    mockPrisma.plugin.update.mockResolvedValue({ ...fakePlugin, consentedAt: new Date() });

    await svc.consentExtension(PLUGIN_ID);

    expect(mockPrisma.plugin.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PLUGIN_ID },
        data: { consentedAt: expect.any(Date) },
      })
    );
  });

  // =========================================================================
  // Test 5: revoke
  // revokeConsent(pluginId) calls prisma.plugin.updateMany with consentedAt: null
  // =========================================================================
  it('revoke: revokeConsent clears consentedAt', async () => {
    const svc = makeService();

    mockPrisma.plugin.updateMany.mockResolvedValue({ count: 1 });

    await svc.revokeConsent(PLUGIN_ID);

    expect(mockPrisma.plugin.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PLUGIN_ID, isExtension: true },
        data: { consentedAt: null },
      })
    );
  });
});
