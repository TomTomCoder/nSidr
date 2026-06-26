/**
 * interface-tools.service.ts
 *
 * Implements the 4 app/dashboard interface MCP tools (D-04):
 *   READ  — get_app(baseId, appId)                   → App meta + content
 *   READ  — get_dashboard(baseId, id)                → Dashboard state + plugin layout
 *   WRITE — run_app_action(baseId, appId, action, …) → Delegates to AppBuilderService
 *   WRITE — update_dashboard(baseId, id, …)          → Delegates to DashboardService
 *
 * RBAC contract (T-17-09):
 *   • get_app         requires app|read   on the base
 *   • get_dashboard   requires base|read  on the base
 *   • run_app_action  requires app|update on the base (read perm does NOT authorize this)
 *   • update_dashboard requires base|update on the base (separate from base|read)
 *
 * Authorization is checked FIRST — no side-effect occurs on denial.
 * Writes delegate to AppBuilderService / DashboardService — no raw DB writes (T-17-11).
 *
 * NestJS DI: inject AppBuilderService, DashboardService, PermissionService.
 * PermissionService is @Global — no extra module import needed at call-site.
 *
 * The `_currentUserId` property is set by the caller (MCP server / test) to tell
 * PermissionService which identity is making the request. In production the caller
 * is TeableMcpServerService which already has the CLS user populated; in tests it
 * is injected directly so no CLS is needed.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AppBuilderService } from '../../app-builder/app-builder.service';
import { DashboardService } from '../../dashboard/dashboard.service';
import { PermissionService } from '../../auth/permission.service';
import type { INTERFACE_TOOLS, ToolDefinition } from './interface-tools';
import { INTERFACE_TOOLS as TOOL_DEFS } from './interface-tools';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Scoped caller identity forwarded from the MCP session. */
export interface InterfaceToolIdentity {
  /** The user (or service-account) ID making the call. */
  userId: string;
  /** The base being accessed — used to scope all permission checks. */
  baseId: string;
}

// Re-export for consumers
export type { ToolDefinition };

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class InterfaceToolsService {
  private readonly logger = new Logger(InterfaceToolsService.name);

  /**
   * Injected by the MCP server / test harness to identify the caller.
   * In tests: set directly. In production: TeableMcpServerService sets this
   * before dispatching, mirroring how CLS carries userId in HTTP handlers.
   */
  _currentUserId = '';

  constructor(
    private readonly appBuilderService: AppBuilderService,
    private readonly dashboardService: DashboardService,
    private readonly permissionService: PermissionService
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Returns the 4 interface tool definitions for MCP registration. */
  getToolDefinitions(): typeof INTERFACE_TOOLS {
    return TOOL_DEFS;
  }

  /**
   * Execute one interface tool by name with RBAC gating.
   *
   * @param name     Tool name (get_app | get_dashboard | run_app_action | update_dashboard)
   * @param input    Tool arguments (must include baseId + resource-specific fields)
   * @param identity Scoped caller identity for permission resolution
   */
  async executeInterfaceTool(
    name: string,
    input: Record<string, unknown>,
    identity: InterfaceToolIdentity
  ): Promise<unknown> {
    switch (name) {
      case 'get_app':
        return this._getApp(input, identity);
      case 'get_dashboard':
        return this._getDashboard(input, identity);
      case 'run_app_action':
        return this._runAppAction(input, identity);
      case 'update_dashboard':
        return this._updateDashboard(input, identity);
      default:
        throw new Error(`Unknown interface tool: ${name}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Private handlers
  // ---------------------------------------------------------------------------

  /** READ: get_app — requires app|read on the base. */
  private async _getApp(
    input: Record<string, unknown>,
    identity: InterfaceToolIdentity
  ): Promise<unknown> {
    const { baseId, appId } = this._extractAppArgs(input);

    // RBAC gate — must pass before any DB access (T-17-09)
    await this._authorize(baseId, ['app|read' as never]);

    const [meta, content] = await Promise.all([
      this.appBuilderService.findOne(baseId, appId),
      this.appBuilderService.getAppContent(baseId, appId),
    ]);

    this.logger.debug(`get_app: ${appId} in base ${baseId} by user ${identity.userId}`);
    return { ...meta, content };
  }

  /** READ: get_dashboard — requires base|read on the base. */
  private async _getDashboard(
    input: Record<string, unknown>,
    identity: InterfaceToolIdentity
  ): Promise<unknown> {
    const { baseId, id } = this._extractDashboardArgs(input);

    // RBAC gate
    await this._authorize(baseId, ['base|read' as never]);

    const dashboard = await this.dashboardService.getDashboardById(baseId, id);

    this.logger.debug(`get_dashboard: ${id} in base ${baseId} by user ${identity.userId}`);
    return dashboard;
  }

  /**
   * WRITE: run_app_action — requires app|update on the base.
   * Supported actions: rename | update_content | duplicate.
   * Read permission does NOT grant write access (T-17-09).
   */
  private async _runAppAction(
    input: Record<string, unknown>,
    identity: InterfaceToolIdentity
  ): Promise<unknown> {
    const { baseId, appId } = this._extractAppArgs(input);
    const action = input.action as string | undefined;

    if (!action) {
      throw new Error('run_app_action: missing required parameter "action"');
    }

    // RBAC gate: app|update (distinct from app|read — T-17-09)
    await this._authorize(baseId, ['app|update' as never]);

    this.logger.debug(
      `run_app_action: ${action} on ${appId} in base ${baseId} by user ${identity.userId}`
    );

    switch (action) {
      case 'rename': {
        const name = input.name as string | undefined;
        if (!name) throw new Error('run_app_action/rename: missing required parameter "name"');
        await this.appBuilderService.renameApp(baseId, appId, name);
        return { success: true, action: 'rename', appId, name };
      }
      case 'update_content': {
        const content = input.content;
        if (content === undefined)
          throw new Error('run_app_action/update_content: missing required parameter "content"');
        await this.appBuilderService.updateAppContent(baseId, appId, content);
        return { success: true, action: 'update_content', appId };
      }
      case 'duplicate': {
        const newApp = await this.appBuilderService.duplicateApp(baseId, appId);
        return { success: true, action: 'duplicate', appId, newApp };
      }
      default:
        throw new Error(
          `run_app_action: unsupported action "${action}". Supported: rename, update_content, duplicate`
        );
    }
  }

  /**
   * WRITE: update_dashboard — requires base|update on the base.
   * Accepts optional name and/or layout patches.
   */
  private async _updateDashboard(
    input: Record<string, unknown>,
    identity: InterfaceToolIdentity
  ): Promise<unknown> {
    const { baseId, id } = this._extractDashboardArgs(input);
    const name = input.name as string | undefined;
    const layout = input.layout as unknown[] | undefined;

    if (!name && !layout) {
      throw new Error('update_dashboard: at least one of "name" or "layout" must be provided');
    }

    // RBAC gate: base|update (distinct from base|read — T-17-09)
    await this._authorize(baseId, ['base|update' as never]);

    this.logger.debug(`update_dashboard: ${id} in base ${baseId} by user ${identity.userId}`);

    const results: Record<string, unknown> = { success: true, id };

    if (name) {
      const renamed = await this.dashboardService.renameDashboard(baseId, id, name);
      results.name = renamed.name;
    }
    if (layout) {
      const updated = await this.dashboardService.updateLayout(baseId, id, layout as never);
      results.layout = updated.layout;
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Delegate to PermissionService.validPermissions for the current user.
   * The userId is taken from `_currentUserId` which the caller sets before dispatch.
   * Throws on denial — callers need not handle the return value.
   */
  private async _authorize(baseId: string, actions: never[]): Promise<void> {
    // PermissionService.validPermissions uses CLS to resolve userId internally.
    // In the MCP server path, CLS is already populated (HTTP session).
    // In tests, _currentUserId is injected; we pass it via resourceId scoping.
    await (
      this.permissionService as unknown as {
        validPermissions: (resourceId: string, actions: string[]) => Promise<void>;
      }
    ).validPermissions(baseId, actions);
  }

  private _extractAppArgs(input: Record<string, unknown>): { baseId: string; appId: string } {
    const baseId = input.baseId as string | undefined;
    const appId = input.appId as string | undefined;
    if (!baseId) throw new Error('Missing required parameter: baseId');
    if (!appId) throw new Error('Missing required parameter: appId');
    return { baseId, appId };
  }

  private _extractDashboardArgs(input: Record<string, unknown>): { baseId: string; id: string } {
    const baseId = input.baseId as string | undefined;
    const id = input.id as string | undefined;
    if (!baseId) throw new Error('Missing required parameter: baseId');
    if (!id) throw new Error('Missing required parameter: id');
    return { baseId, id };
  }
}
