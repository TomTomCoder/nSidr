/**
 * plugin-mcp-discovery.service.ts
 *
 * Discovers MCP capabilities declared by installed plugins and feeds them
 * into the McpClientAggregatorService so they appear to the agent.
 *
 * Two capability modes:
 *   1. toolManifest (Json[]): Inline tool definitions. Executor calls the
 *      plugin's HTTP endpoint POST {url}/api/mcp/tool with HMAC-SHA256 auth.
 *      Falls back to echo stub when plugin has no url set.
 *   2. mcpUrl (String): Plugin runs a real MCP server. Discovery returns an
 *      mcpEndpoints[] list; the aggregator calls _connectAndList on each.
 *
 * Security (T-17-07, T-17-08):
 *   - Only plugins installed in the agent's base (PluginInstall.baseId) are
 *     considered. Installs are fetched from the DB — never from client input.
 *   - mcpUrl is taken from the stored Plugin record, never from request body.
 *
 * Security (T-19-03):
 *   - Extension plugins (isExtension=true) are skipped unless consentedAt is
 *     non-null (space manager has consented to the extension's scopes).
 *
 * UI-only plugins (no mcpUrl, no toolManifest) contribute nothing → no-op.
 */

import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { BaseConfig, type IBaseConfig } from '../../../configs/base.config';
import { mcpToolToDefinition } from './mcp-tool-adapter';
import type { ToolDefinition } from './mcp-tool-adapter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PluginMcpEndpoint {
  /** Stable server ID used for namespacing: plugin_{pluginId} */
  serverId: string;
  /** The URL of the plugin's MCP server (from DB; never client-supplied). */
  url: string;
}

export interface DiscoveredPluginTools {
  /** Adapted ToolDefinition[] for inline manifest tools, ready to merge. */
  definitions: ToolDefinition[];
  /** Executor map for inline manifest tools (namespaced name → executor). */
  executors: Map<string, (input: Record<string, unknown>) => Promise<unknown>>;
  /** MCP server endpoints from plugins that declare mcpUrl. */
  mcpEndpoints: PluginMcpEndpoint[];
}

/** Minimal shape of an inline tool manifest entry (matches McpToolDescriptor). */
interface ManifestTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PluginMcpDiscoveryService {
  private readonly logger = new Logger(PluginMcpDiscoveryService.name);

  constructor(
    private readonly prismaService: PrismaService,
    @BaseConfig() private readonly baseConfig: IBaseConfig
  ) {}

  /**
   * Discover all MCP-capable plugins installed in the given base.
   *
   * @param _agentId - The agent requesting discovery (reserved for future
   *                   agent-level filtering; unused in Wave 2).
   * @param baseId   - The base whose installed plugins are scanned.
   */
  async discoverPluginTools(_agentId: string, baseId: string): Promise<DiscoveredPluginTools> {
    // Fetch installed plugins for this base, joining their plugin record
    // to read mcpUrl + toolManifest. T-17-07: scoped to baseId (DB-side).
    // T-19-03: Skip extension plugins that have not been consented yet.
    const installs = await this.prismaService.pluginInstall.findMany({
      where: {
        baseId,
        plugin: {
          OR: [{ isExtension: false }, { isExtension: true, consentedAt: { not: null } }],
        },
      },
      select: {
        pluginId: true,
        plugin: {
          select: {
            id: true,
            url: true,
            secret: true,
            mcpUrl: true,
            toolManifest: true,
          },
        },
      },
    });

    const definitions: ToolDefinition[] = [];
    const executors = new Map<string, (input: Record<string, unknown>) => Promise<unknown>>();
    const mcpEndpoints: PluginMcpEndpoint[] = [];

    for (const install of installs) {
      const plugin = install.plugin;
      if (!plugin) continue;

      const { id: pluginId, url: pluginUrl, secret: pluginSecret, mcpUrl, toolManifest } = plugin;

      // Namespace prefix for this plugin's tools
      const serverId = `plugin_${pluginId}`;

      // --- Mode 1: inline toolManifest ---
      if (toolManifest) {
        let tools: ManifestTool[];
        try {
          tools = Array.isArray(toolManifest)
            ? (toolManifest as unknown as ManifestTool[])
            : (JSON.parse(toolManifest as unknown as string) as ManifestTool[]);
        } catch (err) {
          this.logger.warn(
            `Plugin ${pluginId} has an invalid toolManifest (skipping): ${(err as Error).message}`
          );
          tools = [];
        }

        for (const tool of tools) {
          if (!tool.name) continue;

          const def = mcpToolToDefinition(serverId, {
            name: tool.name,
            description: tool.description,
            inputSchema: {
              type: 'object',
              properties: tool.inputSchema?.properties ?? {},
              required: tool.inputSchema?.required ?? [],
            },
          });
          definitions.push(def);

          const toolName = tool.name;
          const namespacedName = def.function.name;
          const resolvedUrl = pluginUrl ? this._resolvePluginUrl(pluginUrl) : null;
          const executor = resolvedUrl
            ? this._buildHttpExecutor(namespacedName, toolName, resolvedUrl, pluginSecret)
            : this._buildStubExecutor(namespacedName, toolName, pluginId);
          executors.set(namespacedName, executor);
        }
      }

      // --- Mode 2: mcpUrl (real MCP server) ---
      // T-17-08: mcpUrl is taken from the stored Plugin record, never client-supplied.
      if (mcpUrl) {
        mcpEndpoints.push({ serverId, url: mcpUrl });
        this.logger.debug(
          `Plugin ${pluginId} declares MCP server at ${mcpUrl} (serverId=${serverId})`
        );
      }

      // No mcpUrl AND no toolManifest → UI-only plugin, no-op (contributes nothing).
    }

    this.logger.debug(
      `Discovered ${definitions.length} inline tool(s) + ${mcpEndpoints.length} MCP endpoint(s) from installed plugins in base ${baseId}`
    );

    return { definitions, executors, mcpEndpoints };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Resolve a plugin URL: relative paths are prefixed with PUBLIC_ORIGIN. */
  private _resolvePluginUrl(pluginUrl: string): string {
    if (pluginUrl.startsWith('http://') || pluginUrl.startsWith('https://')) {
      return pluginUrl.replace(/\/$/, '');
    }
    const origin = (this.baseConfig.publicOrigin ?? '').replace(/\/$/, '');
    return origin + pluginUrl;
  }

  /**
   * Build a real HTTP executor that POSTs to {resolvedUrl}/api/mcp/tool.
   * Request body: { tool, input }
   * Auth header: X-Teable-Signature: sha256=<hmac-sha256(secret, body)>
   */
  private _buildHttpExecutor(
    namespacedName: string,
    toolName: string,
    resolvedUrl: string,
    secret: string
  ) {
    return async (input: Record<string, unknown>) => {
      const endpoint = `${resolvedUrl}/api/mcp/tool`;
      const body = JSON.stringify({ tool: toolName, input });
      const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

      this.logger.debug(`Calling plugin tool ${namespacedName} at ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Teable-Signature': signature,
        },
        body,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        this.logger.warn(
          `Plugin tool ${namespacedName} returned HTTP ${response.status}: ${errText}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Plugin call failed (${response.status})`,
                tool: toolName,
              }),
            },
          ],
        };
      }

      const json = (await response.json()) as { content?: unknown[] };
      // Accept MCP-shaped responses ({ content: [] }) or plain objects.
      if (json.content && Array.isArray(json.content)) {
        return json;
      }
      return { content: [{ type: 'text', text: JSON.stringify(json) }] };
    };
  }

  /** Fallback stub executor for plugins without a url (Wave 2 behaviour). */
  private _buildStubExecutor(namespacedName: string, toolName: string, pluginId: string) {
    return async (input: Record<string, unknown>) => {
      this.logger.debug(`Stub executor for ${namespacedName} (plugin ${pluginId} has no url)`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ tool: toolName, pluginId, input }),
          },
        ],
      };
    };
  }
}
