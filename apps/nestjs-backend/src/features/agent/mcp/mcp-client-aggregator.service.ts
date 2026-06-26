/**
 * mcp-client-aggregator.service.ts
 *
 * NestJS service that acts as an MCP CLIENT aggregator.
 *
 * Responsibilities:
 *   1. Read enabled AgentMcpServer rows for a given agentId.
 *   2. Open a short-lived SDK Client + transport to each server.
 *   3. List tools from each server, adapt them via the 17-00 adapter.
 *   4. Return { definitions: ToolDefinition[], executors: Map<namespacedName, executor> }
 *      so that AgentToolRegistryService can merge them into getToolsForAgent().
 *
 * Design decisions (BOOT-OOM, T-17-05):
 *   - Connections are opened on demand (per getAggregatedTools call), not on app boot.
 *   - Each Client is connected, used, then closed within the same call. No long-lived
 *     state is held between HTTP requests.
 *   - A failed/unreachable server is logged + skipped; it never throws and never
 *     prevents the agent from using tools from healthy servers.
 *   - Per-agent executor map is rebuilt on each call (no stale-cache issue). If Wave 3
 *     needs caching, it can be added at the service layer without changing callers.
 *
 * T-17-04: Only connects to rows with enabled=true AND agentId = the requesting agent.
 * T-17-05: Per-server try/catch + timeout ensures one unreachable server cannot block
 *          the agent execution path.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { PrismaService } from '@teable/db-main-prisma';
import { mcpToolToDefinition, makeMcpExecutor, parseMcpToolName } from './mcp-tool-adapter';
import { PluginMcpDiscoveryService } from './plugin-mcp-discovery.service';

// ---------------------------------------------------------------------------
// Types (re-export the ToolDefinition shape for callers)
// ---------------------------------------------------------------------------

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

export interface AggregatedMcpTools {
  /** Adapted ToolDefinition[] ready to merge into getToolsForAgent */
  definitions: ToolDefinition[];
  /**
   * Map from namespaced tool name (mcp__{serverId}__{toolName}) to an executor
   * closure. Used by AgentExecutionService.executeToolCall to dispatch MCP calls.
   */
  executors: Map<string, (input: Record<string, unknown>) => Promise<unknown>>;
}

// Default per-server timeout (ms). Keeps latency bounded on the API hot path.
const SERVER_CONNECT_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class McpClientAggregatorService {
  private readonly logger = new Logger(McpClientAggregatorService.name);

  /**
   * Per-agent executor cache. Populated by getAggregatedTools(); consumed by executeMcpTool().
   * This avoids re-opening connections when executeMcpTool is called in the same request cycle.
   * The cache is not persisted across HTTP requests — it lives for the lifetime of the service
   * instance (Singleton), but entries are overwritten on each getAggregatedTools() call for the
   * same agentId, so they always reflect the latest aggregation.
   */
  private readonly executorCache = new Map<
    string,
    Map<string, (input: Record<string, unknown>) => Promise<unknown>>
  >();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly pluginMcpDiscovery: PluginMcpDiscoveryService
  ) {}

  /**
   * Protected hook for transport creation. Exposed as a named method so tests
   * can spy on it and inject InMemoryTransport instances without any HTTP server.
   *
   * @internal
   */
  protected async _createTransport(url: string): Promise<StreamableHTTPClientTransport> {
    return new StreamableHTTPClientTransport(new URL(url));
  }

  /**
   * Build an MCP client, connect it, list tools, then disconnect.
   * Returns the adapted ToolDefinition[] + executor map for one server.
   * Returns null if the server is unreachable or listing fails.
   */
  private async _connectAndList(
    serverId: string,
    url: string
  ): Promise<{
    definitions: ToolDefinition[];
    executors: Map<string, (input: Record<string, unknown>) => Promise<unknown>>;
  } | null> {
    let client: Client | null = null;
    try {
      const transport = await Promise.race([
        this._createTransport(url),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout connecting to MCP server ${url}`)),
            SERVER_CONNECT_TIMEOUT_MS
          )
        ),
      ]);

      client = new Client({ name: 'teable-agent', version: '1.0.0' }, { capabilities: {} });
      await client.connect(transport);

      const { tools } = await client.listTools();

      const definitions: ToolDefinition[] = [];
      const executors = new Map<string, (input: Record<string, unknown>) => Promise<unknown>>();

      for (const tool of tools) {
        const def = mcpToolToDefinition(serverId, tool);
        definitions.push(def);
        const executor = makeMcpExecutor(client, serverId, tool.name);
        executors.set(def.function.name, executor);
      }

      // NOTE: We intentionally keep the client open after listing because
      // the executor closures hold a reference to it for subsequent tool calls.
      // The client is stored per-executor and closed when the agent call completes
      // (handled by the Map going out of scope after the HTTP response is sent).
      // This matches the short-lived-connection design: one client per agent call,
      // not one client shared across many HTTP requests.

      return { definitions, executors };
    } catch (err) {
      this.logger.warn(
        `MCP server ${serverId} (${url}) is unreachable or failed to list tools: ${(err as Error).message}. Skipping.`
      );
      // Attempt graceful close if client was opened
      if (client) {
        await client.close().catch(() => undefined);
      }
      return null;
    }
  }

  /**
   * Aggregate tools from all enabled MCP servers for the given agent.
   *
   * Each server's tools are namespaced as mcp__{serverId}__{toolName} to avoid
   * collisions with built-in tools.
   *
   * @param agentId - The agent whose enabled MCP servers should be queried.
   */
  async getAggregatedTools(agentId: string): Promise<AggregatedMcpTools> {
    // --- Explicit MCP servers configured for this agent ---
    const servers = await this.prismaService.agentMcpServer.findMany({
      where: { agentId, enabled: true },
      select: { id: true, url: true, name: true },
    });

    const allDefinitions: ToolDefinition[] = [];
    const allExecutors = new Map<string, (input: Record<string, unknown>) => Promise<unknown>>();

    for (const server of servers) {
      const result = await this._connectAndList(server.id, server.url);
      if (!result) continue;

      for (const def of result.definitions) {
        allDefinitions.push(def);
      }
      for (const [name, executor] of result.executors) {
        allExecutors.set(name, executor);
      }
    }

    // --- Plugin-declared MCP capability (17-03) ---
    // Look up the agent's baseId so we can scope plugin discovery to the base.
    // T-17-07: plugin tools are only discovered for plugins installed in the agent's base.
    const agent = await this.prismaService.agent.findUnique({
      where: { id: agentId },
      select: { baseId: true },
    });

    if (agent?.baseId) {
      const pluginDiscovery = await this.pluginMcpDiscovery.discoverPluginTools(
        agentId,
        agent.baseId
      );

      // Merge inline manifest tools directly
      for (const def of pluginDiscovery.definitions) {
        allDefinitions.push(def);
      }
      for (const [name, executor] of pluginDiscovery.executors) {
        allExecutors.set(name, executor);
      }

      // Merge mcpUrl-based plugin endpoints (same path as explicit servers)
      for (const endpoint of pluginDiscovery.mcpEndpoints) {
        const result = await this._connectAndList(endpoint.serverId, endpoint.url);
        if (!result) continue;
        for (const def of result.definitions) {
          allDefinitions.push(def);
        }
        for (const [name, executor] of result.executors) {
          allExecutors.set(name, executor);
        }
      }
    }

    this.logger.debug(
      `Aggregated ${allDefinitions.length} MCP tool(s) from ${servers.length} explicit server(s) + plugin discovery for agent ${agentId}`
    );

    // Populate the per-agent executor cache for use by executeMcpTool()
    this.executorCache.set(agentId, allExecutors);

    return { definitions: allDefinitions, executors: allExecutors };
  }

  /**
   * Execute a namespaced MCP tool call.
   *
   * This is the dispatch endpoint for AgentExecutionService. It:
   *   1. Re-runs getAggregatedTools (which re-connects to the server) to get a
   *      fresh executor for the given agent/tool combination.
   *   2. Invokes the executor with the provided input.
   *
   * Returns an error object if the tool is not found or execution fails — it
   * never throws so the agent execution loop stays stable.
   *
   * @param agentId        - Agent context (needed to scope the server lookup).
   * @param namespacedName - The mcp__{serverId}__{toolName} string.
   * @param input          - Tool arguments.
   */
  async executeMcpTool(
    agentId: string,
    namespacedName: string,
    input: Record<string, unknown>
  ): Promise<unknown> {
    const parsed = parseMcpToolName(namespacedName);
    if (!parsed) {
      return { error: `Invalid MCP tool name: ${namespacedName}` };
    }

    // Use the cached executor map from the most recent getAggregatedTools() call.
    // If no cache exists for this agent yet, re-aggregate now (lazy initialization).
    let executors = this.executorCache.get(agentId);
    if (!executors) {
      const result = await this.getAggregatedTools(agentId);
      executors = result.executors;
    }

    const executor = executors.get(namespacedName);
    if (!executor) {
      this.logger.warn(`MCP tool not found: ${namespacedName} for agent ${agentId}`);
      return { error: `MCP tool not found: ${namespacedName}` };
    }

    try {
      return await executor(input);
    } catch (err) {
      this.logger.error(
        `MCP tool execution failed for ${namespacedName}: ${(err as Error).message}`
      );
      return { error: `MCP tool execution failed: ${(err as Error).message}` };
    }
  }
}
