import { describe, it, expect, vi } from 'vitest';
import { mcpToolToDefinition, makeMcpExecutor } from './mcp-tool-adapter';

// Minimal shape of an MCP tool descriptor (matches SDK Tool type)
const SAMPLE_MCP_TOOL = {
  name: 'create_issue',
  description: 'Creates a GitHub issue',
  inputSchema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Issue title' },
      body: { type: 'string', description: 'Issue body' },
    },
    required: ['title'],
  },
};

describe('mcpToolToDefinition', () => {
  it('returns a ToolDefinition with type=function', () => {
    const def = mcpToolToDefinition('github', SAMPLE_MCP_TOOL);
    expect(def.type).toBe('function');
  });

  it('namespaces the tool name as mcp__{serverId}__{toolName}', () => {
    const def = mcpToolToDefinition('github', SAMPLE_MCP_TOOL);
    expect(def.function.name).toBe('mcp__github__create_issue');
  });

  it('preserves description', () => {
    const def = mcpToolToDefinition('github', SAMPLE_MCP_TOOL);
    expect(def.function.description).toBe('Creates a GitHub issue');
  });

  it('maps inputSchema to nested parameters shape', () => {
    const def = mcpToolToDefinition('github', SAMPLE_MCP_TOOL);
    expect(def.function.parameters).toEqual({
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Issue title' },
        body: { type: 'string', description: 'Issue body' },
      },
      required: ['title'],
    });
  });

  it('uses empty required array when inputSchema has no required field', () => {
    const tool = { ...SAMPLE_MCP_TOOL, inputSchema: { type: 'object' as const, properties: {} } };
    const def = mcpToolToDefinition('my-server', tool);
    expect(def.function.parameters.required).toEqual([]);
  });

  it('uses empty properties when inputSchema has no properties field', () => {
    const tool = {
      ...SAMPLE_MCP_TOOL,
      inputSchema: {
        type: 'object' as const,
        properties: undefined as unknown as Record<string, unknown>,
      },
    };
    const def = mcpToolToDefinition('my-server', tool);
    expect(def.function.parameters.properties).toEqual({});
  });
});

describe('makeMcpExecutor', () => {
  it('calls client.callTool with de-namespaced original tool name', async () => {
    const mockClient = {
      callTool: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'result-value' }] }),
    };

    const executor = makeMcpExecutor(mockClient as never, 'github', 'create_issue');
    const result = await executor({ title: 'Test issue', body: 'Test body' });

    expect(mockClient.callTool).toHaveBeenCalledWith({
      name: 'create_issue',
      arguments: { title: 'Test issue', body: 'Test body' },
    });
    expect(result).toEqual({ content: [{ type: 'text', text: 'result-value' }] });
  });

  it('passes arguments as-is to callTool', async () => {
    const mockClient = {
      callTool: vi.fn().mockResolvedValue({ content: [] }),
    };
    const executor = makeMcpExecutor(mockClient as never, 'srv', 'my_tool');
    await executor({ foo: 'bar', count: 42 });
    expect(mockClient.callTool).toHaveBeenCalledWith({
      name: 'my_tool',
      arguments: { foo: 'bar', count: 42 },
    });
  });
});
