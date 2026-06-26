import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocSearchService, type DocSearchResult, type DocSearchScope } from './search.service';

const r = (chunkId: string): DocSearchResult => ({
  chunkId,
  docId: 'd',
  docTitle: 't',
  chunkContent: chunkId,
  score: 0, // raw score is irrelevant to RRF — only rank matters
});

describe('DocSearchService.hybridSearch (Reciprocal Rank Fusion)', () => {
  let service: DocSearchService;

  beforeEach(() => {
    service = new DocSearchService({} as never, {} as never);
  });

  it('ranks a chunk found in BOTH lists above chunks found in only one', async () => {
    // semantic: [A, B, C]   keyword: [B, D, E]   → B appears in both, should win.
    vi.spyOn(service, 'semanticSearch').mockResolvedValue([r('A'), r('B'), r('C')]);
    vi.spyOn(service, 'keywordSearch').mockResolvedValue([r('B'), r('D'), r('E')]);

    const out = await service.hybridSearch('space', 'q', 10);
    expect(out[0].chunkId).toBe('B');

    // B's score = 1/(60+2) + 1/(60+1); A's score = 1/(60+1). B must exceed A.
    const a = out.find((x) => x.chunkId === 'A')!;
    const b = out.find((x) => x.chunkId === 'B')!;
    expect(b.score).toBeGreaterThan(a.score);
  });

  it('uses rank, not raw score (scale-free): rank-1 in each list dominates', async () => {
    // Give the keyword top hit a tiny raw score and the semantic a huge one — RRF ignores both.
    vi.spyOn(service, 'semanticSearch').mockResolvedValue([{ ...r('X'), score: 999 }]);
    vi.spyOn(service, 'keywordSearch').mockResolvedValue([{ ...r('Y'), score: 0.0001 }]);

    const out = await service.hybridSearch('space', 'q', 10);
    // Both are rank-1 in their list → equal RRF score 1/(60+1); neither's raw score matters.
    expect(out).toHaveLength(2);
    expect(out[0].score).toBeCloseTo(1 / 61, 10);
    expect(out[1].score).toBeCloseTo(1 / 61, 10);
  });

  it('respects the limit', async () => {
    vi.spyOn(service, 'semanticSearch').mockResolvedValue([r('A'), r('B'), r('C')]);
    vi.spyOn(service, 'keywordSearch').mockResolvedValue([r('D'), r('E'), r('F')]);
    const out = await service.hybridSearch('space', 'q', 2);
    expect(out).toHaveLength(2);
  });

  it('passes scope through to semanticSearch and keywordSearch', async () => {
    const semSpy = vi.spyOn(service, 'semanticSearch').mockResolvedValue([r('A')]);
    const kwSpy = vi.spyOn(service, 'keywordSearch').mockResolvedValue([r('A')]);

    const scope: DocSearchScope = { docIds: ['doc-1', 'doc-2'] };
    await service.hybridSearch('space', 'q', 5, scope);

    expect(semSpy).toHaveBeenCalledWith('space', 'q', 5, scope);
    expect(kwSpy).toHaveBeenCalledWith('space', 'q', 5, scope);
  });

  it('passes no scope when scope is undefined (backward-compatible)', async () => {
    const semSpy = vi.spyOn(service, 'semanticSearch').mockResolvedValue([]);
    const kwSpy = vi.spyOn(service, 'keywordSearch').mockResolvedValue([]);

    await service.hybridSearch('space', 'q');

    expect(semSpy).toHaveBeenCalledWith('space', 'q', 10, undefined);
    expect(kwSpy).toHaveBeenCalledWith('space', 'q', 10, undefined);
  });
});

describe('DocSearchService.hybridSearch external (Qdrant) merge', () => {
  // ExternalConnectionService stub: list() returns enabled qdrant connections.
  const makeExt = (connections: unknown[]) =>
    ({ list: vi.fn().mockResolvedValue(connections) }) as never;

  // EmbeddingService stub: deterministic embedding for the query.
  const makeEmbedding = () =>
    ({ generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]) }) as never;

  it('behaves exactly as before (two lists) when no enabled qdrant connection exists', async () => {
    const ext = makeExt([]); // none
    const service = new DocSearchService({} as never, makeEmbedding(), ext);

    vi.spyOn(service, 'semanticSearch').mockResolvedValue([r('A'), r('B')]);
    vi.spyOn(service, 'keywordSearch').mockResolvedValue([r('B'), r('C')]);
    const extSpy = vi.spyOn(
      service as unknown as { externalSearch: () => Promise<DocSearchResult[]> },
      'externalSearch'
    );

    const out = await service.hybridSearch('space', 'q', 10);
    // B in both internal lists wins; external never contributes.
    expect(out[0].chunkId).toBe('B');
    expect(extSpy).not.toHaveBeenCalled();
  });

  it('fuses external hits as a THIRD list, raising a shared item rank', async () => {
    const ext = makeExt([{ id: 'c1', type: 'qdrant', enabled: true, config: { url: 'http://q' } }]);
    const service = new DocSearchService({} as never, makeEmbedding(), ext);

    // A is rank-1 semantic only. With external also ranking A first, A must beat B.
    vi.spyOn(service, 'semanticSearch').mockResolvedValue([r('A'), r('B')]);
    vi.spyOn(service, 'keywordSearch').mockResolvedValue([r('B')]);
    vi.spyOn(
      service as unknown as { externalSearch: () => Promise<DocSearchResult[]> },
      'externalSearch'
    ).mockResolvedValue([r('A')]);

    const out = await service.hybridSearch('space', 'q', 10);
    const a = out.find((x) => x.chunkId === 'A')!;
    const b = out.find((x) => x.chunkId === 'B')!;
    // A: 1/(60+1) semantic + 1/(60+1) external; B: 1/(60+2) semantic + 1/(60+1) keyword.
    expect(a.score).toBeGreaterThan(b.score);
    expect(out[0].chunkId).toBe('A');
  });

  it('degrades to internal-only when the external connector throws', async () => {
    const ext = makeExt([{ id: 'c1', type: 'qdrant', enabled: true, config: { url: 'http://q' } }]);
    const service = new DocSearchService({} as never, makeEmbedding(), ext);

    vi.spyOn(service, 'semanticSearch').mockResolvedValue([r('A')]);
    vi.spyOn(service, 'keywordSearch').mockResolvedValue([r('A')]);
    vi.spyOn(
      service as unknown as { externalSearch: () => Promise<DocSearchResult[]> },
      'externalSearch'
    ).mockRejectedValue(new Error('qdrant down'));

    // Must not throw; returns internal-only results.
    const out = await service.hybridSearch('space', 'q', 10);
    expect(out).toHaveLength(1);
    expect(out[0].chunkId).toBe('A');
  });
});
