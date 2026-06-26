/**
 * teable-mcp-tools.ts
 *
 * Maps the existing built-in Teable agent tools to MCP server tool registrations.
 * Tool schemas are derived from AgentToolRegistryService.getBuiltInTools() — no re-authoring.
 *
 * Uses the low-level SDK Server.setRequestHandler for tools/list and tools/call so that
 * the plain JSON Schema objects from ToolDefinition.function.parameters can be served
 * verbatim (McpServer.registerTool requires Zod schemas which would require re-authoring).
 *
 * Each tools/call handler delegates to AgentExecutionService.executeTool (the canonical
 * execution path) so SQL/record logic lives in exactly one place (Rule T-17-02: no forking).
 *
 * RBAC: enforced by the CALLER (TeableMcpServerService) before this function is invoked.
 * Per-call RBAC is passed in via the `checkPermission` callback so that this module
 * remains pure (no NestJS DI, no CLS) and unit-testable without booting Nest.
 */

import {
  ErrorCode,
  McpError,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { AgentToolRegistryService } from '../agent-tool-registry.service';
import type { AgentExecutionService, AgentRunContext } from '../agent-execution.service';
// VALUE import (not `import type`) per Phase 17 bug-1 lesson — InterfaceToolsService is a
// Nest @Injectable that must survive emit so DI resolves at runtime in the call site.
import { InterfaceToolsService } from './interface-tools.service';

/** Minimal agent shape required by AgentExecutionService.executeTool. */
export interface McpAgentContext {
  id: string;
  baseId: string;
}

/** Subset of McpAgentContext + caller identity used for interface tool dispatch. */
export interface McpInterfaceCallerContext {
  userId: string;
  baseId: string;
}

/**
 * Register built-in Teable tools on the given low-level SDK Server using
 * tools/list + tools/call request handlers.
 *
 * @param server         The low-level SDK Server instance (already connected / will connect).
 * @param registry       AgentToolRegistryService — source of truth for tool schemas.
 * @param execution      AgentExecutionService — canonical tool execution.
 * @param agentCtx       Resolved agent + base identity (RBAC already verified by caller).
 * @param runCtx         AgentRunContext for the session (userId, trigger, etc.).
 * @param checkPermission Called before each tools/call; throws McpError if unauthorized.
 */
export function registerTeableMcpTools(
  server: Server,
  registry: AgentToolRegistryService,
  execution: AgentExecutionService,
  interfaceToolsService: InterfaceToolsService,
  agentCtx: McpAgentContext,
  runCtx: AgentRunContext,
  checkPermission: () => Promise<void>
): void {
  const builtInTools = registry.getBuiltInTools();
  // INTERFACE_TOOLS uses the same { type:'function', function:{ name, description, parameters } }
  // wrapper as the built-in tool registry — read t.function.*, not t.* directly.
  const interfaceDefs = interfaceToolsService.getToolDefinitions();
  const interfaceNames = new Set(interfaceDefs.map((t) => t.function.name));

  // Announce tools capability
  server.registerCapabilities({ tools: {} });

  // tools/list — return all built-in tools + interface tools as MCP tool descriptors
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        ...builtInTools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          inputSchema: t.function.parameters,
        })),
        ...interfaceDefs.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          inputSchema: t.function.parameters,
        })),
      ],
    };
  });

  // tools/call — RBAC-gate then dispatch to interface or built-in branch
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // RBAC gate: verify the caller's identity has access to this base.
    // Single gate fires once before either dispatch branch (interface tools
    // perform additional per-action RBAC internally — this is the baseline).
    await checkPermission();

    const toolName = request.params.name;
    const toolArgs = (request.params.arguments ?? {}) as Record<string, unknown>;

    // Interface tool dispatch (D-17.1-01 bug-3 fix)
    if (interfaceNames.has(toolName)) {
      // The InterfaceToolsService uses `_currentUserId` to identify the caller for
      // its internal PermissionService checks. Set it before dispatch — mirrors
      // how the REST path provides identity via CLS.
      interfaceToolsService._currentUserId = runCtx.userId ?? '';
      const result = await interfaceToolsService.executeInterfaceTool(toolName, toolArgs, {
        userId: runCtx.userId ?? '',
        baseId: agentCtx.baseId,
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: typeof result === 'string' ? result : JSON.stringify(result),
          },
        ],
      };
    }

    // Built-in tool dispatch (legacy path)
    const known = builtInTools.find((t) => t.function.name === toolName);
    if (!known) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }

    const result = await execution.executeTool(
      { name: toolName, input: toolArgs },
      agentCtx,
      runCtx
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: typeof result === 'string' ? result : JSON.stringify(result),
        },
      ],
    };
  });
}

/**
 * Returns the list of built-in tool names that will be served by the MCP server.
 * Used in tests to assert coverage.
 */
export function getBuiltInMcpToolNames(registry: AgentToolRegistryService): string[] {
  return registry.getBuiltInTools().map((t) => t.function.name);
}
