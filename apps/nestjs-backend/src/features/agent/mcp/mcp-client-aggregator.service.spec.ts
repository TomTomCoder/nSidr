/**
 * mcp-client-aggregator.service.spec.ts
 *
 * RED gate: tests written before implementation exists.
 *
 * Uses InMemoryTransport to run in-process MCP round-trips:
 *   - Two mock servers -> merged namespaced ToolDefinition[]
 *   - One unreachable server is skipped, not thrown
 *   - executeMcpTool routes to the correct server
 */

import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpClientAggregatorService } from './mcp-client-aggregator.service';

// ---------------------------------------------------------------------------
// Helpers: spin up an in-process MCP server with given tools
// ---------------------------------------------------------------------------

interface ISimpleTool {
  name: string;
  description: string;
}

async function startInProcessServer(tools: ISimpleTool[]): Promise<InMemoryTransport> {
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();

  const server = new Server(
    { name: 'test-server', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: { type: 'object' as const, properties: {}, required: [] },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const toolName = req.params.name;
    return {
      content: [{ type: 'text', text: `result-from-${toolName}` }],
      isError: false,
    };
  });

  await server.connect(serverTransport);

  return clientTransport;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const AGENT_1 = 'agent-1';

describe('McpClientAggregatorService', () => {
  let service: McpClientAggregatorService;
  let mockPrisma: {
    agentMcpServer: {
      findMany: ReturnType<typeof vi.fn>;
    };
    agent: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  // Stub for PluginMcpDiscoveryService: always returns empty discovery result
  const mockPluginDiscovery = {
    discoverPluginTools: vi.fn().mockResolvedValue({
      definitions: [],
      executors: new Map(),
      mcpEndpoints: [],
    }),
  };

  beforeEach(() => {
    mockPrisma = {
      agentMcpServer: {
        findMany: vi.fn(),
      },
      agent: {
        findUnique: vi.fn().mockResolvedValue({ baseId: 'base-1' }),
      },
    };

    // Constructor receives prismaService + pluginMcpDiscoveryService; cast to any for test
    service = new McpClientAggregatorService(mockPrisma as never, mockPluginDiscovery as never);
  });

  it('should return empty arrays when no MCP servers are configured', async () => {
    mockPrisma.agentMcpServer.findMany.mockResolvedValue([]);
    const result = await service.getAggregatedTools(AGENT_1);
    expect(result.definitions).toEqual([]);
    expect(result.executors.size).toBe(0);
  });

  it('should merge namespaced tools from two in-process MCP servers', async () => {
    const clientTransport1 = await startInProcessServer([
      { name: 'tool_a', description: 'Tool A from server 1' },
      { name: 'tool_b', description: 'Tool B from server 1' },
    ]);

    const clientTransport2 = await startInProcessServer([
      { name: 'tool_c', description: 'Tool C from server 2' },
    ]);

    vi.spyOn(service as any, '_createTransport')
      .mockResolvedValueOnce(clientTransport1)
      .mockResolvedValueOnce(clientTransport2);

    mockPrisma.agentMcpServer.findMany.mockResolvedValue([
      {
        id: 'srv1',
        agentId: AGENT_1,
        name: 'Server 1',
        url: 'http://server1/',
        enabled: true,
        transport: 'streamable-http',
      },
      {
        id: 'srv2',
        agentId: AGENT_1,
        name: 'Server 2',
        url: 'http://server2/',
        enabled: true,
        transport: 'streamable-http',
      },
    ]);

    const result = await service.getAggregatedTools(AGENT_1);

    expect(result.definitions).toHaveLength(3);
    const names = result.definitions.map((d) => d.function.name);
    expect(names).toContain('mcp__srv1__tool_a');
    expect(names).toContain('mcp__srv1__tool_b');
    expect(names).toContain('mcp__srv2__tool_c');

    expect(result.executors.has('mcp__srv1__tool_a')).toBe(true);
    expect(result.executors.has('mcp__srv1__tool_b')).toBe(true);
    expect(result.executors.has('mcp__srv2__tool_c')).toBe(true);
  });

  it('should skip an unreachable server and not throw', async () => {
    const clientTransport1 = await startInProcessServer([
      { name: 'good_tool', description: 'A working tool' },
    ]);

    vi.spyOn(service as any, '_createTransport')
      .mockResolvedValueOnce(clientTransport1)
      .mockRejectedValueOnce(new Error('ECONNREFUSED'));

    mockPrisma.agentMcpServer.findMany.mockResolvedValue([
      {
        id: 'good',
        agentId: AGENT_1,
        name: 'Good',
        url: 'http://good/',
        enabled: true,
        transport: 'streamable-http',
      },
      {
        id: 'bad',
        agentId: AGENT_1,
        name: 'Bad',
        url: 'http://bad/',
        enabled: true,
        transport: 'streamable-http',
      },
    ]);

    const result = await service.getAggregatedTools(AGENT_1);

    expect(result.definitions).toHaveLength(1);
    expect(result.definitions[0].function.name).toBe('mcp__good__good_tool');
  });

  it('should route executeMcpTool to the correct server', async () => {
    const clientTransport1 = await startInProcessServer([
      { name: 'echo', description: 'Echo tool' },
    ]);

    vi.spyOn(service as any, '_createTransport').mockResolvedValueOnce(clientTransport1);

    mockPrisma.agentMcpServer.findMany.mockResolvedValue([
      {
        id: 'srv1',
        agentId: AGENT_1,
        name: 'Server 1',
        url: 'http://srv1/',
        enabled: true,
        transport: 'streamable-http',
      },
    ]);

    await service.getAggregatedTools(AGENT_1);

    const result = await service.executeMcpTool(AGENT_1, 'mcp__srv1__echo', {});
    expect(result).toBeDefined();
    const typed = result as { content: Array<{ type: string; text: string }> };
    expect(typed.content[0].text).toBe('result-from-echo');
  });

  it('should return an error object for an unknown namespaced tool', async () => {
    mockPrisma.agentMcpServer.findMany.mockResolvedValue([]);
    await service.getAggregatedTools(AGENT_1);

    const result = await service.executeMcpTool(AGENT_1, 'mcp__unknown__tool', {});
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});
