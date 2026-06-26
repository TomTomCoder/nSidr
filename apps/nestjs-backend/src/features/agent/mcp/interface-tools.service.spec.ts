/**
 * interface-tools.service.spec.ts
 *
 * TDD spec for InterfaceToolsService (17-04 Wave 2 RED gate).
 *
 * Behaviors under test:
 *   1. Unauthorized identity → get_app read is REJECTED (no side-effect)
 *   2. Unauthorized identity → run_app_action write is REJECTED (no side-effect)
 *   3. Authorized read → get_app returns app meta + content
 *   4. Authorized read → get_dashboard returns dashboard data
 *   5. Authorized write → run_app_action delegates to AppBuilderService (rename)
 *   6. Authorized write → update_dashboard delegates to DashboardService
 *   7. Read-only identity → run_app_action write is REJECTED (read perm ≠ write perm)
 *   8. Unknown tool name → throws clear error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InterfaceToolsService as IInterfaceToolsService } from './interface-tools.service';

// Dynamic import so RED phase compiles regardless of missing file
const { InterfaceToolsService } = await import('./interface-tools.service').catch(() => ({
  InterfaceToolsService: undefined as unknown as typeof IInterfaceToolsService,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_ID = 'bse_test123';
const APP_ID = 'app_test456';
const DASH_ID = 'dsh_test789';

const authorizedIdentity = { userId: 'usr_authorized', baseId: BASE_ID };
const unauthorizedIdentity = { userId: 'usr_unauth', baseId: BASE_ID };
const readOnlyIdentity = { userId: 'usr_readonly', baseId: BASE_ID };

const mockApp = { id: APP_ID, name: 'My App', baseId: BASE_ID };
const mockAppContent = { widgets: [], layout: [] };
const mockDashboard = {
  id: DASH_ID,
  name: 'My Dashboard',
  layout: [{ i: 'p1', x: 0, y: 0, w: 6, h: 4 }],
  pluginMap: {},
};

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makePermissionServiceStub(opts: {
  authorizedActions: Record<string, string[]>; // userId → allowed actions
}) {
  return {
    validPermissions: vi.fn(async (resourceId: string, actions: string[], _token?: string) => {
      // We key by the active userId — injected via the stub's .userId property
      const userId = (makePermissionServiceStub as { _activeUserId?: string })._activeUserId ?? '';
      const allowed = opts.authorizedActions[userId] ?? [];
      const denied = actions.filter((a) => !allowed.includes(a));
      if (denied.length > 0) {
        throw new Error(`Permission denied: ${denied.join(', ')} on ${resourceId}`);
      }
      return allowed;
    }),
  };
}

function makeAppBuilderServiceStub() {
  return {
    findOne: vi.fn(async (_baseId: string, _appId: string) => mockApp),
    getAppContent: vi.fn(async (_baseId: string, _appId: string) => mockAppContent),
    renameApp: vi.fn(async (_baseId: string, _appId: string, _name: string) => undefined),
    updateAppContent: vi.fn(
      async (_baseId: string, _appId: string, _content: unknown) => undefined
    ),
    duplicateApp: vi.fn(async (_baseId: string, _appId: string) => ({
      ...mockApp,
      id: 'app_copy',
      name: 'My App (copy)',
    })),
  };
}

function makeDashboardServiceStub() {
  return {
    getDashboardById: vi.fn(async (_baseId: string, _id: string) => mockDashboard),
    renameDashboard: vi.fn(async (_baseId: string, _id: string, _name: string) => ({
      ...mockDashboard,
      name: _name,
    })),
    updateLayout: vi.fn(async (_baseId: string, _id: string, _layout: unknown[]) => ({
      ...mockDashboard,
      layout: _layout,
    })),
  };
}

// ---------------------------------------------------------------------------
// Helper: build service with a given identity as "current user"
// ---------------------------------------------------------------------------

function buildService(opts: {
  identity: { userId: string; baseId: string };
  permissionServiceOverride?: ReturnType<typeof makePermissionServiceStub>;
}) {
  // Per-user allowed actions:
  //   authorized: can read + write apps and bases
  //   readOnly: can read only
  //   unauthorized: nothing
  const permStub =
    opts.permissionServiceOverride ??
    makePermissionServiceStub({
      authorizedActions: {
        usr_authorized: ['app|read', 'app|update', 'base|read', 'base|update'],
        usr_readonly: ['app|read', 'base|read'],
        usr_unauth: [],
      },
    });

  // Track active userId so the stub can resolve permissions
  (makePermissionServiceStub as { _activeUserId?: string })._activeUserId = opts.identity.userId;

  // Capture stub refs so tests can assert calls
  const appBuilderStub = makeAppBuilderServiceStub();
  const dashboardStub = makeDashboardServiceStub();

  if (!InterfaceToolsService) {
    throw new Error('InterfaceToolsService not yet implemented (expected during RED phase)');
  }

  const svc = new InterfaceToolsService(
    appBuilderStub as never,
    dashboardStub as never,
    permStub as never
  );

  // Inject the active userId so the service can forward it to PermissionService
  (svc as { _currentUserId: string })._currentUserId = opts.identity.userId;

  return { svc, appBuilderStub, dashboardStub, permStub };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InterfaceToolsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Unauthorized read is REJECTED ────────────────────────────────────
  it('should reject get_app for an unauthorized identity', async () => {
    const { svc } = buildService({ identity: unauthorizedIdentity });

    await expect(
      svc.executeInterfaceTool('get_app', { baseId: BASE_ID, appId: APP_ID }, unauthorizedIdentity)
    ).rejects.toThrow(/permission denied/i);
  });

  // ── 2. Unauthorized write is REJECTED ────────────────────────────────────
  it('should reject run_app_action for an unauthorized identity', async () => {
    const { svc } = buildService({ identity: unauthorizedIdentity });

    await expect(
      svc.executeInterfaceTool(
        'run_app_action',
        { baseId: BASE_ID, appId: APP_ID, action: 'rename', name: 'Hacked' },
        unauthorizedIdentity
      )
    ).rejects.toThrow(/permission denied/i);
  });

  // ── 3. Authorized read → get_app returns meta + content ─────────────────
  it('should return app meta and content for authorized get_app', async () => {
    const { svc, appBuilderStub } = buildService({ identity: authorizedIdentity });

    const result = await svc.executeInterfaceTool(
      'get_app',
      { baseId: BASE_ID, appId: APP_ID },
      authorizedIdentity
    );

    expect(result).toMatchObject({ id: APP_ID, name: 'My App', content: mockAppContent });
    expect(appBuilderStub.findOne).toHaveBeenCalledWith(BASE_ID, APP_ID);
    expect(appBuilderStub.getAppContent).toHaveBeenCalledWith(BASE_ID, APP_ID);
  });

  // ── 4. Authorized read → get_dashboard returns data ──────────────────────
  it('should return dashboard data for authorized get_dashboard', async () => {
    const { svc, dashboardStub } = buildService({ identity: authorizedIdentity });

    const result = await svc.executeInterfaceTool(
      'get_dashboard',
      { baseId: BASE_ID, id: DASH_ID },
      authorizedIdentity
    );

    expect(result).toMatchObject({ id: DASH_ID, name: 'My Dashboard' });
    expect(dashboardStub.getDashboardById).toHaveBeenCalledWith(BASE_ID, DASH_ID);
  });

  // ── 5. Authorized write → run_app_action delegates rename to AppBuilderService
  it('should rename an app via run_app_action for authorized identity', async () => {
    const { svc, appBuilderStub } = buildService({ identity: authorizedIdentity });

    await svc.executeInterfaceTool(
      'run_app_action',
      { baseId: BASE_ID, appId: APP_ID, action: 'rename', name: 'New Name' },
      authorizedIdentity
    );

    expect(appBuilderStub.renameApp).toHaveBeenCalledWith(BASE_ID, APP_ID, 'New Name');
  });

  // ── 6. Authorized write → update_dashboard delegates to DashboardService ─
  it('should update dashboard name via update_dashboard for authorized identity', async () => {
    const { svc, dashboardStub } = buildService({ identity: authorizedIdentity });

    await svc.executeInterfaceTool(
      'update_dashboard',
      { baseId: BASE_ID, id: DASH_ID, name: 'Renamed Dashboard' },
      authorizedIdentity
    );

    expect(dashboardStub.renameDashboard).toHaveBeenCalledWith(
      BASE_ID,
      DASH_ID,
      'Renamed Dashboard'
    );
  });

  // ── 7. Read-only identity CANNOT write ───────────────────────────────────
  it('should reject run_app_action for read-only identity (read perm ≠ write perm)', async () => {
    const { svc } = buildService({ identity: readOnlyIdentity });

    await expect(
      svc.executeInterfaceTool(
        'run_app_action',
        { baseId: BASE_ID, appId: APP_ID, action: 'rename', name: 'Hijack' },
        readOnlyIdentity
      )
    ).rejects.toThrow(/permission denied/i);
  });

  // ── 8. Unknown tool name ─────────────────────────────────────────────────
  it('should throw for unknown tool name', async () => {
    const { svc } = buildService({ identity: authorizedIdentity });

    await expect(
      svc.executeInterfaceTool('totally_unknown_tool', { baseId: BASE_ID }, authorizedIdentity)
    ).rejects.toThrow(/unknown.*tool/i);
  });
});
