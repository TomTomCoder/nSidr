/**
 * agent-knowledge-scope.integration.spec.ts
 *
 * Deterministic in-process integration spec for the `search_knowledge_base`
 * scope wiring (D-17.1-03, closes phase-17 bug-5 / scope-test).
 *
 * The actual wiring bug — AgentExecutionService.executeTool stripping
 * `agent.knowledgeSources` before delegating to executeToolCall — was fixed in
 * commit 00450e8b5. This spec is the regression guard.
 *
 * What we test (NOT embedding ranking — that's non-deterministic and burns
 * API credits; that test is deferred to live UAT):
 *   1. scope.docIds   flows through when knowledgeSources = {docIds:[A]}
 *   2. scope.folderIds flows through when knowledgeSources = {folderIds:[F]}
 *   3. Both flow through when knowledgeSources = {docIds:[A], folderIds:[F]}
 *   4. scope === undefined (NOT empty {}) when knowledgeSources = null
 *   5. Out-of-scope doc B is never in returned results (case-1 + case-2 + case-3)
 *
 * Pattern mirrors agent-mcp-flow.integration.spec.ts — no NestJS boot, no DB.
 * VALUE imports for any Nest @Injectable per Phase 17 bug-1 lesson.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
// VALUE imports — these are Nest @Injectable classes; never `import type`.
import { AgentExecutionService } from '../agent-execution.service';

// ---------------------------------------------------------------------------
// Fixtures: imported_doc + doc_chunk rows
// ---------------------------------------------------------------------------

type Chunk = {
  chunkId: string;
  docId: string;
  docTitle: string;
  chunkContent: string;
  score: number;
};

const ALL_CHUNKS: Chunk[] = [
  // doc A (in scope for cases 1, 3)
  { chunkId: 'c_a1', docId: 'docA', docTitle: 'Doc A', chunkContent: 'a1', score: 0.9 },
  { chunkId: 'c_a2', docId: 'docA', docTitle: 'Doc A', chunkContent: 'a2', score: 0.8 },
  // doc B (OUT of scope — must never leak)
  { chunkId: 'c_b1', docId: 'docB', docTitle: 'Doc B', chunkContent: 'b1', score: 0.95 },
  { chunkId: 'c_b2', docId: 'docB', docTitle: 'Doc B', chunkContent: 'b2', score: 0.7 },
  // doc in folder F (in scope for cases 2, 3)
  {
    chunkId: 'c_f1',
    docId: 'docInFolder',
    docTitle: 'Doc F',
    chunkContent: 'f1',
    score: 0.85,
  },
];

// Mapping from docId → folderId (matches the prisma schema FK semantics)
const DOC_FOLDER: Record<string, string | null> = {
  docA: null,
  docB: null,
  docInFolder: 'folderF',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a hybridSearch spy that filters ALL_CHUNKS by the scope argument so
 * case 5 (out-of-scope doc B never leaks) is enforced at the fake-service level.
 * The scope is the 4th positional argument: hybridSearch(spaceId, query, limit, scope).
 */
function buildHybridSearchSpy() {
  return vi.fn(
    async (
      _spaceId: string,
      _query: string,
      limit: number,
      scope?: { docIds?: string[]; folderIds?: string[] }
    ): Promise<Chunk[]> => {
      let results = ALL_CHUNKS.slice();
      if (scope) {
        results = results.filter((c) => {
          const docMatch = scope.docIds?.includes(c.docId) ?? false;
          const folderMatch =
            scope.folderIds && DOC_FOLDER[c.docId]
              ? scope.folderIds.includes(DOC_FOLDER[c.docId] as string)
              : false;
          return docMatch || folderMatch;
        });
      }
      // Sort by score descending and cap to limit
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, limit);
    }
  );
}

/**
 * Construct an AgentExecutionService with only the dependencies the
 * `search_knowledge_base` branch needs, all stubbed.
 *
 * Per the executeTool path:
 *   - prismaService.agent.findUnique  → returns the agent with knowledgeSources
 *   - prismaService.base.findUnique   → returns {spaceId}
 *   - docSearchService.hybridSearch   → our spy
 */
function buildService(
  agentKnowledgeSources: unknown,
  hybridSearchSpy: ReturnType<typeof buildHybridSearchSpy>
): AgentExecutionService {
  const prismaService = {
    agent: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'agt1',
        baseId: 'base1',
        knowledgeSources: agentKnowledgeSources,
      }),
    },
    base: {
      findUnique: vi.fn().mockResolvedValue({ spaceId: 'spc1' }),
    },
  };

  const docSearchService = { hybridSearch: hybridSearchSpy };

  // Use `as never` for unused dependencies — mirrors agent-mcp-flow.integration.spec.ts
  // pattern (only stub what the code path under test reads).
  const svc = new AgentExecutionService(
    {} as never, // agentService
    {} as never, // toolRegistry
    {} as never, // memoryService
    {} as never, // planner
    {} as never, // conversationService
    {} as never, // aiService
    {} as never, // promptService
    prismaService as never,
    {} as never, // dataPrismaService
    {} as never, // recordOpenApiService
    {} as never, // gmailOAuthService
    {} as never, // slackOAuthService
    {} as never, // slackClient
    {} as never, // gitHubOAuthService
    {} as never, // gitHubClient
    {} as never, // httpService
    {} as never, // mcpAggregator
    docSearchService as never,
    {} as never, // knowledgeDocService (Phase 21)
    {} as never, // docLinkService (Phase 21)
    {} as never, // workflowService (Phase 22-03)
    {} as never, // workflowExecutorService (Phase 22-03)
    {} as never, // tableOpenApiService
    {} as never, // fieldOpenApiService
    {} as never, // viewOpenApiService
    {} as never, // appBuilderService
    {} as never // guardrailService
  );

  return svc;
}

const RUN_CTX = { agentId: 'agt1', trigger: 'mcp' as const, userId: 'usr1' };
const AGENT_CTX = { id: 'agt1', baseId: 'base1' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Agent knowledge scope — search_knowledge_base wiring (D-17.1-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes scope.docIds when agent.knowledgeSources = { docIds: [A] }', async () => {
    const spy = buildHybridSearchSpy();
    const svc = buildService({ docIds: ['docA'] }, spy);

    const result = (await svc.executeTool(
      { name: 'search_knowledge_base', input: { query: 'anything', limit: 5 } },
      AGENT_CTX,
      RUN_CTX
    )) as { results: Array<{ docId: string }>; count: number; scoped: boolean };

    expect(spy).toHaveBeenCalledTimes(1);
    const scopeArg = spy.mock.calls[0][3];
    expect(scopeArg).toEqual({ docIds: ['docA'], folderIds: undefined });

    // Case 5 partial: out-of-scope doc B must NOT appear
    expect(result.results.every((r) => r.docId !== 'docB')).toBe(true);
    expect(result.results.map((r) => r.docId)).toEqual(['docA', 'docA']);
    expect(result.scoped).toBe(true);
  });

  it('passes scope.folderIds when agent.knowledgeSources = { folderIds: [F] }', async () => {
    const spy = buildHybridSearchSpy();
    const svc = buildService({ folderIds: ['folderF'] }, spy);

    const result = (await svc.executeTool(
      { name: 'search_knowledge_base', input: { query: 'anything', limit: 5 } },
      AGENT_CTX,
      RUN_CTX
    )) as { results: Array<{ docId: string }>; scoped: boolean };

    const scopeArg = spy.mock.calls[0][3];
    expect(scopeArg).toEqual({ docIds: undefined, folderIds: ['folderF'] });

    // Out-of-scope doc B must NOT appear
    expect(result.results.every((r) => r.docId !== 'docB')).toBe(true);
    expect(result.results.map((r) => r.docId)).toEqual(['docInFolder']);
    expect(result.scoped).toBe(true);
  });

  it('passes both docIds and folderIds when both set', async () => {
    const spy = buildHybridSearchSpy();
    const svc = buildService({ docIds: ['docA'], folderIds: ['folderF'] }, spy);

    const result = (await svc.executeTool(
      { name: 'search_knowledge_base', input: { query: 'anything', limit: 5 } },
      AGENT_CTX,
      RUN_CTX
    )) as { results: Array<{ docId: string }>; scoped: boolean };

    const scopeArg = spy.mock.calls[0][3];
    expect(scopeArg).toEqual({ docIds: ['docA'], folderIds: ['folderF'] });

    // Out-of-scope doc B must NOT appear; docA and docInFolder both allowed
    expect(result.results.every((r) => r.docId !== 'docB')).toBe(true);
    const returnedDocIds = result.results.map((r) => r.docId).sort();
    expect(returnedDocIds).toEqual(['docA', 'docA', 'docInFolder']);
    expect(result.scoped).toBe(true);
  });

  it('passes scope=undefined when knowledgeSources = null (backward-compat whole-space search)', async () => {
    const spy = buildHybridSearchSpy();
    const svc = buildService(null, spy);

    const result = (await svc.executeTool(
      { name: 'search_knowledge_base', input: { query: 'anything', limit: 10 } },
      AGENT_CTX,
      RUN_CTX
    )) as { results: Array<{ docId: string }>; scoped: boolean };

    const call = spy.mock.calls[0];
    // CRITICAL: must be undefined, NOT empty object {} — backward-compat contract
    expect(call[3]).toBeUndefined();
    // Whole-space search means all 5 chunks (including out-of-scope doc B) are returned
    expect(result.results.length).toBe(5);
    expect(result.scoped).toBe(false);
  });

  it('passes scope=undefined when knowledgeSources is empty arrays (treated as whole-space)', async () => {
    // Belt-and-braces: knowledgeSources object exists but both arrays are empty —
    // executeToolCall treats this as scope=undefined (per the .length ?? 0 > 0 guard)
    const spy = buildHybridSearchSpy();
    const svc = buildService({ docIds: [], folderIds: [] }, spy);

    await svc.executeTool(
      { name: 'search_knowledge_base', input: { query: 'anything', limit: 5 } },
      AGENT_CTX,
      RUN_CTX
    );

    const call = spy.mock.calls[0];
    expect(call[3]).toBeUndefined();
  });
});
