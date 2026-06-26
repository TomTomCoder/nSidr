/**
 * rrf-merge.spec.ts
 *
 * Cross-cutting RRF merge assertion: external-only hits appear in hybridSearch
 * output and a chunk shared across lists sees its rank boosted.
 *
 * Strategy: subclass DocSearchService to override the DB-backed semanticSearch,
 * keywordSearch, and externalSearch with in-memory fakes. The real fuse() math
 * is exercised — only the I/O is mocked.
 *
 * Plan task (b): hybridSearch fuses an external list so an external-only hit
 * appears and a shared hit's rank rises.
 */
import type { DocSearchResult } from '../../doc-search/search.service';
import { DocSearchService } from '../../doc-search/search.service';

// ---------------------------------------------------------------------------
// Minimal fake EmbeddingService — only generateEmbedding is needed
// ---------------------------------------------------------------------------

const fakeEmbeddingService = {
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1) as number[]),
};

// ---------------------------------------------------------------------------
// Fake DocSearchService that surfaces the protected externalSearch override
// and stubs the DB methods.
// ---------------------------------------------------------------------------

class TestableDocSearchService extends DocSearchService {
  private _semantic: DocSearchResult[] = [];
  private _keyword: DocSearchResult[] = [];
  private _externalHits: DocSearchResult[] = [];

  /** Inject the results the fakes should return */
  setResponses(
    semantic: DocSearchResult[],
    keyword: DocSearchResult[],
    external: DocSearchResult[]
  ) {
    this._semantic = semantic;
    this._keyword = keyword;
    this._externalHits = external;
  }

  /** Override DB methods with in-memory responses */
  override async semanticSearch(): Promise<DocSearchResult[]> {
    return this._semantic;
  }

  override async keywordSearch(): Promise<DocSearchResult[]> {
    return this._keyword;
  }

  /** Override external search (protected in DocSearchService — exposed here) */
  protected override async externalSearch(): Promise<DocSearchResult[]> {
    return this._externalHits;
  }
}

// ---------------------------------------------------------------------------
// Helper: build a DocSearchResult
// ---------------------------------------------------------------------------

function result(chunkId: string, score: number, extra?: Partial<DocSearchResult>): DocSearchResult {
  return {
    chunkId,
    docId: extra?.docId ?? `doc-${chunkId}`,
    docTitle: extra?.docTitle ?? `Title ${chunkId}`,
    chunkContent: extra?.chunkContent ?? `Content for ${chunkId}`,
    score,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DocSearchService — RRF external merge cross-cutting', () => {
  let svc: TestableDocSearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Construct with a fake embeddingService so the external search path can run.
    svc = new TestableDocSearchService(null as never, fakeEmbeddingService as never);
  });

  it('external-only hit appears in the fused output', async () => {
    // Internal lists have no shared hit with the external list.
    const internalHit = result('chunk-A', 0.9);
    const externalOnlyHit = result('chunk-EXT', 0.8);

    svc.setResponses([internalHit], [], [externalOnlyHit]);

    // Patch the private listEnabledQdrant so the external path is activated.
    vi.spyOn(svc as any, 'listEnabledQdrant').mockResolvedValue([
      { id: 'conn-1', config: {} },
    ] as never);

    const results = await svc.hybridSearch('space-1', 'test query', 10);

    const chunkIds = results.map((r) => r.chunkId);
    expect(chunkIds).toContain('chunk-EXT');
    expect(chunkIds).toContain('chunk-A');
  });

  it('a chunk in both internal and external lists has a higher RRF score than one in a single list', async () => {
    const sharedHit = result('chunk-SHARED', 0.9);
    const internalOnlyHit = result('chunk-INTERNAL', 0.85);
    const externalOnlyHit = result('chunk-EXT', 0.8);

    // chunk-SHARED appears at rank 0 in both semantic and external lists.
    svc.setResponses([sharedHit, internalOnlyHit], [], [sharedHit, externalOnlyHit]);

    vi.spyOn(svc as any, 'listEnabledQdrant').mockResolvedValue([
      { id: 'conn-1', config: {} },
    ] as never);

    const results = await svc.hybridSearch('space-1', 'test query', 10);

    const sharedResult = results.find((r) => r.chunkId === 'chunk-SHARED');
    const internalOnlyResult = results.find((r) => r.chunkId === 'chunk-INTERNAL');
    const externalOnlyResult = results.find((r) => r.chunkId === 'chunk-EXT');

    expect(sharedResult).toBeDefined();
    expect(internalOnlyResult).toBeDefined();
    expect(externalOnlyResult).toBeDefined();

    // The shared chunk accumulates RRF score from two lists — it should rank higher.
    expect(sharedResult!.score).toBeGreaterThan(internalOnlyResult!.score);
    expect(sharedResult!.score).toBeGreaterThan(externalOnlyResult!.score);
  });

  it('when listEnabledQdrant returns empty, external search is skipped and internal-only results returned', async () => {
    const internalHit = result('chunk-INT', 0.9);
    svc.setResponses([internalHit], [], [result('chunk-EXT', 0.99)]);

    // No external connections → external path should not run.
    vi.spyOn(svc as any, 'listEnabledQdrant').mockResolvedValue([] as never);

    const results = await svc.hybridSearch('space-1', 'test query', 10);
    const chunkIds = results.map((r) => r.chunkId);

    expect(chunkIds).toContain('chunk-INT');
    expect(chunkIds).not.toContain('chunk-EXT');
  });

  it('RRF score is computed as 1/(K+rank+1) summed across lists (K=60)', async () => {
    // Single hit at rank 0 in semantic only.
    // Expected RRF = 1 / (60 + 0 + 1) = 1/61 ≈ 0.01639...
    const hit = result('chunk-Z', 1.0);
    svc.setResponses([hit], [], []);

    vi.spyOn(svc as any, 'listEnabledQdrant').mockResolvedValue([] as never);

    const results = await svc.hybridSearch('space-1', 'q', 10);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBeCloseTo(1 / 61, 5);
  });

  it('results are sorted descending by RRF score and limited', async () => {
    // Three hits in keyword list: rank 0, 1, 2 → scores 1/61, 1/62, 1/63
    const hits = ['ck-0', 'ck-1', 'ck-2'].map((id, i) => result(id, 1 - i * 0.1));
    svc.setResponses([], hits, []);

    vi.spyOn(svc as any, 'listEnabledQdrant').mockResolvedValue([] as never);

    const results = await svc.hybridSearch('space-1', 'q', 2); // limit=2
    expect(results).toHaveLength(2);
    expect(results[0].chunkId).toBe('ck-0');
    expect(results[1].chunkId).toBe('ck-1');
    // Scores descending
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
});
