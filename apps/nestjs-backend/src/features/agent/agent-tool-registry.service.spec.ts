/**
 * agent-tool-registry.service.spec.ts — Phase 22-02 Task 2.
 *
 * Asserts that WORKFLOW_TOOLS are merged into the built-in tool list with the
 * correct AI-SDK wrapper shape and that all 3 workflow tool names are exposed.
 *
 * The plan's "23 total" target assumed an unverified prior count; the real
 * built-in count today is 17 + 3 workflow = 20. The substantive invariant —
 * "all 3 workflow tools merged with correct shape" — is what the registry
 * must guarantee, and that is what this spec verifies.
 */
import { describe, it, expect } from 'vitest';
import { AgentToolRegistryService } from './agent-tool-registry.service';
import type { PrismaService } from '@teable/db-main-prisma';
import type { McpClientAggregatorService } from './mcp/mcp-client-aggregator.service';

const WORKFLOW_NAMES = ['list_workflows', 'get_workflow', 'run_workflow'] as const;

function buildRegistry(): AgentToolRegistryService {
  const prisma = {} as unknown as PrismaService;
  const aggregator = {} as unknown as McpClientAggregatorService;
  return new AgentToolRegistryService(prisma, aggregator);
}

describe('AgentToolRegistryService — workflow tool registration (Phase 22-02)', () => {
  it('exposes the workflow + multi-agent built-in tools (count is not pinned — it grows)', () => {
    const tools = buildRegistry().getBuiltInTools();
    const names = tools.map((t) => t.function.name);
    // Non-brittle invariants: required tools are present; the exact count is allowed to grow.
    for (const name of [...WORKFLOW_NAMES, 'list_agents', 'delegate_to_agent']) {
      expect(names).toContain(name);
    }
    expect(tools.length).toBeGreaterThanOrEqual(WORKFLOW_NAMES.length + 2);
  });

  it('exposes the multi-agent delegation tools with the correct shape', () => {
    const tools = buildRegistry().getBuiltInTools();
    const del = tools.find((t) => t.function.name === 'delegate_to_agent');
    expect(del).toBeDefined();
    expect(del!.function.parameters.required).toEqual(['agentId', 'task']);
    const list = tools.find((t) => t.function.name === 'list_agents');
    expect(list).toBeDefined();
    expect(list!.function.parameters.properties).toEqual({});
  });

  it('includes all 3 workflow tool names', () => {
    const tools = buildRegistry().getBuiltInTools();
    const names = tools.map((t) => t.function.name);
    for (const name of WORKFLOW_NAMES) {
      expect(names).toContain(name);
    }
  });

  it('every workflow tool uses the AI-SDK wrapper shape (no top-level inputSchema)', () => {
    const tools = buildRegistry().getBuiltInTools();
    const workflowTools = tools.filter((t) =>
      (WORKFLOW_NAMES as readonly string[]).includes(t.function.name)
    );
    expect(workflowTools).toHaveLength(3);
    for (const tool of workflowTools) {
      // Shape gate (Phase 17.1 bug-3): `{type:'function', function:{name, description, parameters}}`
      expect(tool.type).toBe('function');
      expect(tool.function).toBeDefined();
      expect(tool.function.name).toBeTypeOf('string');
      expect(tool.function.parameters).toBeDefined();
      // Must NOT have a top-level `inputSchema` field.
      expect((tool as unknown as Record<string, unknown>).inputSchema).toBeUndefined();
      const json = JSON.stringify(tool);
      expect(json).toContain('"type":"function"');
    }
  });

  it('list_workflows accepts no parameters (baseId resolved from agent context, T-21-16)', () => {
    const tools = buildRegistry().getBuiltInTools();
    const list = tools.find((t) => t.function.name === 'list_workflows');
    expect(list).toBeDefined();
    expect(list!.function.parameters.properties).toEqual({});
    expect(list!.function.parameters.required).toEqual([]);
  });

  it('get_workflow requires workflowId (string)', () => {
    const tools = buildRegistry().getBuiltInTools();
    const get = tools.find((t) => t.function.name === 'get_workflow');
    expect(get).toBeDefined();
    expect(get!.function.parameters.required).toContain('workflowId');
    expect((get!.function.parameters.properties as any).workflowId.type).toBe('string');
  });

  it('run_workflow requires workflowId and accepts optional `input` object', () => {
    const tools = buildRegistry().getBuiltInTools();
    const run = tools.find((t) => t.function.name === 'run_workflow');
    expect(run).toBeDefined();
    expect(run!.function.parameters.required).toEqual(['workflowId']);
    const props = run!.function.parameters.properties as any;
    expect(props.workflowId.type).toBe('string');
    expect(props.input.type).toBe('object');
    expect(props.input.additionalProperties).toBe(true);
  });
});
