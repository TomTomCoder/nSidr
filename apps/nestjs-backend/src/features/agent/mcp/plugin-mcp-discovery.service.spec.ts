/**
 * plugin-mcp-discovery.service.spec.ts
 *
 * TDD spec for PluginMcpDiscoveryService (17-03 Wave 2 RED gate).
 *
 * Tests:
 *   1. A plugin with mcpUrl has its tool surfaced via getAggregatedTools
 *   2. A plugin with inline toolManifest surfaces tool definitions (no HTTP)
 *   3. A UI-only plugin (no mcpUrl, no toolManifest) contributes nothing
 *   4. Plugin tools are namespaced as mcp__plugin_{pluginId}__{toolName}
 *   5. A manifest tool is executable via the returned executor map
 *
 * Design: PluginMcpDiscoveryService is injected into McpClientAggregatorService.
 * The aggregator calls discoverPluginTools(agentId) and merges the result into
 * getAggregatedTools(). The discovery service can be tested independently.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// The service under test. Will fail (RED) because the file does not yet exist.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PluginMcpDiscoveryService } = await import('./plugin-mcp-discovery.service').catch(() => ({
  PluginMcpDiscoveryService: undefined,
}));

// ---------------------------------------------------------------------------
// Inline manifest shape used by tests
// ---------------------------------------------------------------------------
interface McpManifestTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePluginInstall(opts: {
  pluginId: string;
  mcpUrl?: string | null;
  toolManifest?: McpManifestTool[] | null;
}) {
  return {
    pluginId: opts.pluginId,
    plugin: {
      id: opts.pluginId,
      mcpUrl: opts.mcpUrl ?? null,
      toolManifest: opts.toolManifest ?? null,
    },
  };
}

function buildPrismaStub(installs: ReturnType<typeof makePluginInstall>[]) {
  return {
    pluginInstall: {
      findMany: vi.fn().mockResolvedValue(installs),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PluginMcpDiscoveryService', () => {
  // Sanity: the module must export the service class
  it('exports PluginMcpDiscoveryService', () => {
    expect(PluginMcpDiscoveryService).toBeDefined();
  });

  describe('discoverPluginTools', () => {
    it('returns empty result when no plugins are installed', async () => {
      const prisma = buildPrismaStub([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svc = new (PluginMcpDiscoveryService as any)(prisma);
      const result = await svc.discoverPluginTools('agent-1', 'base-1');
      expect(result.definitions).toHaveLength(0);
      expect(result.executors.size).toBe(0);
    });

    it('returns empty result for a UI-only plugin (no mcpUrl, no toolManifest)', async () => {
      const prisma = buildPrismaStub([makePluginInstall({ pluginId: 'plugin-ui-1' })]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svc = new (PluginMcpDiscoveryService as any)(prisma);
      const result = await svc.discoverPluginTools('agent-1', 'base-1');
      expect(result.definitions).toHaveLength(0);
      expect(result.executors.size).toBe(0);
    });

    it('surfaces inline toolManifest tools with correct namespace', async () => {
      const toolManifest: McpManifestTool[] = [
        {
          name: 'greet',
          description: 'Say hello',
          inputSchema: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
        },
      ];
      const prisma = buildPrismaStub([makePluginInstall({ pluginId: 'plugin-42', toolManifest })]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svc = new (PluginMcpDiscoveryService as any)(prisma);
      const result = await svc.discoverPluginTools('agent-1', 'base-1');

      expect(result.definitions).toHaveLength(1);
      const def = result.definitions[0];
      // Namespace: mcp__plugin_{pluginId}__{toolName}
      expect(def.function.name).toBe('mcp__plugin_plugin-42__greet');
      expect(def.function.description).toBe('Say hello');
      expect(def.function.parameters.properties).toEqual({ name: { type: 'string' } });
      expect(def.function.parameters.required).toEqual(['name']);
    });

    it('surfaces a toolManifest tool with an executable executor', async () => {
      const toolManifest: McpManifestTool[] = [
        {
          name: 'echo',
          description: 'Echo input',
          inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
        },
      ];
      const prisma = buildPrismaStub([
        makePluginInstall({ pluginId: 'plugin-echo', toolManifest }),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svc = new (PluginMcpDiscoveryService as any)(prisma);
      const result = await svc.discoverPluginTools('agent-1', 'base-1');

      const executor = result.executors.get('mcp__plugin_plugin-echo__echo');
      expect(executor).toBeDefined();
      // Inline manifest executors return a structured response containing the input
      const output = await executor!({ text: 'hello' });
      expect(output).toBeDefined();
    });

    it('handles a plugin with mcpUrl by registering an mcpUrl entry', async () => {
      const prisma = buildPrismaStub([
        makePluginInstall({
          pluginId: 'plugin-mcp-server',
          mcpUrl: 'http://plugin.example.com/mcp',
        }),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svc = new (PluginMcpDiscoveryService as any)(prisma);
      const result = await svc.discoverPluginTools('agent-1', 'base-1');
      // mcpUrl plugins expose mcpEndpoints for the aggregator to connect to
      expect(result.mcpEndpoints).toBeDefined();
      expect(result.mcpEndpoints).toHaveLength(1);
      expect(result.mcpEndpoints[0]).toEqual({
        serverId: 'plugin_plugin-mcp-server',
        url: 'http://plugin.example.com/mcp',
      });
    });

    it('prisma query is scoped to the correct baseId', async () => {
      const prisma = buildPrismaStub([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svc = new (PluginMcpDiscoveryService as any)(prisma);
      await svc.discoverPluginTools('agent-1', 'base-99');
      expect(prisma.pluginInstall.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ baseId: 'base-99' }),
        })
      );
    });
  });
});
