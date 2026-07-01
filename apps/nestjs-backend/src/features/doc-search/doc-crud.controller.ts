import { Controller, Post, Patch, Param, Body, Req } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@teable/db-main-prisma';
import type { ICreateDoc, IUpdateDoc } from '@teable/openapi';
import { DOC_INGEST_QUEUE, DocIngestJobData } from './doc-ingest.processor';
import { UnifiedAiService } from '../ai/unified-ai.service';

const REINDEX_JOB_OPTS = {
  attempts: 2,
  backoff: { type: 'exponential' as const, delay: 5000 },
  // Remove completed jobs immediately so the jobId is freed for reuse.
  // With removeOnComplete: 100 (keep last 100), the completed job hash stays in
  // Redis and BullMQ silently drops any new job with the same jobId — causing
  // isIndexed to remain false permanently after a successful reindex.
  removeOnComplete: true,
  removeOnFail: 50,
  // Deduplicate by docId: if a reindex job for this doc is already queued/active,
  // BullMQ will not add another. This prevents job floods from rapid saves.
  // The jobId is prefixed to avoid collisions with other job types.
};

function reindexJobId(docId: string) {
  return `reindex-${docId}`;
}

@Controller('api/spaces/:spaceId/docs')
export class DocCrudController {
  constructor(
    @InjectQueue(DOC_INGEST_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly unifiedAiService: UnifiedAiService
  ) {}

  /**
   * Enqueue a reindex, removing any lingering job with the same deterministic jobId first.
   *
   * The jobId (`reindex-<docId>`) dedups rapid saves, but BullMQ also dedups against a
   * *completed* or *failed* job whose hash still lives in Redis — so a single prior job
   * (e.g. one created before removeOnComplete:true, or any failed attempt kept by
   * removeOnFail) would permanently drop every future reindex, stranding the doc at
   * isIndexed:false. remove() clears that hash so the new job always enqueues. If the job
   * is currently active (locked), remove() throws — a reindex is already running, so the
   * subsequent add() dedups correctly and the doc still gets indexed.
   */
  private async enqueueReindex(docId: string, spaceId: string): Promise<void> {
    const jobId = reindexJobId(docId);
    try {
      await this.queue.remove(jobId);
    } catch {
      // Job is active/locked → reindex already in flight; the add() below is a safe no-op.
    }
    await this.queue.add(
      'reindex',
      { type: 'reindex', docId, spaceId } satisfies DocIngestJobData,
      { ...REINDEX_JOB_OPTS, jobId }
    );
  }

  @Post()
  async createDoc(
    @Param('spaceId') spaceId: string,
    @Body() body: ICreateDoc,
    @Req() req: { user: { id: string } }
  ) {
    const hasContent = Boolean(body.content);
    const doc = await this.prisma.importedDoc.create({
      data: {
        spaceId,
        title: body.title ?? 'Untitled',
        sourceType: 'markdown',
        rawContent: body.content ?? '',
        wordCount: 0,
        folderId: body.folderId ?? null,
        order: body.order ?? 0,
        // An empty doc (e.g. "New Document") has nothing to index — mark it indexed so the
        // tree shows "Indexed" instead of a perpetual "Indexing 0%". Docs with content start
        // un-indexed and flip to indexed when the reindex job below completes.
        isIndexed: !hasContent,
        indexProgress: hasContent ? 0 : 100,
        createdBy: req.user.id,
      },
    });
    if (hasContent) {
      await this.enqueueReindex(doc.id, spaceId);
    }
    return doc;
  }

  @Post(':docId/reindex')
  async reindexDoc(@Param('spaceId') spaceId: string, @Param('docId') docId: string) {
    await this.prisma.importedDoc.update({
      where: { id: docId, spaceId },
      data: { isIndexed: false, indexProgress: 0 },
    });
    await this.enqueueReindex(docId, spaceId);
    return { queued: true, docId };
  }

  /**
   * P1-11 — "Mise en page IA". Reformat a document's markdown (restructure, preserve 100%
   * of the information). Accepts either a docId (reads its rawContent) or raw `content`.
   * Does NOT persist — returns the restructured markdown plus a `possibleLoss` flag so the
   * frontend can show a before/after and let the user accept via the normal save path.
   */
  @Post('reformat')
  async reformatDoc(
    @Param('spaceId') spaceId: string,
    @Body() body: { docId?: string; content?: string }
  ) {
    let rawContent = body.content ?? '';
    if (!rawContent && body.docId) {
      const doc = await this.prisma.importedDoc.findFirstOrThrow({
        where: { id: body.docId, spaceId },
        select: { rawContent: true },
      });
      rawContent = doc.rawContent ?? '';
    }
    return this.unifiedAiService.reformatDocument(spaceId, rawContent);
  }

  @Patch(':docId')
  async updateDoc(
    @Param('spaceId') spaceId: string,
    @Param('docId') docId: string,
    @Body() body: IUpdateDoc
  ) {
    const doc = await this.prisma.importedDoc.update({
      where: { id: docId, spaceId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { rawContent: body.content, isIndexed: false }),
        ...(body.folderId !== undefined && { folderId: body.folderId }),
        ...(body.order !== undefined && { order: body.order }),
      },
    });
    if (body.content !== undefined) {
      await this.enqueueReindex(docId, spaceId);
    }
    return doc;
  }
}
