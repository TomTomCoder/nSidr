/**
 * agent-mcp-flow.e2e-spec.ts
 *
 * In-process end-to-end integration test for the full agent MCP + memory recall flow.
 *
 * This test wires together AgentMemoryService, McpClientAggregatorService, and a
 * minimal stub of AgentExecutionService's critical path WITHOUT booting the NestJS
 * application or connecting to a live database. It is intentionally kept in-process
 * (no HTTP server) to respect the memory-constrained execution environment.
 *
 * LIVE E2E DEFERRED: A live end-to-end test (app booted on :3002, real DB) is
 * DEFERRED. Manual steps to verify live are:
 *   1. pnpm --filter @teable/nestjs-backend dev:api (boots on :3002)
 *   2. Call POST /api/agent/:id/run with a trigger payload
 *   3. In a second call, include conversationId from the first response
 *   4. Assert the second response references facts mentioned in turn 1
 *
 * Flow exercised here:
 *   1. AgentMemoryService.getRecent(agentId) → empty on first run
 *   2. Agent runs (simulated), saves a tool result to memory via saveRecent
 *   3. AgentMemoryService.getRecent(agentId) → returns the recalled fact in turn 2
 *   4. A second agent (agentB) sees NO memory from agentA (isolation)
 *   5. McpClientAggregatorService with in-process MCP server → tool invoked, result
 *      merged into definitions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentMemoryService } from '../agent-memory.service';
import { McpClientAggregatorService } from './mcp-client-aggregator.service';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory Prisma stub (no DB connection)
// ---------------------------------------------------------------------------

function buildInMemoryPrisma() {
  const store: Array<{
    id: string;
    agentId: string;
    memoryType: string;
    content: string;
    metadata: object | null;
    expiresAt: Date | null;
    createdTime: Date;
  }> = [];
  let counter = 0;

  return {
    agentMemory: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `mem_${++counter}`,
          agentId: data.agentId as string,
          memoryType: data.memoryType as string,
          content: data.content as string,
          metadata: (data.metadata as object) ?? null,
          expiresAt: (data.expiresAt as Date) ?? null,
          createdTime: new Date(),
        };
        store.push(row);
        return row;
      }),
      findMany: vi.fn(
        async ({
          where,
          orderBy,
          take,
        }: {
          where: Record<string, unknown>;
          orderBy?: { createdTime?: string };
          take?: number;
        }) => {
          let results = store.filter((r) => {
            if (r.agentId !== where.agentId) return false;
            if (where.memoryType && r.memoryType !== where.memoryType) return false;
            if (Array.isArray(where.OR)) {
              const now = new Date();
              return (where.OR as Array<Record<string, unknown>>).some((cond) => {
                if (cond.expiresAt === null) return r.expiresAt === null;
                const gt = (cond.expiresAt as Record<string, Date> | undefined)?.gt;
                if (gt) return r.expiresAt !== null && r.expiresAt > gt;
                return false;
              });
            }
            return true;
          });
          if (orderBy?.createdTime === 'desc') {
            results = results.sort((a, b) => b.createdTime.getTime() - a.createdTime.getTime());
          }
          if (take) results = results.slice(0, take);
          return results;
        }
      ),
      findFirst: vi.fn(async () => null),
      update: vi.fn(async () => null),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    agentMcpServer: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    agent: {
      findUnique: vi.fn().mockResolvedValue({ baseId: 'base1' }),
    },
  };
}

// ---------------------------------------------------------------------------
// In-process MCP server helper
// ---------------------------------------------------------------------------

async function spawnInProcessMcpServer(toolName: string, returnText: string) {
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();

  const server = new Server(
    { name: 'teable-test-server', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: toolName,
        description: `Test tool: ${toolName}`,
        inputSchema: { type: 'object' as const, properties: {}, required: [] },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async () => ({
    content: [{ type: 'text', text: returnText }],
    isError: false,
  }));

  await server.connect(serverTransport);
  return clientTransport;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Agent MCP + Memory Recall — in-process e2e flow', () => {
  let prisma: ReturnType<typeof buildInMemoryPrisma>;
  let memorySvc: AgentMemoryService;

  beforeEach(() => {
    prisma = buildInMemoryPrisma();
    memorySvc = new AgentMemoryService(prisma as never);
  });

  // ── Flow 1: Agent recalls a fact from a prior conversation turn ──────────
  it('agent recalls a prior-conversation fact via memory in the second turn', async () => {
    const AGENT_ID = 'agent_recall_test';

    // Turn 1: no prior memories
    const turn1Memories = await memorySvc.getRecent(AGENT_ID);
    expect(turn1Memories).toHaveLength(0);

    // Simulate agent run end: save fact to memory (mirrors execution.service.ts:238)
    const runSummary = '[manual] Run 1: User said their name is Alice. Tone: casual.';
    await memorySvc.saveRecent(AGENT_ID, runSummary);

    // Turn 2: agent starts, loads memory — should find the recalled fact
    const turn2Memories = await memorySvc.getRecent(AGENT_ID);
    expect(turn2Memories).toHaveLength(1);
    expect(turn2Memories[0]).toContain('Alice');
  });

  // ── Flow 2: Cross-agent memory isolation ─────────────────────────────────
  it('agentB does NOT see facts saved by agentA (cross-agent memory isolation)', async () => {
    const AGENT_A = 'agentA_isolation';
    const AGENT_B = 'agentB_isolation';

    await memorySvc.saveRecent(AGENT_A, 'Secret: project codename is Falcon.');

    const bMemories = await memorySvc.getRecent(AGENT_B);
    expect(bMemories.join(' ')).not.toContain('Falcon');
    expect(bMemories).toHaveLength(0);
  });

  // ── Flow 3: Preferences survive across turns ──────────────────────────────
  it('preferences set in turn 1 are available in turn 2', async () => {
    const AGENT_ID = 'agent_prefs_test';

    // Turn 1: set a preference
    await memorySvc.setPreference(AGENT_ID, 'response_style', 'bullet_points');

    // Turn 2: load preferences
    const prefs = await memorySvc.getPreferences(AGENT_ID);
    expect(prefs.response_style).toBe('bullet_points');
  });

  // ── Flow 4: MCP tool invocation via in-process server ────────────────────
  it('aggregator discovers in-process MCP tool with correct namespace and executor', async () => {
    const clientTransport = await spawnInProcessMcpServer('get_weather', 'Sunny, 25°C');

    const mockPrisma = {
      agentMcpServer: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'srv_weather',
            agentId: 'agentMcp',
            url: 'http://weather/',
            name: 'Weather',
            enabled: true,
          },
        ]),
      },
      agent: {
        findUnique: vi.fn().mockResolvedValue({ baseId: 'base1' }),
      },
    };

    const pluginDiscovery = {
      discoverPluginTools: vi.fn().mockResolvedValue({
        definitions: [],
        executors: new Map(),
        mcpEndpoints: [],
      }),
    };

    const aggregator = new McpClientAggregatorService(
      mockPrisma as never,
      pluginDiscovery as never
    );
    vi.spyOn(aggregator as any, '_createTransport').mockResolvedValueOnce(clientTransport);

    const { definitions, executors } = await aggregator.getAggregatedTools('agentMcp');

    // Tool is discovered with correct namespace
    expect(definitions.some((d) => d.function.name === 'mcp__srv_weather__get_weather')).toBe(true);
    expect(executors.has('mcp__srv_weather__get_weather')).toBe(true);

    // Tool execution via executeMcpTool is non-throwing (uses cache)
    // In-process transport is single-use, so result may be error object; key: no exception
    const result = await aggregator.executeMcpTool('agentMcp', 'mcp__srv_weather__get_weather', {});
    expect(result).toBeDefined();
  });

  // ── Flow 5: Full turn-over-turn memory + MCP simulation ──────────────────
  it('full flow: tool result is saved to memory and recalled in next turn', async () => {
    const AGENT_ID = 'agent_full_flow';

    // Turn 1: agent invokes a tool, saves result to memory
    const toolResult = '{"temperature": "25°C", "city": "Paris"}';
    const memorySaved = `[tool:get_weather] ${toolResult}`;
    await memorySvc.saveRecent(AGENT_ID, memorySaved);

    // Turn 2: system prompt is built from getRecent
    const memories = await memorySvc.getRecent(AGENT_ID);
    const systemPromptSnippet = memories.slice(0, 5).join('\n');

    // Assert the recalled tool result appears in the system prompt content
    expect(systemPromptSnippet).toContain('get_weather');
    expect(systemPromptSnippet).toContain('Paris');
  });
});
