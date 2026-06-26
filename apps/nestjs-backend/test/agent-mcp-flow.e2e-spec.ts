/**
 * agent-mcp-flow.e2e-spec.ts
 *
 * NOTE: The in-process integration tests for the agent MCP + memory recall flow live at:
 *   src/features/agent/mcp/agent-mcp-flow.integration.spec.ts
 *
 * They are placed there (not in test/) because:
 *   1. The e2e config's vitest-e2e.setup.ts runs esbuild over the full NestJS app,
 *      which fails on optional peer deps (@nestjs/microservices, @nestjs/platform-socket.io)
 *      in the memory-constrained environment.
 *   2. The tests are in-process (no live DB, no HTTP server) and run correctly with
 *      the standard vitest unit config.
 *
 * LIVE E2E DEFERRED — Manual verification steps:
 *   1. Start the backend: pnpm --filter @teable/nestjs-backend dev:api (port :3002)
 *   2. POST /api/agent/:agentId/run with trigger: "manual", triggerPayload: { text: "My name is Alice" }
 *   3. Note the conversationId in the response or DB.
 *   4. POST /api/agent/:agentId/run with conversationId from step 3
 *   5. Assert the response references "Alice" (memory recall from prior turn)
 *   6. Run pnpm test-unit from apps/nestjs-backend (all 17-06 specs should be green)
 */

import { describe, it } from 'vitest';

describe('agent-mcp-flow e2e (DEFERRED — see integration spec)', () => {
  it('see src/features/agent/mcp/agent-mcp-flow.integration.spec.ts for in-process tests', () => {
    // Canonical in-process tests are in src/ to avoid esbuild setup issues.
    // This file serves as a pointer and live-e2e documentation.
  });
});
