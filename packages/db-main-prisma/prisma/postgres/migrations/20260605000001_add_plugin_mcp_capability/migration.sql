-- Migration: 20260605000001_add_plugin_mcp_capability
-- Purpose: Add optional MCP capability fields to the Plugin model.
--
-- mcpUrl        — URL of the plugin's MCP server endpoint (null for UI-only plugins).
-- tool_manifest — Inline JSON array of McpToolDescriptor objects (null for UI-only plugins).
--
-- Both columns are nullable so that all existing Plugin rows are unaffected (no-op).
-- T-17-07/T-17-08: only rows stored in this table are honored by PluginMcpDiscoveryService.

ALTER TABLE "plugin" ADD COLUMN "mcp_url" TEXT;
ALTER TABLE "plugin" ADD COLUMN "tool_manifest" JSONB;
