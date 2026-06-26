/**
 * MCP tool -> ToolDefinition adapter (Wave 0 spike -- pinned contract for Wave 1).
 *
 * Pure module, no NestJS DI. Unit-testable without booting Nest.
 *
 * NAME PREFIX SCHEME (SPIKE-NOTES.md Adapter Contract):
 *   mcp__{serverId}__{originalToolName}
 *
 * TOOLDEF SHAPE (matches agent-tool-registry.service.ts:4 ToolDefinition verbatim):
 *   { type: 'function', function: { name, description, parameters } }
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Types

/**
 * Minimal shape of an MCP tool descriptor (matches SDK Tool type fields we need).
 * Using a local interface to avoid importing SDK types at runtime in the adapter itself.
 */
export interface McpToolDescriptor {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/** Matches agent-tool-registry.service.ts:4 ToolDefinition verbatim. */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

// Helpers

/**
 * Build the namespaced tool name.
 * Scheme: mcp__{serverId}__{originalToolName}
 */
export function buildMcpToolName(serverId: string, originalName: string): string {
  return `mcp__${serverId}__${originalName}`;
}

/**
 * Extract the original (de-namespaced) tool name from a namespaced one.
 * Returns undefined if the name does not match the prefix scheme.
 */
export function parseMcpToolName(
  namespacedName: string
): { serverId: string; originalName: string } | undefined {
  const match = /^mcp__([^_][^_]*)__(.+)$/.exec(namespacedName);
  if (!match) return undefined;
  return { serverId: match[1], originalName: match[2] };
}

// Core exports (pinned contract for Wave 1)

/**
 * Convert one MCP tool descriptor to the ToolDefinition shape that
 * AgentToolRegistryService expects. The namespaced tool name avoids collisions
 * with built-in tools (e.g. search_records).
 */
export function mcpToolToDefinition(serverId: string, mcpTool: McpToolDescriptor): ToolDefinition {
  return {
    type: 'function',
    function: {
      name: buildMcpToolName(serverId, mcpTool.name),
      description: mcpTool.description ?? '',
      parameters: {
        type: 'object',
        properties: mcpTool.inputSchema.properties ?? {},
        required: mcpTool.inputSchema.required ?? [],
      },
    },
  };
}

/**
 * Create an executor closure for one MCP tool. The closure:
 *  1. Accepts the tool arguments (as a plain object matching the inputSchema).
 *  2. Calls client.callTool with the de-namespaced original tool name.
 *  3. Returns the full callTool result (content array + meta) for the agent to
 *     format/present. Wave 1 (17-02) can wrap this in a richer content extractor
 *     if needed.
 */
export function makeMcpExecutor(
  client: Client,
  _serverId: string,
  originalName: string
): (input: Record<string, unknown>) => Promise<unknown> {
  return async (input: Record<string, unknown>) => {
    return client.callTool({ name: originalName, arguments: input });
  };
}
