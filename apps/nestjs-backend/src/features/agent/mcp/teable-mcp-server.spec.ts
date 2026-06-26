/**
 * teable-mcp-server.spec.ts
 *
 * In-process round-trip tests for the Teable MCP server layer.
 * Uses InMemoryTransport (no HTTP server) to keep the test self-contained
 * and memory-safe (no full NestJS app boot per BOOT-OOM guidance).
 *
 * Tests cover:
 *  1. tools/list returns all built-in tool names (spec: tool names match registry).
 *  2. Authorized identity → tool call returns data content (RBAC passes).
 *  3. Unauthorized identity → tool call is rejected with McpError (RBAC denied).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { registerTeableMcpTools, getBuiltInMcpToolNames } from './teable-mcp-tools';

// ---------------------------------------------------------------------------
// Helpers: build mock registry + execution without NestJS DI
// ---------------------------------------------------------------------------

function makeMockRegistry() {
  return {
    getBuiltInTools: vi.fn().mockReturnValue([
      {
        type: 'function',
        function: {
          name: 'search_records',
          description: 'Full-text search across tables in a base',
          parameters: {
            type: 'object',
            properties: {
              tableId: { type: 'string' },
              query: { type: 'string' },
            },
            required: ['tableId', 'query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_records',
          description: 'List or filter records from a table',
          parameters: {
            type: 'object',
            properties: { tableId: { type: 'string' } },
            required: ['tableId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_record',
          description: 'Read a single record',
          parameters: {
            type: 'object',
            properties: { tableId: { type: 'string' }, recordId: { type: 'string' } },
            required: ['tableId', 'recordId'],
          },
        },
      },
    ]),
  };
}

function makeMockExecution() {
  return {
    executeTool: vi.fn().mockResolvedValue({ results: [{ id: 'rec001' }], count: 1 }),
  };
}

// IMPORTANT: mock must match the REAL shape of InterfaceToolsService.getToolDefinitions()
// which returns ToolDefinition[] — i.e. { type:'function', function:{ name, description, parameters } }.
// A previous mock used { name, description, inputSchema } at the top level — that shape
// passed unit tests but produced 4 null-named tools at runtime (caught by 2026-06-06 live UAT).
// See interface-tools.ts:20-31 for the ToolDefinition contract.
function mkInterfaceToolDef(name: string, description: string) {
  return {
    type: 'function' as const,
    function: {
      name,
      description,
      parameters: { type: 'object' as const, properties: {}, required: [] as string[] },
    },
  };
}

function makeMockInterfaceTools() {
  return {
    _currentUserId: '',
    getToolDefinitions: vi
      .fn()
      .mockReturnValue([
        mkInterfaceToolDef('get_app', 'Get app metadata'),
        mkInterfaceToolDef('get_dashboard', 'Get dashboard state'),
        mkInterfaceToolDef('run_app_action', 'Run an app action'),
        mkInterfaceToolDef('update_dashboard', 'Update a dashboard'),
      ]),
    executeInterfaceTool: vi.fn().mockResolvedValue({ id: 'app1', name: 'App' }),
  };
}

const AGENT_CTX = { id: 'agt001', baseId: 'bas001' };
const RUN_CTX = { agentId: 'agt001', trigger: 'mcp', userId: 'usr001' };

/**
 * Create a linked server/client pair using InMemoryTransport.
 * The server has built-in tools registered with the given checkPermission callback.
 */
async function buildInProcessPair(
  registry: ReturnType<typeof makeMockRegistry>,
  execution: ReturnType<typeof makeMockExecution>,
  checkPermission: () => Promise<void>,
  interfaceTools: ReturnType<typeof makeMockInterfaceTools> = makeMockInterfaceTools()
): Promise<{
  client: Client;
  server: Server;
  interfaceTools: ReturnType<typeof makeMockInterfaceTools>;
}> {
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();

  const server = new Server({ name: 'teable', version: '1.0.0' }, { capabilities: {} });

  registerTeableMcpTools(
    server,
    registry as any,
    execution as any,
    interfaceTools as any,
    AGENT_CTX,
    RUN_CTX as any,
    checkPermission
  );

  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

  // Connect both ends
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return { client, server, interfaceTools };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Teable MCP Server — in-process round-trip', () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  let execution: ReturnType<typeof makeMockExecution>;

  beforeEach(() => {
    registry = makeMockRegistry();
    execution = makeMockExecution();
  });

  it('tools/list returns all built-in tool names', async () => {
    const { client } = await buildInProcessPair(registry, execution, async () => {});

    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    // Assert coverage via getBuiltInMcpToolNames helper
    const expectedNames = getBuiltInMcpToolNames(registry as any);
    expect(names).toEqual(expect.arrayContaining(expectedNames));
    // Built-in tools + 4 interface tools (D-17.1-01 bug-3 fix)
    expect(names.length).toBe(expectedNames.length + 4);

    await client.close();
  });

  it('authorized identity: tool call returns data content', async () => {
    // checkPermission allows (no throw)
    const authorizedCheck = vi.fn().mockResolvedValue(undefined);

    const { client } = await buildInProcessPair(registry, execution, authorizedCheck);

    const result = await client.callTool({
      name: 'search_records',
      arguments: { tableId: 'tbl001', query: 'hello' },
    });

    // RBAC check was called
    expect(authorizedCheck).toHaveBeenCalledTimes(1);

    // executeTool was called with the right args
    expect(execution.executeTool).toHaveBeenCalledWith(
      { name: 'search_records', input: { tableId: 'tbl001', query: 'hello' } },
      AGENT_CTX,
      RUN_CTX
    );

    // Response content is a text block with JSON result
    const content = (result as { content: Array<{ type: string; text?: string }> }).content;
    expect(content).toHaveLength(1);
    const block = content[0];
    expect(block.type).toBe('text');
    if (block.type === 'text') {
      const parsed = JSON.parse(block.text ?? '');
      expect(parsed).toEqual({ results: [{ id: 'rec001' }], count: 1 });
    }

    await client.close();
  });

  it('unauthorized identity: tool call is rejected — RBAC enforced', async () => {
    // checkPermission denies (throws McpError)
    const { McpError: McpErr, ErrorCode } = await import('@modelcontextprotocol/sdk/types.js');
    const unauthorizedCheck = vi
      .fn()
      .mockRejectedValue(new McpErr(ErrorCode.InvalidRequest, 'Access denied'));

    const { client } = await buildInProcessPair(registry, execution, unauthorizedCheck);

    await expect(
      client.callTool({ name: 'search_records', arguments: { tableId: 't', query: 'q' } })
    ).rejects.toThrow();

    // executeTool must NOT have been called — RBAC gate fired first
    expect(execution.executeTool).not.toHaveBeenCalled();

    await client.close();
  });

  it('tool call with unknown tool name raises McpError', async () => {
    const { client } = await buildInProcessPair(registry, execution, async () => {});

    // tools/call with an unknown name — server throws McpError which the client propagates
    await expect(client.callTool({ name: 'nonexistent_tool', arguments: {} })).rejects.toThrow();

    // executeTool must NOT have been called — unknown tool guard fired first
    expect(execution.executeTool).not.toHaveBeenCalled();

    await client.close();
  });

  it('registers interface tools alongside built-in tools and dispatches by name (D-17.1-01)', async () => {
    const interfaceTools = makeMockInterfaceTools();
    const authorizedCheck = vi.fn().mockResolvedValue(undefined);

    const { client } = await buildInProcessPair(
      registry,
      execution,
      authorizedCheck,
      interfaceTools
    );

    // (a) tools/list includes the 4 interface tool names
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['get_app', 'get_dashboard', 'run_app_action', 'update_dashboard'])
    );

    // (b) tools/call for get_app routes to interfaceToolsService.executeInterfaceTool
    await client.callTool({
      name: 'get_app',
      arguments: { baseId: 'bas001', appId: 'app1' },
    });
    expect(interfaceTools.executeInterfaceTool).toHaveBeenCalledWith(
      'get_app',
      { baseId: 'bas001', appId: 'app1' },
      { userId: 'usr001', baseId: 'bas001' }
    );
    // checkPermission was called for the interface tool dispatch
    expect(authorizedCheck).toHaveBeenCalled();
    // built-in execution path was NOT used for interface tool
    expect(execution.executeTool).not.toHaveBeenCalled();

    // (c) tools/call for search_records still routes to execution.executeTool
    await client.callTool({
      name: 'search_records',
      arguments: { tableId: 'tbl1', query: 'q' },
    });
    expect(execution.executeTool).toHaveBeenCalledWith(
      { name: 'search_records', input: { tableId: 'tbl1', query: 'q' } },
      AGENT_CTX,
      RUN_CTX
    );

    await client.close();
  });
});
