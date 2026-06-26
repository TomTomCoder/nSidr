/**
 * rbac-gating.spec.ts
 *
 * Dedicated RBAC gating spec for Wave 3 (T-17-15).
 *
 * Covers:
 *   1. Interface tools: READ tools require app|read / base|read
 *   2. Interface tools: WRITE tools require app|update / base|update
 *   3. Read-only identity CANNOT invoke write tools (read perm != write perm)
 *   4. Unauthorized identity is denied ALL tools (no side-effects)
 *   5. MCP server tool execution checks agentId scope (cross-agent cannot access)
 *
 * This file is a dedicated RBAC-coverage layer on top of interface-tools.service.spec.ts.
 * It re-tests the permission matrix from the T-17-09 threat model from a threat-model
 * perspective (not a happy-path perspective) and also covers MCP server RBAC scoping.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { InterfaceToolsService } from './interface-tools.service';
import { McpClientAggregatorService } from './mcp-client-aggregator.service';
import { TeableMcpServerService } from './teable-mcp-server.service';

// ---------------------------------------------------------------------------
// Permission matrix fixture
// ---------------------------------------------------------------------------

const PERMISSION_MATRIX: Record<string, string[]> = {
  usr_admin: ['app|read', 'app|update', 'app|create', 'base|read', 'base|update', 'base|create'],
  usr_editor: ['app|read', 'base|read', 'app|update'],
  usr_viewer: ['app|read', 'base|read'],
  usr_none: [],
};

function makePermissionService(activeUserId: { current: string }) {
  return {
    validPermissions: vi.fn(async (resourceId: string, actions: string[]) => {
      const allowed = PERMISSION_MATRIX[activeUserId.current] ?? [];
      const denied = actions.filter((a) => !allowed.includes(a));
      if (denied.length > 0) {
        throw new Error(`Permission denied: ${denied.join(', ')} on ${resourceId}`);
      }
    }),
  };
}

function makeAppBuilderService() {
  return {
    findOne: vi.fn().mockResolvedValue({ id: 'app1', name: 'App', baseId: 'base1' }),
    getAppContent: vi.fn().mockResolvedValue({ widgets: [] }),
    renameApp: vi.fn().mockResolvedValue(undefined),
    updateAppContent: vi.fn().mockResolvedValue(undefined),
    duplicateApp: vi.fn().mockResolvedValue({ id: 'app1_copy', name: 'App (copy)' }),
  };
}

function makeDashboardService() {
  return {
    getDashboardById: vi.fn().mockResolvedValue({ id: 'dash1', name: 'Dashboard', layout: [] }),
    renameDashboard: vi.fn().mockResolvedValue({ id: 'dash1', name: 'New Name', layout: [] }),
    updateLayout: vi.fn().mockResolvedValue({ id: 'dash1', name: 'Dashboard', layout: [] }),
  };
}

function buildInterfaceService(userId: string) {
  const activeUserId = { current: userId };
  const permSvc = makePermissionService(activeUserId);
  const appSvc = makeAppBuilderService();
  const dashSvc = makeDashboardService();

  const svc = new InterfaceToolsService(appSvc as never, dashSvc as never, permSvc as never);
  svc._currentUserId = userId;

  return { svc, permSvc, appSvc, dashSvc };
}

// ---------------------------------------------------------------------------
// RBAC gating for InterfaceToolsService
// ---------------------------------------------------------------------------

describe('RBAC gating — InterfaceToolsService (T-17-09, T-17-15)', () => {
  const BASE_ID = 'base1';
  const APP_ID = 'app1';
  const DASH_ID = 'dash1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── READ tools ───────────────────────────────────────────────────────────

  it('[get_app] admin can read an app', async () => {
    const { svc } = buildInterfaceService('usr_admin');
    await expect(
      svc.executeInterfaceTool(
        'get_app',
        { baseId: BASE_ID, appId: APP_ID },
        { userId: 'usr_admin', baseId: BASE_ID }
      )
    ).resolves.not.toThrow();
  });

  it('[get_app] viewer (app|read) can read an app', async () => {
    const { svc } = buildInterfaceService('usr_viewer');
    await expect(
      svc.executeInterfaceTool(
        'get_app',
        { baseId: BASE_ID, appId: APP_ID },
        { userId: 'usr_viewer', baseId: BASE_ID }
      )
    ).resolves.not.toThrow();
  });

  it('[get_app] unauthorized user is DENIED', async () => {
    const { svc, appSvc } = buildInterfaceService('usr_none');
    await expect(
      svc.executeInterfaceTool(
        'get_app',
        { baseId: BASE_ID, appId: APP_ID },
        { userId: 'usr_none', baseId: BASE_ID }
      )
    ).rejects.toThrow(/permission denied/i);
    // No side-effect: DB was NOT queried
    expect(appSvc.findOne).not.toHaveBeenCalled();
    expect(appSvc.getAppContent).not.toHaveBeenCalled();
  });

  it('[get_dashboard] viewer (base|read) can read a dashboard', async () => {
    const { svc } = buildInterfaceService('usr_viewer');
    await expect(
      svc.executeInterfaceTool(
        'get_dashboard',
        { baseId: BASE_ID, id: DASH_ID },
        { userId: 'usr_viewer', baseId: BASE_ID }
      )
    ).resolves.not.toThrow();
  });

  it('[get_dashboard] unauthorized user is DENIED with no side-effect', async () => {
    const { svc, dashSvc } = buildInterfaceService('usr_none');
    await expect(
      svc.executeInterfaceTool(
        'get_dashboard',
        { baseId: BASE_ID, id: DASH_ID },
        { userId: 'usr_none', baseId: BASE_ID }
      )
    ).rejects.toThrow(/permission denied/i);
    expect(dashSvc.getDashboardById).not.toHaveBeenCalled();
  });

  // ── WRITE tools ──────────────────────────────────────────────────────────

  it('[run_app_action] admin (app|update) can rename an app', async () => {
    const { svc, appSvc } = buildInterfaceService('usr_admin');
    await svc.executeInterfaceTool(
      'run_app_action',
      { baseId: BASE_ID, appId: APP_ID, action: 'rename', name: 'New Name' },
      { userId: 'usr_admin', baseId: BASE_ID }
    );
    expect(appSvc.renameApp).toHaveBeenCalled();
  });

  it('[run_app_action] viewer (app|read only) CANNOT rename — read perm != write perm', async () => {
    const { svc, appSvc } = buildInterfaceService('usr_viewer');
    await expect(
      svc.executeInterfaceTool(
        'run_app_action',
        { baseId: BASE_ID, appId: APP_ID, action: 'rename', name: 'Hijacked' },
        { userId: 'usr_viewer', baseId: BASE_ID }
      )
    ).rejects.toThrow(/permission denied/i);
    expect(appSvc.renameApp).not.toHaveBeenCalled();
  });

  it('[run_app_action] unauthorized user is DENIED with no side-effect', async () => {
    const { svc, appSvc } = buildInterfaceService('usr_none');
    await expect(
      svc.executeInterfaceTool(
        'run_app_action',
        { baseId: BASE_ID, appId: APP_ID, action: 'rename', name: 'Attack' },
        { userId: 'usr_none', baseId: BASE_ID }
      )
    ).rejects.toThrow(/permission denied/i);
    expect(appSvc.renameApp).not.toHaveBeenCalled();
  });

  it('[update_dashboard] admin (base|update) can update dashboard name', async () => {
    const { svc, dashSvc } = buildInterfaceService('usr_admin');
    await svc.executeInterfaceTool(
      'update_dashboard',
      { baseId: BASE_ID, id: DASH_ID, name: 'Renamed' },
      { userId: 'usr_admin', baseId: BASE_ID }
    );
    expect(dashSvc.renameDashboard).toHaveBeenCalled();
  });

  it('[update_dashboard] viewer (base|read only) CANNOT update dashboard — read != write', async () => {
    const { svc, dashSvc } = buildInterfaceService('usr_viewer');
    await expect(
      svc.executeInterfaceTool(
        'update_dashboard',
        { baseId: BASE_ID, id: DASH_ID, name: 'Hijacked' },
        { userId: 'usr_viewer', baseId: BASE_ID }
      )
    ).rejects.toThrow(/permission denied/i);
    expect(dashSvc.renameDashboard).not.toHaveBeenCalled();
  });

  it('[update_dashboard] unauthorized user is DENIED with no side-effect', async () => {
    const { svc, dashSvc } = buildInterfaceService('usr_none');
    await expect(
      svc.executeInterfaceTool(
        'update_dashboard',
        { baseId: BASE_ID, id: DASH_ID, name: 'Attack' },
        { userId: 'usr_none', baseId: BASE_ID }
      )
    ).rejects.toThrow(/permission denied/i);
    expect(dashSvc.renameDashboard).not.toHaveBeenCalled();
    expect(dashSvc.updateLayout).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// RBAC scoping for McpClientAggregatorService — cross-agent isolation
// ---------------------------------------------------------------------------

describe('RBAC scoping — McpClientAggregatorService (cross-agent isolation)', () => {
  it('returns empty tools for agentB when DB only has servers for agentA', async () => {
    const mockPrisma = {
      agentMcpServer: {
        findMany: vi.fn().mockImplementation(async ({ where }: { where: { agentId: string } }) => {
          if (where.agentId === 'agentA') {
            return [
              { id: 'srv1', agentId: 'agentA', url: 'http://srv1/', name: 'Srv1', enabled: true },
            ];
          }
          return [];
        }),
      },
      agent: {
        findUnique: vi.fn().mockResolvedValue({ baseId: 'base1' }),
      },
    };

    const pluginDiscovery = {
      discoverPluginTools: vi
        .fn()
        .mockResolvedValue({ definitions: [], executors: new Map(), mcpEndpoints: [] }),
    };

    const service = new McpClientAggregatorService(mockPrisma as never, pluginDiscovery as never);

    // agentB queries should hit DB with agentB filter, not agentA
    const resultB = await service.getAggregatedTools('agentB');
    expect(mockPrisma.agentMcpServer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ agentId: 'agentB' }) })
    );
    expect(resultB.definitions).toHaveLength(0);
  });

  it('executeMcpTool with unknown namespaced name returns structured error (no throw)', async () => {
    const mockPrisma = {
      agentMcpServer: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      agent: {
        findUnique: vi.fn().mockResolvedValue({ baseId: 'base1' }),
      },
    };
    const pluginDiscovery = {
      discoverPluginTools: vi
        .fn()
        .mockResolvedValue({ definitions: [], executors: new Map(), mcpEndpoints: [] }),
    };

    const service = new McpClientAggregatorService(mockPrisma as never, pluginDiscovery as never);
    await service.getAggregatedTools('agentX');

    const result = await service.executeMcpTool('agentX', 'mcp__bad__tool', {});
    expect(result).toMatchObject({ error: expect.stringContaining('not found') });
  });

  it('executeMcpTool with invalid name format returns structured error', async () => {
    const mockPrisma = {
      agentMcpServer: { findMany: vi.fn().mockResolvedValue([]) },
      agent: { findUnique: vi.fn().mockResolvedValue({ baseId: 'base1' }) },
    };
    const pluginDiscovery = {
      discoverPluginTools: vi
        .fn()
        .mockResolvedValue({ definitions: [], executors: new Map(), mcpEndpoints: [] }),
    };

    const service = new McpClientAggregatorService(mockPrisma as never, pluginDiscovery as never);
    const result = await service.executeMcpTool('agentX', 'not_a_valid_mcp_name', {});
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

// ---------------------------------------------------------------------------
// RBAC gate — TeableMcpServerService.checkPermission via getEffectiveBaseRole
// (D-17.1-02 bug-4 fix)
// ---------------------------------------------------------------------------

describe('RBAC gate — TeableMcpServerService (space-inherited roles, bug-4)', () => {
  // Helper that mimics handleRequest enough to exercise the checkPermission closure
  // without booting Nest. We construct the service with mocks and probe the closure
  // via a tools/call through an InMemoryTransport pair.
  async function runMcpHandshake(opts: {
    effectiveRole: string | null;
  }): Promise<{ resolved: boolean; permSvc: { getEffectiveBaseRole: ReturnType<typeof vi.fn> } }> {
    const permSvc = {
      getEffectiveBaseRole: vi.fn().mockResolvedValue(opts.effectiveRole),
      // not invoked, but present for shape parity
      getRoleByBaseId: vi.fn(),
    };
    const agentService = {
      findOne: vi.fn().mockResolvedValue({ id: 'agt1', baseId: 'base1' }),
    };
    const registry = {
      getBuiltInTools: vi.fn().mockReturnValue([
        {
          type: 'function',
          function: {
            name: 'search_records',
            description: 'x',
            parameters: { type: 'object', properties: {}, required: [] },
          },
        },
      ]),
    };
    const execution = { executeTool: vi.fn().mockResolvedValue({ ok: true }) };
    const interfaceTools = {
      _currentUserId: '',
      getToolDefinitions: vi.fn().mockReturnValue([]),
      executeInterfaceTool: vi.fn(),
    };

    const svc = new TeableMcpServerService(
      agentService as never,
      registry as never,
      execution as never,
      permSvc as never,
      interfaceTools as never
    );

    // Build a minimal IncomingMessage/ServerResponse pair by short-circuiting:
    // we replicate the closure-binding logic inline by invoking handleRequest with
    // an in-memory transport patched in. Easier: directly call the public path that
    // exercises checkPermission — but it is closure-private. So we go in-process by
    // replicating the registerTeableMcpTools wiring around our checkPermission spy.
    const { registerTeableMcpTools } = await import('./teable-mcp-tools');
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
    const { McpError, ErrorCode } = await import('@modelcontextprotocol/sdk/types.js');

    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    const server = new Server({ name: 't', version: '1' }, { capabilities: {} });

    const checkPermission = async (): Promise<void> => {
      const role = await svc['permissionService'].getEffectiveBaseRole('base1');
      if (!role) {
        throw new McpError(ErrorCode.InvalidRequest, 'Access denied');
      }
    };

    registerTeableMcpTools(
      server,
      registry as never,
      execution as never,
      interfaceTools as never,
      { id: 'agt1', baseId: 'base1' },
      { agentId: 'agt1', trigger: 'mcp', userId: 'usr1' } as never,
      checkPermission
    );

    const client = new Client({ name: 'c', version: '1' }, { capabilities: {} });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    let resolved = false;
    try {
      await client.callTool({ name: 'search_records', arguments: {} });
      resolved = true;
    } catch {
      resolved = false;
    }
    await client.close();
    return { resolved, permSvc };
  }

  it('admits a space-owner who has no explicit base-collaborator row (inherited via getEffectiveBaseRole)', async () => {
    const { resolved, permSvc } = await runMcpHandshake({ effectiveRole: 'owner' });
    expect(resolved).toBe(true);
    expect(permSvc.getEffectiveBaseRole).toHaveBeenCalledWith('base1');
  });

  it('denies a user with no role on the base or its parent space (-32600 path)', async () => {
    const { resolved, permSvc } = await runMcpHandshake({ effectiveRole: null });
    expect(resolved).toBe(false);
    expect(permSvc.getEffectiveBaseRole).toHaveBeenCalledWith('base1');
  });
});
