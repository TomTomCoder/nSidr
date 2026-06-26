/**
 * teable-mcp-server.service.ts
 *
 * NestJS service that constructs a per-session MCP Server (low-level SDK Server) and
 * serves it over StreamableHTTP transport via the companion controller.
 *
 * Design decisions (BOOT-OOM, SPIKE-NOTES.md):
 * - Server instance is created lazily per session (not on module init).
 * - No long-lived child processes — transport lives inside the NestJS HTTP process.
 * - RBAC gate: before every tools/call, PermissionService.getRoleByBaseId() is called.
 *   A null role (no collaborator record) → McpError UNAUTHORIZED.
 *   This satisfies T-17-01 (elevation) and T-17-03 (cross-base data).
 *
 * CLS: PermissionService reads `user.id` from CLS (set by auth middleware upstream).
 * The controller must run after auth so CLS is populated when checkPermission fires.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { Injectable, Logger } from '@nestjs/common';
import { PermissionService } from '../../auth/permission.service';
import { AgentExecutionService } from '../agent-execution.service';
import { AgentToolRegistryService } from '../agent-tool-registry.service';
import { AgentService } from '../agent.service';
import { InterfaceToolsService } from './interface-tools.service';
import { registerTeableMcpTools } from './teable-mcp-tools';

@Injectable()
export class TeableMcpServerService {
  private readonly logger = new Logger(TeableMcpServerService.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly registry: AgentToolRegistryService,
    private readonly execution: AgentExecutionService,
    private readonly permissionService: PermissionService,
    private readonly interfaceToolsService: InterfaceToolsService
  ) {}

  /**
   * Handle a StreamableHTTP request for a given agent's MCP session.
   *
   * Creates a fresh transport + server per request (stateless mode for
   * low memory footprint per BOOT-OOM guidance).
   *
   * RBAC: verifies the caller has at least one collaborator role on the agent's base
   * before any tool is invoked. Relies on CLS having `user.id` set by auth middleware.
   *
   * @param req      Raw Node.js IncomingMessage (Express passes this through NestJS).
   * @param res      Raw Node.js ServerResponse.
   * @param agentId  Agent ID extracted from the route param.
   * @param userId   Resolved caller user ID (passed from controller for logging + context).
   */
  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    agentId: string,
    userId: string
  ): Promise<void> {
    // Resolve agent + base
    const agent = await this.agentService.findOne(agentId);

    // Create per-session transport (stateless — no session ID)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Create per-session Server
    const server = new Server({ name: 'teable', version: '1.0.0' }, { capabilities: {} });

    // RBAC gate closure — called before every tools/call.
    // PermissionService.getRoleByBaseId uses CLS `user.id` which is set by auth middleware.
    const checkPermission = async (): Promise<void> => {
      // D-17.1-02 bug-4 fix: honour space-inherited roles. Previously this called
      // getRoleByBaseId which only consulted explicit base-collaborator rows, so a
      // space owner with no base row received -32600 from MCP while REST admitted them.
      const role = await this.permissionService.getEffectiveBaseRole(agent.baseId);
      if (!role) {
        this.logger.warn(`MCP RBAC denied: user ${userId} has no role on base ${agent.baseId}`);
        throw new McpError(ErrorCode.InvalidRequest, `Access denied to base ${agent.baseId}`);
      }
    };

    const runCtx = {
      agentId,
      trigger: 'mcp' as const,
      userId,
    };

    registerTeableMcpTools(
      server,
      this.registry,
      this.execution,
      this.interfaceToolsService,
      { id: agentId, baseId: agent.baseId },
      runCtx,
      checkPermission
    );

    await server.connect(transport);

    try {
      // Express has already parsed the JSON body via global middleware, so the
      // raw req stream is empty by the time we get here. Pass the parsed body
      // as the third arg — required by @modelcontextprotocol/sdk ≥1.x when the
      // host framework consumes the request body (per SDK streamableHttp docstring).
      const parsedBody = (req as unknown as { body?: unknown }).body;
      await transport.handleRequest(req, res, parsedBody);
    } finally {
      // Clean up transport after request completes to avoid memory leaks
      await transport.close().catch(() => {
        // Ignore close errors on cleanup
      });
    }
  }
}
