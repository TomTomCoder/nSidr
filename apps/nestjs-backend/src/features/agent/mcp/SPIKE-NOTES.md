# MCP SDK Spike Notes — Wave 0

**Date:** 2026-06-05
**Plan:** 17-00

---

## Pinned SDK Version

```
@modelcontextprotocol/sdk@1.29.0
```

Installed in `apps/nestjs-backend` workspace. Pinned to **exact version** (no `^`) in
`apps/nestjs-backend/package.json`. Wave 1 builds against this exact pin.

## AI SDK Confirmation

`ai@6.0.169` (the backend's AI runtime) has **NO MCP client** export — `grep "mcp\|MCP"
dist/index.d.ts` returns 0 matches. `experimental_createMCPClient` does NOT exist in this
version. Therefore the agent's MCP client MUST use the SDK `Client` directly (see below).

---

## Transport Decision: StreamableHTTP (in-process)

**Chosen:** `StreamableHTTPServerTransport` + `StreamableHTTPClientTransport` from the SDK.

**Rationale:**

- Memory-constrained box (~4 GB free) — stdio requires spawning child processes which increases
  RSS. StreamableHTTP keeps MCP sessions in-process behind the existing NestJS HTTP listener.
- No long-lived child process per plugin — plugins expose HTTP endpoints; the agent's MCP client
  connects via HTTP rather than managing stdio pipes.
- Matches the Phase 19 extension model (OpenClaw/ClawHub) where plugins are remote HTTP services.
- For the internal Teable MCP server (exposing built-in tools), we mount it on a NestJS sub-route
  (`/mcp`) so the existing Express server handles transport natively.
- BOOT-OOM-INVESTIGATION.md mandates keeping heavy work off the API hot path — StreamableHTTP
  allows the MCP server to live in the same process but serve requests lazily (no background threads).

**Alternative considered:** stdio — rejected because it requires subprocess management and adds
RSS overhead on a memory-constrained box.

---

## SDK Import Subpaths

The SDK ships these subpath exports (verified from `package.json#exports`):

| Symbol                          | Import path                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `Server`                        | `@modelcontextprotocol/sdk/server`                                            |
| `Client`                        | `@modelcontextprotocol/sdk/client`                                            |
| `StreamableHTTPServerTransport` | `@modelcontextprotocol/sdk/server` (re-exported from `server/streamableHttp`) |
| `StreamableHTTPClientTransport` | `@modelcontextprotocol/sdk/client` (re-exported from `client/streamableHttp`) |
| `InMemoryTransport`             | `@modelcontextprotocol/sdk` (root — for in-process spike tests)               |

Concrete verified imports (TypeScript):

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
```

For unit tests the `InMemoryTransport` pair is used (no HTTP server needed).

---

## Adapter Contract (pinned for Wave 1)

### Tool Name Prefix Scheme

To avoid collisions between built-in tools and MCP tools, all MCP-sourced tools are namespaced:

```
mcp__{serverId}__{originalToolName}
```

Examples:

- `mcp__github__create_issue`
- `mcp__internal__search_records`

The double-underscore delimiter was chosen because tool names typically use `_` as a word
separator. Wave 1 must use this exact scheme when registering tools.

### Function Signatures (exported from `mcp-tool-adapter.ts`)

```ts
// Convert one MCP tool descriptor to a ToolDefinition (the shape AgentToolRegistryService expects)
function mcpToolToDefinition(serverId: string, mcpTool: McpToolDescriptor): ToolDefinition;

// Create an executor closure for a single MCP tool
function makeMcpExecutor(
  client: Client,
  serverId: string,
  originalName: string
): (input: Record<string, unknown>) => Promise<unknown>;
```

### ToolDefinition Shape (verbatim from agent-tool-registry.service.ts:4)

```ts
interface ToolDefinition {
  type: "function";
  function: {
    name: string; // mcp__{serverId}__{originalName}
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}
```

The adapter emits this **exact** nested shape. D-02 in 17-CONTEXT assumed a flat shape — that
was wrong. Wave 1 plans must use the nested shape above.

---

## Live-Verify Status

**Best-effort boot deferred** — app stack not booted to preserve ~4 GB memory budget.
Manual verification command (run after `pnpm dev:separated` is stable):

```bash
# From repo root — boots web :3000 + API :3002
pnpm dev:separated

# Trigger a built-in tool call via the agent UI or:
# POST http://localhost:3002/api/agent/{agentId}/chat with a prompt that triggers search_records
# Confirm response includes tool-call trace
```

Unit test (Task 2) covers the adapter shape exhaustively and is the automated gate. The
live-verify is tracked as `human_needed` in SUMMARY.md.
