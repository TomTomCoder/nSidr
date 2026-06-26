import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PrismaService } from '@teable/db-main-prisma';
import { Prisma } from '@teable/db-main-prisma';
import type { Job } from 'bullmq';
import { QdrantConnectorService } from '../qdrant/qdrant-connector.service';
import { ExternalConnectionService } from '../external-connection.service';
import {
  VECTOR_SYNC_QUEUE,
  VECTOR_SYNC_JOB_UPSERT,
  VECTOR_SYNC_JOB_DELETE,
  VECTOR_SYNC_JOB_BACKFILL,
  VECTOR_SYNC_BATCH_SIZE,
  VECTOR_SYNC_WORKER_OPTIONS,
} from './vector-sync.constants';
import type { VectorSyncJobData } from './vector-sync.constants';

/**
 * Raw row returned by Prisma.$queryRaw for a doc_chunk with its embedding.
 * Prisma maps the vector column as a string (the pgvector text repr).
 */
interface DocChunkRow {
  id: string;
  docId: string;
  content: string;
  embedding: string | null;
}

/**
 * VectorSyncProcessor — consumes the VECTOR_SYNC queue in the vector-sync-worker role.
 *
 * Performs EXPORT-direction writes (Teable pgvector → external Qdrant) strictly
 * off the API hot path (T-18-03-D). Internal pgvector is NEVER mutated (T-18-03-T).
 *
 * Job types:
 *  - upsert-doc: read doc_chunk rows via $queryRaw → upsert as Qdrant points
 *  - delete-doc: delete all points whose payload.docId matches the removed doc
 *  - backfill-space: batch-upsert ALL chunks for a space into Qdrant
 */
@Processor(VECTOR_SYNC_QUEUE, VECTOR_SYNC_WORKER_OPTIONS)
export class VectorSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(VectorSyncProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly externalConnectionService: ExternalConnectionService
  ) {
    super();
  }

  async process(job: Job<VectorSyncJobData>): Promise<void> {
    const { type, spaceId } = job.data;
    this.logger.debug(`Processing VECTOR_SYNC job ${job.id} type=${type} space=${spaceId}`);

    // Resolve enabled qdrant connections for this space
    const connections = await this.getEnabledQdrantConnections(spaceId);
    if (connections.length === 0) {
      this.logger.debug(`No enabled Qdrant connections for space ${spaceId} — skipping`);
      return;
    }

    if (type === VECTOR_SYNC_JOB_UPSERT && 'docId' in job.data) {
      await this.handleUpsert(spaceId, job.data.docId, connections);
    } else if (type === VECTOR_SYNC_JOB_DELETE && 'docId' in job.data) {
      await this.handleDelete(spaceId, job.data.docId, connections);
    } else if (type === VECTOR_SYNC_JOB_BACKFILL) {
      await this.handleBackfill(spaceId, connections);
    }
  }

  // ── Job handlers ─────────────────────────────────────────────────────────────

  private async handleUpsert(
    spaceId: string,
    docId: string,
    connectors: QdrantConnectorService[]
  ): Promise<void> {
    const chunks = await this.fetchChunks(docId);
    if (chunks.length === 0) {
      this.logger.debug(`Doc ${docId} has no embedded chunks yet — upsert skipped`);
      return;
    }
    const points = this.chunksToPoints(chunks, spaceId);
    for (const connector of connectors) {
      try {
        await connector.upsertPoints(points);
        this.logger.debug(`Upserted ${points.length} points for doc ${docId}`);
      } catch (err) {
        this.logger.error(`Qdrant upsert failed for doc ${docId}: ${String(err)}`);
        throw err; // let BullMQ retry
      }
    }
  }

  private async handleDelete(
    spaceId: string,
    docId: string,
    connectors: QdrantConnectorService[]
  ): Promise<void> {
    for (const connector of connectors) {
      try {
        await connector.deleteByDocId(docId);
        this.logger.debug(`Deleted Qdrant points for doc ${docId}`);
      } catch (err) {
        this.logger.error(`Qdrant delete failed for doc ${docId}: ${String(err)}`);
        throw err;
      }
    }
  }

  private async handleBackfill(
    spaceId: string,
    connectors: QdrantConnectorService[]
  ): Promise<void> {
    // Read all doc IDs for the space first, then fetch chunks in batches
    const docIds = await this.fetchDocIds(spaceId);
    this.logger.log(`Backfill: ${docIds.length} docs for space ${spaceId}`);

    let total = 0;
    for (let i = 0; i < docIds.length; i += VECTOR_SYNC_BATCH_SIZE) {
      const batch = docIds.slice(i, i + VECTOR_SYNC_BATCH_SIZE);
      const chunks = await this.fetchChunksForDocs(batch);
      if (chunks.length === 0) continue;
      const points = this.chunksToPoints(chunks, spaceId);
      for (const connector of connectors) {
        try {
          await connector.upsertPoints(points);
        } catch (err) {
          this.logger.error(
            `Backfill upsert failed at batch ${i / VECTOR_SYNC_BATCH_SIZE}: ${String(err)}`
          );
          throw err;
        }
      }
      total += points.length;
      this.logger.debug(`Backfill progress: ${total} points upserted so far`);
    }
    this.logger.log(`Backfill complete: ${total} points for space ${spaceId}`);
  }

  // ── Data access helpers ──────────────────────────────────────────────────────

  private async fetchDocIds(spaceId: string): Promise<string[]> {
    // Page through the space so a large library (10k+ docs) does not materialize
    // the full id list in one Prisma round-trip — keeps worker memory bounded.
    const CHUNK = 1000;
    const ids: string[] = [];
    let lastId: string | undefined;
    for (let i = 0; i < 1000; i++) {
      const page = await this.prisma.importedDoc.findMany({
        where: { spaceId, ...(lastId ? { id: { gt: lastId } } : {}) },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: CHUNK,
      });
      if (page.length === 0) break;
      for (const r of page) ids.push(r.id);
      lastId = page[page.length - 1].id;
      if (page.length < CHUNK) break;
    }
    return ids;
  }

  /**
   * Fetch embedded chunks for a single doc using $queryRaw (Prisma does not support
   * the vector column in generated client methods).
   */
  private async fetchChunks(docId: string): Promise<DocChunkRow[]> {
    return this.prisma.$queryRaw<DocChunkRow[]>`
      SELECT id, "docId", content, embedding::text AS embedding
      FROM doc_chunk
      WHERE "docId" = ${docId} AND embedding IS NOT NULL
    `;
  }

  /**
   * Batch fetch for multiple doc IDs (backfill path).
   */
  private async fetchChunksForDocs(docIds: string[]): Promise<DocChunkRow[]> {
    if (docIds.length === 0) return [];
    return this.prisma.$queryRaw<DocChunkRow[]>`
      SELECT id, "docId", content, embedding::text AS embedding
      FROM doc_chunk
      WHERE "docId" = ANY(${Prisma.raw(`ARRAY[${docIds.map((id) => `'${id}'`).join(',')}]`)})
        AND embedding IS NOT NULL
    `;
  }

  /**
   * Parse pgvector text repr "[0.1,0.2,...]" into a number array.
   */
  private parseEmbedding(raw: string): number[] {
    return raw
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(Number);
  }

  /**
   * Convert DocChunkRow[] → Qdrant PointStruct array.
   * Point id = chunkId (string UUID), payload = { docId, content, spaceId }.
   */
  private chunksToPoints(
    chunks: DocChunkRow[],
    spaceId: string
  ): Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> {
    return chunks
      .filter((c) => c.embedding !== null)
      .map((c) => ({
        id: c.id,
        vector: this.parseEmbedding(c.embedding!),
        payload: {
          docId: c.docId,
          content: c.content,
          spaceId,
        },
      }));
  }

  // ── Connection resolution ────────────────────────────────────────────────────

  /**
   * Return QdrantConnectorService instances for all enabled qdrant connections
   * belonging to this space. Returns [] when there are none (space not wired).
   */
  private async getEnabledQdrantConnections(spaceId: string): Promise<QdrantConnectorService[]> {
    let all;
    try {
      all = await this.externalConnectionService.list(spaceId);
    } catch {
      return [];
    }
    return all
      .filter((c) => c.enabled && c.type === 'qdrant')
      .map((c) => QdrantConnectorService.fromConfig(c.config));
  }
}
