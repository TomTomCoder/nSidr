import { Injectable, BadRequestException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { ExternalConnectionService } from '../external-connection/external-connection.service';
import { QdrantConnectorService } from '../external-connection/qdrant/qdrant-connector.service';
import { EmbeddingService } from './embedding.service';
import { Prisma } from '@teable/db-main-prisma';

/**
 * Optional KG-03 traversal options (D-21-03). When omitted or
 * `traverseLinks!==true`, hybridSearch behaves identically to today —
 * backward-compat for Phase 17.1 / 17.5 callers.
 */
export interface DocSearchOptions {
  traverseLinks?: boolean;
  maxHops?: number;
}

export interface DocSearchResult {
  chunkId: string;
  docId: string;
  docTitle: string;
  chunkContent: string;
  score: number;
}

/** Phase 2 — a memory-graph entity hit from entitySearch. */
export interface MemoryEntityResult {
  id: string;
  name: string;
  type: string;
  summary: string;
  score: number;
}

/**
 * Optional scope to restrict doc search to a subset of the space's knowledge base.
 * When absent (or empty), the search covers all indexed docs in the space.
 * T-17-12/T-17-13: scope is applied as parameterized SQL — never string-interpolated.
 */
export interface DocSearchScope {
  docIds?: string[];
  folderIds?: string[];
}

@Injectable()
export class DocSearchService {
  private readonly logger = new Logger(DocSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    // Optional so Phase 17 callers / unit tests that construct DocSearchService
    // without the external-connection stack keep working (internal-only path).
    @Optional()
    private readonly externalConnectionService?: ExternalConnectionService
  ) {}

  /**
   * Build a parameterized scope filter fragment.
   * Returns a Prisma.Sql fragment (e.g. `AND (d."docId" IN (...) OR d."folderId" IN (...))`)
   * or an empty fragment when scope is absent / empty (backward-compatible).
   *
   * T-17-12 / T-17-13: IDs are passed as Prisma parameters — never string-interpolated.
   */
  private buildScopeFilter(scope?: DocSearchScope): Prisma.Sql {
    const hasDocIds = (scope?.docIds?.length ?? 0) > 0;
    const hasFolderIds = (scope?.folderIds?.length ?? 0) > 0;
    if (!hasDocIds && !hasFolderIds) {
      return Prisma.empty;
    }
    const parts: Prisma.Sql[] = [];
    if (hasDocIds) {
      // imported_doc PK is `id` (not `docId` — that column lives on doc_chunk as the FK).
      parts.push(Prisma.sql`d.id IN (${Prisma.join(scope!.docIds!)})`);
    }
    if (hasFolderIds) {
      parts.push(Prisma.sql`d."folderId" IN (${Prisma.join(scope!.folderIds!)})`);
    }
    const combined = parts.length === 1 ? parts[0] : Prisma.sql`(${Prisma.join(parts, ' OR ')})`;
    return Prisma.sql`AND ${combined}`;
  }

  async semanticSearch(
    spaceId: string,
    query: string,
    limit = 10,
    scope?: DocSearchScope,
    // F-01: callers (hybridSearch) that also need the query embedding for an
    // external vector store can pass it in to avoid embedding the same query twice.
    precomputedEmbedding?: number[]
  ): Promise<DocSearchResult[]> {
    let embedding: number[];
    if (precomputedEmbedding !== undefined) {
      embedding = precomputedEmbedding;
    } else {
      try {
        embedding = await this.embeddingService.generateEmbedding(query, spaceId);
      } catch {
        // Embedding unavailable (e.g. no OPENAI_API_KEY) — return empty semantic results
        return [];
      }
    }
    const vectorStr = `[${embedding.join(',')}]`;
    const scopeFilter = this.buildScopeFilter(scope);

    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; content: string; doc_id: string; title: string; distance: number }>
    >`
      SELECT dc.id, dc.content, dc."docId" AS doc_id, d.title,
             dc.embedding <=> ${vectorStr}::vector AS distance
      FROM "doc_chunk" dc
      JOIN "imported_doc" d ON dc."docId" = d.id
      WHERE d."spaceId" = ${spaceId}
        AND d."isIndexed" = true
        ${scopeFilter}
      ORDER BY dc.embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      chunkId: r.id,
      docId: r.doc_id,
      docTitle: r.title,
      chunkContent: r.content,
      score: 1 - r.distance,
    }));
  }

  async keywordSearch(
    spaceId: string,
    query: string,
    limit = 10,
    scope?: DocSearchScope
  ): Promise<DocSearchResult[]> {
    const scopeFilter = this.buildScopeFilter(scope);

    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; content: string; doc_id: string; title: string; rank: number }>
    >`
      SELECT dc.id, dc.content, dc."docId" AS doc_id, d.title,
             ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', ${query})) AS rank
      FROM "doc_chunk" dc
      JOIN "imported_doc" d ON dc."docId" = d.id
      WHERE d."spaceId" = ${spaceId}
        AND d."isIndexed" = true
        AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', ${query})
        ${scopeFilter}
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      chunkId: r.id,
      docId: r.doc_id,
      docTitle: r.title,
      chunkContent: r.content,
      score: r.rank,
    }));
  }

  /**
   * KG-03 (D-21-03): expand a starting set of doc IDs via doc_link traversal
   * up to maxHops (bidirectional UNION). Parameterized — never string-interpolated.
   * Postgres recursive CTE with monotonically increasing depth and `n.depth < $maxHops`
   * guard terminates the recursion; UNION (not UNION ALL) additionally dedups
   * on (id, depth) which prevents redundant rows for the same id at the same depth.
   *
   * NOTE: this only expands the scope; the outer hybridSearch keeps the
   * existing `WHERE d."isIndexed" = true` filter so un-indexed neighbours
   * (D-21-04 race) don't surface — eventually consistent.
   */
  private async expandScopeViaLinks(
    spaceId: string,
    docIds: string[],
    maxHops: number
  ): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      WITH RECURSIVE neighbors(id, depth) AS (
        SELECT d.id, 0 FROM "imported_doc" d
         WHERE d.id IN (${Prisma.join(docIds)}) AND d."spaceId" = ${spaceId}
        UNION
        SELECT dl."toDocId", n.depth + 1
          FROM "doc_link" dl JOIN neighbors n ON dl."fromDocId" = n.id
         WHERE n.depth < ${maxHops} AND dl."toDocId" IS NOT NULL
        UNION
        SELECT dl."fromDocId", n.depth + 1
          FROM "doc_link" dl JOIN neighbors n ON dl."toDocId" = n.id
         WHERE n.depth < ${maxHops}
      )
      SELECT DISTINCT id FROM neighbors
    `;
    return rows.map((r) => r.id);
  }

  async hybridSearch(
    spaceId: string,
    query: string,
    limit = 10,
    scope?: DocSearchScope,
    options?: DocSearchOptions
  ): Promise<DocSearchResult[]> {
    let effectiveScope = scope;
    if (options?.traverseLinks && scope?.docIds && scope.docIds.length > 0) {
      const maxHops = options.maxHops ?? 2;
      if (maxHops < 1 || maxHops > 3) {
        throw new BadRequestException(`maxHops must be between 1 and 3 (got ${maxHops})`);
      }
      const expanded = await this.expandScopeViaLinks(spaceId, scope.docIds, maxHops);
      effectiveScope = { ...scope, docIds: expanded };
    } else if (options?.traverseLinks && options.maxHops !== undefined) {
      // Validate maxHops even when no scope.docIds — surface bad input instead of silently ignoring.
      const mh = options.maxHops;
      if (mh < 1 || mh > 3) {
        throw new BadRequestException(`maxHops must be between 1 and 3 (got ${mh})`);
      }
    }

    // D-02: augment (not replace) internal results with external vector hits.
    // Only run when the space has at least one enabled qdrant connection, so the
    // default (no external store) path is byte-for-byte identical to before.
    const qdrantConnections = await this.listEnabledQdrant(spaceId);

    // F-01: when an external vector store is enabled, the query would otherwise be
    // embedded twice (once inside semanticSearch, once for externalSearch). Compute
    // it once here and thread it through both. With no external store, semanticSearch
    // is invoked exactly as before (no precomputed arg) so that path is unchanged.
    let sharedEmbedding: number[] | undefined;
    if (qdrantConnections.length > 0) {
      try {
        sharedEmbedding = await this.embeddingService.generateEmbedding(query, spaceId);
      } catch {
        // Embedding provider down — fall through; semanticSearch will retry/return [].
        sharedEmbedding = undefined;
      }
    }

    const [semantic, keyword] = await Promise.all([
      sharedEmbedding !== undefined
        ? this.semanticSearch(spaceId, query, limit, effectiveScope, sharedEmbedding)
        : this.semanticSearch(spaceId, query, limit, effectiveScope),
      this.keywordSearch(spaceId, query, limit, effectiveScope),
    ]);

    let external: DocSearchResult[] = [];
    if (qdrantConnections.length > 0 && sharedEmbedding !== undefined) {
      try {
        external = await this.externalSearch(qdrantConnections, sharedEmbedding, limit);
      } catch (err) {
        // T-18-02-D: a down/misconfigured external store must NEVER fail the whole
        // search — degrade gracefully to internal-only results.
        this.logger.warn(
          `External vector search failed for space ${spaceId}; using internal-only results: ${
            (err as Error).message
          }`
        );
        external = [];
      }
    }

    // Reciprocal Rank Fusion (RRF): fuse the two ranked lists by rank, not by raw score.
    // RRF is scale-free, so it avoids the brittleness of mixing cosine similarity with
    // ts_rank on different scales — the recommended way to combine BM25/keyword + vector.
    // score(d) = Σ 1 / (K + rank_d) over each list the doc appears in; K=60 is the standard.
    const K = 60;
    const fused = new Map<string, DocSearchResult>();

    const fuse = (list: DocSearchResult[]) => {
      list.forEach((r, i) => {
        const rrf = 1 / (K + i + 1); // i is 0-based rank
        const existing = fused.get(r.chunkId);
        if (existing) {
          existing.score += rrf;
        } else {
          fused.set(r.chunkId, { ...r, score: rrf });
        }
      });
    };

    fuse(semantic);
    fuse(keyword);
    fuse(external); // THIRD ranked list — same RRF math, no new fusion path (D-02)

    return [...fused.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * List the space's enabled `qdrant` external connections (decrypted config).
   * Returns [] when the external-connection stack isn't wired (internal-only build).
   */
  private async listEnabledQdrant(
    spaceId: string
  ): Promise<Array<{ id: string; config: { [key: string]: unknown } }>> {
    if (!this.externalConnectionService) return [];
    const connections = await this.externalConnectionService.list(spaceId);
    return connections
      .filter((c) => c.type === 'qdrant' && c.enabled)
      .map((c) => ({ id: c.id, config: c.config }));
  }

  /**
   * Query every enabled Qdrant connection by the pre-computed query embedding and
   * concatenate their hits into a single ranked list for RRF fusion. Each connector
   * validates its collection dim (1536) before querying. Errors propagate to the
   * caller's try/catch so a single bad store degrades the whole external path.
   */
  protected async externalSearch(
    connections: Array<{ id: string; config: { [key: string]: unknown } }>,
    queryEmbedding: number[],
    limit: number
  ): Promise<DocSearchResult[]> {
    const hits: DocSearchResult[] = [];
    for (const conn of connections) {
      const connector = QdrantConnectorService.fromConfig(conn.config);
      await connector.validate();
      const results = await connector.search(queryEmbedding, limit);
      hits.push(...results);
    }
    return hits;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2 — agent memory graph reads.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Semantic search over memory_entity (copies semanticSearch's pgvector pattern, against the
   * HNSW-indexed entity embeddings). Excludes superseded entities. Returns [] when embeddings
   * are unavailable, matching semanticSearch's graceful degradation.
   */
  async entitySearch(spaceId: string, query: string, limit = 10): Promise<MemoryEntityResult[]> {
    let embedding: number[];
    try {
      embedding = await this.embeddingService.generateEmbedding(query, spaceId);
    } catch {
      return [];
    }
    const vectorStr = `[${embedding.join(',')}]`;
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; name: string; type: string; summary: string; distance: number }>
    >`
      SELECT me.id, me.name, me.type, me.summary,
             me.embedding <=> ${vectorStr}::vector AS distance
      FROM "memory_entity" me
      WHERE me."spaceId" = ${spaceId}
        AND me."supersededById" IS NULL
        AND me.embedding IS NOT NULL
      ORDER BY me.embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      summary: r.summary,
      score: 1 - r.distance,
    }));
  }

  /**
   * Expand a starting set of entity ids via memory_relation up to maxHops (bidirectional
   * UNION). Copies expandScopeViaLinks' recursive-CTE shape. Parameterized — never
   * string-interpolated. Returns the connected entity ids (including the seeds).
   */
  async traverseMemory(spaceId: string, entityIds: string[], maxHops = 2): Promise<string[]> {
    if (entityIds.length === 0) return [];
    if (maxHops < 1 || maxHops > 3) {
      throw new BadRequestException(`maxHops must be between 1 and 3 (got ${maxHops})`);
    }
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      WITH RECURSIVE neighbors(id, depth) AS (
        SELECT e.id, 0 FROM "memory_entity" e
         WHERE e.id IN (${Prisma.join(entityIds)}) AND e."spaceId" = ${spaceId}
        UNION
        SELECT r."toEntityId", n.depth + 1
          FROM "memory_relation" r JOIN neighbors n ON r."fromEntityId" = n.id
         WHERE n.depth < ${maxHops}
        UNION
        SELECT r."fromEntityId", n.depth + 1
          FROM "memory_relation" r JOIN neighbors n ON r."toEntityId" = n.id
         WHERE n.depth < ${maxHops}
      )
      SELECT DISTINCT id FROM neighbors
    `;
    return rows.map((r) => r.id);
  }
}
