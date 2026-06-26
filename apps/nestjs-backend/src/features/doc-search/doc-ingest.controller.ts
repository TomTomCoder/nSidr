import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@teable/db-main-prisma';
import { DOC_INGEST_QUEUE, DocIngestJobData } from './doc-ingest.processor';

const JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

@Controller('api/spaces/:spaceId/docs/import')
export class DocIngestController {
  constructor(
    @InjectQueue(DOC_INGEST_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService
  ) {}

  @Post('markdown')
  async importMarkdown(
    @Param('spaceId') spaceId: string,
    @Body() body: { title: string; content: string },
    @Req() req: { user: { id: string } }
  ) {
    const wordCount = (body.content ?? '').split(/\s+/).filter(Boolean).length;
    const doc = await this.prisma.importedDoc.create({
      data: {
        spaceId,
        title: body.title,
        sourceType: 'markdown',
        rawContent: body.content ?? '',
        wordCount,
        createdBy: req.user.id,
        isIndexed: false,
      },
    });
    const job = await this.queue.add(
      'ingest',
      {
        type: 'markdown',
        spaceId,
        title: body.title,
        content: body.content,
        userId: req.user.id,
        docId: doc.id,
      } satisfies DocIngestJobData,
      JOB_OPTS
    );
    return { jobId: job.id, status: 'queued', docId: doc.id };
  }

  @Post('pdf')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async importPdf(
    @Param('spaceId') spaceId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title: string },
    @Req() req: { user: { id: string } }
  ) {
    // Extract text here so the BullMQ job carries no binary payload.
    // Storing 50MB PDFs as base64 in Redis (67MB+) exhausts heap under concurrent uploads.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>;
    const { text } = await pdfParse(file.buffer);
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    const doc = await this.prisma.importedDoc.create({
      data: {
        spaceId,
        title: body.title,
        sourceType: 'pdf',
        rawContent: text,
        wordCount,
        createdBy: req.user.id,
        isIndexed: false,
      },
    });
    const job = await this.queue.add(
      'reindex',
      { type: 'reindex', spaceId, docId: doc.id } satisfies DocIngestJobData,
      JOB_OPTS
    );
    return { jobId: job.id, status: 'queued', docId: doc.id };
  }

  @Post('url')
  async importUrl(
    @Param('spaceId') spaceId: string,
    @Body() body: { url: string; title?: string },
    @Req() req: { user: { id: string } }
  ) {
    const { url, title } = body;
    if (!url) throw new Error('url is required');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let rawContent: string;
    let resolvedTitle = title ?? url;
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Teable-DocBot/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
      const html = await res.text();

      // Extract <title> if no title provided
      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) resolvedTitle = titleMatch[1].trim();
      }

      // Strip tags, collapse whitespace, decode common entities
      rawContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 500_000);
    } finally {
      clearTimeout(timeout);
    }

    const wordCount = rawContent.split(/\s+/).filter(Boolean).length;
    const doc = await this.prisma.importedDoc.create({
      data: {
        spaceId,
        title: resolvedTitle,
        sourceType: 'url',
        rawContent,
        wordCount,
        createdBy: req.user.id,
        isIndexed: false,
      },
    });

    const job = await this.queue.add(
      'ingest',
      {
        type: 'markdown',
        spaceId,
        title: resolvedTitle,
        content: rawContent,
        userId: req.user.id,
        docId: doc.id,
      } satisfies DocIngestJobData,
      JOB_OPTS
    );

    return { jobId: job.id, status: 'queued', docId: doc.id, title: resolvedTitle };
  }

  @Get('jobs/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return { state: 'not_found', progress: 0 };
    const state = await job.getState();
    const progress = typeof job.progress === 'number' ? job.progress : 0;
    return { state, progress };
  }
}
