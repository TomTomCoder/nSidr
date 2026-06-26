import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@teable/db-main-prisma';
import { DOC_INGEST_QUEUE, DocIngestJobData } from './doc-ingest.processor';

/**
 * KnowledgeDocService — KG-01 / D-21-01 / D-21-04.
 *
 * Owns agent-authored doc writes (create + update). Agent-created docs land
 * in the SAME `imported_doc` table as user-uploaded docs with sourceType='agent'.
 * The existing doc-ingest worker picks them up via `isIndexed=false` and runs
 * chunking + embedding asynchronously (D-21-04).
 *
 * Lives in the `doc-search` feature dir (NOT `agent/`) so consuming the
 * AgentExecutionService from here would not be possible — preventing the
 * Phase 16 cross-feature DI cycle.
 */
export interface CreateDocInput {
  spaceId: string;
  title: string;
  rawContent: string;
  createdBy: string;
  folderId?: string;
  sourceUrl?: string;
}

export interface UpdateDocInput {
  docId: string;
  rawContent: string;
  callerSpaceId: string;
  callerId: string;
}

export interface DocWriteResult {
  docId: string;
  status: 'pending';
}

function computeWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const REINDEX_JOB_OPTS = {
  attempts: 2,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: true,
  removeOnFail: 50,
};

function reindexJobId(docId: string) {
  return `reindex-${docId}`;
}

@Injectable()
export class KnowledgeDocService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(DOC_INGEST_QUEUE) private readonly queue: Queue
  ) {}

  /**
   * Enqueue a reindex job with a deterministic jobId (`reindex-<docId>`).
   * Removes any prior job with the same id first so completed/failed hashes in
   * Redis do not permanently prevent re-enqueueing (matches doc-crud.controller.ts).
   * If the job is active/locked, remove() throws — a reindex is already in flight,
   * so the subsequent add() deduplicates correctly.
   */
  private async enqueueReindex(docId: string, spaceId: string): Promise<void> {
    const jobId = reindexJobId(docId);
    try {
      await this.queue.remove(jobId);
    } catch {
      // Job is active/locked — reindex already in flight; add() below is a safe no-op.
    }
    await this.queue.add(
      'reindex',
      { type: 'reindex', docId, spaceId } satisfies DocIngestJobData,
      { ...REINDEX_JOB_OPTS, jobId }
    );
  }

  async createDoc(input: CreateDocInput): Promise<DocWriteResult> {
    const { spaceId, title, rawContent, createdBy, folderId, sourceUrl } = input;

    if (!title || title.trim().length === 0) {
      throw new BadRequestException('title must be non-empty');
    }
    if (!rawContent || rawContent.trim().length === 0) {
      throw new BadRequestException('rawContent must be non-empty');
    }

    const wordCount = computeWordCount(rawContent);

    const row = await this.prisma.importedDoc.create({
      data: {
        spaceId,
        title,
        sourceType: 'agent',
        sourceUrl: sourceUrl ?? null,
        rawContent,
        wordCount,
        createdBy,
        folderId: folderId ?? null,
        isIndexed: false,
        indexProgress: 0,
        chunkCount: 0,
      },
      select: { id: true },
    });

    // Enqueue immediately so the doc is searchable within seconds (ARH-05).
    // rawContent is guaranteed non-empty by the validation above.
    await this.enqueueReindex(row.id, spaceId);

    return { docId: row.id, status: 'pending' };
  }

  async updateDoc(input: UpdateDocInput): Promise<DocWriteResult> {
    const { docId, rawContent, callerSpaceId } = input;

    if (!rawContent || rawContent.trim().length === 0) {
      throw new BadRequestException('rawContent must be non-empty');
    }

    const doc = await this.prisma.importedDoc.findUnique({
      where: { id: docId },
      select: { spaceId: true },
    });
    if (!doc || doc.spaceId !== callerSpaceId) {
      // RBAC — opaque to avoid existence enumeration
      throw new NotFoundException();
    }

    const wordCount = computeWordCount(rawContent);

    // Wipe stale chunks BEFORE the update so worker re-pick produces a clean
    // re-index (D-21-04 full re-index for v1). Both in one transaction so a
    // partial failure cannot leave inconsistent state.
    await this.prisma.$transaction([
      this.prisma.docChunk.deleteMany({ where: { docId } }),
      this.prisma.importedDoc.update({
        where: { id: docId },
        data: {
          rawContent,
          wordCount,
          isIndexed: false,
          indexProgress: 0,
          chunkCount: 0,
        },
      }),
    ]);

    // Enqueue reindex immediately after the transaction — spaceId sourced from
    // the RBAC-resolved doc record above, no extra fetch needed (ARH-05).
    await this.enqueueReindex(docId, doc.spaceId);

    return { docId, status: 'pending' };
  }
}
