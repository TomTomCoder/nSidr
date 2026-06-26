import { randomUUID } from 'node:crypto';
import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { PrismaService, Prisma } from '@teable/db-main-prisma';
import { EmbeddingService } from './embedding.service';
import { LinkExtractorService } from './link-extractor.service';
import { MEMORY_EXTRACTOR, type IMemoryExtractor } from './memory-extractor';

interface ChunkResult {
  content: string;
  startOffset: number;
  endOffset: number;
  tokenCount: number;
}

@Injectable()
export class DocIngestionService {
  private readonly logger = new Logger(DocIngestionService.name);
  // Markdown-aware chunk sizing (tokens). 1 token ~ 0.75 words.
  // TARGET is the soft goal per chunk; HARD_CAP is never exceeded and stays well below the
  // ~2,500-token "context cliff" where retrieval quality drops. (RAG chunking best practice.)
  private readonly WORDS_PER_TOKEN = 0.75;
  private readonly TARGET_TOKENS = 1000;
  private readonly HARD_CAP_TOKENS = 1800;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly linkExtractor: LinkExtractorService,
    // Phase 1 — agent memory. Optional: bound to the AI gateway in the API process, unbound
    // in the standalone doc-worker. When absent, memory extraction is skipped (chunks/links
    // still index normally).
    @Optional() @Inject(MEMORY_EXTRACTOR) private readonly memoryExtractor?: IMemoryExtractor
  ) {}

  /**
   * Phase 1 — extract an agent-memory graph (entities + relations) from a document and store
   * it, idempotently keyed on sourceDocId. Always clears prior memory for the doc first (so a
   * reindex replaces it). Best-effort: any failure is swallowed — chunks/search are unaffected.
   * Deleting the entities cascades to their relations (FK ON DELETE CASCADE).
   */
  private async insertMemory(spaceId: string, docId: string, content: string): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM "memory_entity" WHERE "sourceDocId" = ${docId}`;
    if (!this.memoryExtractor || !content.trim()) return;

    let extraction: {
      entities: Array<{ name: string; type: string; summary: string }>;
      relations: Array<{ from: string; to: string; label: string }>;
    };
    try {
      extraction = await this.memoryExtractor.extractMemory(spaceId, content);
    } catch {
      return;
    }
    const entities = extraction.entities ?? [];
    if (entities.length === 0) return;

    // Assign ids in JS so relations can reference entities by name.
    const idByName = new Map<string, string>();
    const entityRows = entities.map((e) => {
      const id = randomUUID();
      idByName.set(e.name, id);
      return { id, name: e.name, type: e.type, summary: e.summary };
    });

    // Embed "name: summary" for each entity (best-effort; NULL vector on failure).
    let embeddings: number[][] | null = null;
    try {
      embeddings = await this.embeddingService.generateBatchEmbeddings(
        entityRows.map((e) => `${e.name}: ${e.summary}`),
        spaceId
      );
    } catch {
      this.logger.warn(
        `No embeddings for memory entities of doc ${docId} — storing without vector`
      );
    }

    if (embeddings) {
      const rows = entityRows.map(
        (e, i) =>
          Prisma.sql`(${e.id}, ${spaceId}, ${e.name}, ${e.type}, ${e.summary}, ${JSON.stringify(embeddings![i])}::vector, ${docId})`
      );
      await this.prisma.$executeRaw`
        INSERT INTO "memory_entity" ("id", "spaceId", "name", "type", "summary", "embedding", "sourceDocId")
        VALUES ${Prisma.join(rows)}
      `;
    } else {
      const rows = entityRows.map(
        (e) => Prisma.sql`(${e.id}, ${spaceId}, ${e.name}, ${e.type}, ${e.summary}, ${docId})`
      );
      await this.prisma.$executeRaw`
        INSERT INTO "memory_entity" ("id", "spaceId", "name", "type", "summary", "sourceDocId")
        VALUES ${Prisma.join(rows)}
      `;
    }

    // Relations: keep only those whose endpoints resolved to inserted entities.
    const relRows = (extraction.relations ?? [])
      .map((r) => ({ from: idByName.get(r.from), to: idByName.get(r.to), label: r.label }))
      .filter((r): r is { from: string; to: string; label: string } => Boolean(r.from && r.to))
      .map(
        (r) => Prisma.sql`(${randomUUID()}, ${spaceId}, ${r.from}, ${r.to}, ${r.label}, ${docId})`
      );
    if (relRows.length > 0) {
      await this.prisma.$executeRaw`
        INSERT INTO "memory_relation" ("id", "spaceId", "fromEntityId", "toEntityId", "label", "sourceDocId")
        VALUES ${Prisma.join(relRows)}
      `;
    }
    this.logger.log(
      `Memory: doc ${docId} → ${entityRows.length} entities, ${relRows.length} relations`
    );
  }

  private async insertChunks(
    docId: string,
    chunks: ChunkResult[],
    embeddings: number[][] | null
  ): Promise<void> {
    if (chunks.length === 0) return;
    if (embeddings) {
      const rows = chunks.map(
        (chunk, i) =>
          Prisma.sql`(gen_random_uuid()::text, ${docId}, ${i}, ${chunk.content}, ${JSON.stringify(embeddings[i])}::vector, ${chunk.tokenCount}, ${chunk.startOffset}, ${chunk.endOffset})`
      );
      await this.prisma.$executeRaw`
        INSERT INTO "doc_chunk" (id, "docId", "chunkIndex", content, embedding, "tokenCount", "startOffset", "endOffset")
        VALUES ${Prisma.join(rows)}
      `;
    } else {
      const rows = chunks.map(
        (chunk, i) =>
          Prisma.sql`(gen_random_uuid()::text, ${docId}, ${i}, ${chunk.content}, ${chunk.tokenCount}, ${chunk.startOffset}, ${chunk.endOffset})`
      );
      await this.prisma.$executeRaw`
        INSERT INTO "doc_chunk" (id, "docId", "chunkIndex", content, "tokenCount", "startOffset", "endOffset")
        VALUES ${Prisma.join(rows)}
      `;
    }
  }

  private countWords(s: string): number {
    return s.split(/\s+/).filter(Boolean).length;
  }

  private tokensForWords(words: number): number {
    return Math.ceil(words / this.WORDS_PER_TOKEN);
  }

  /**
   * Split a document on markdown headings (#..######) so each heading + its body stays
   * together. Returns the raw section texts in order. Content before the first heading
   * (preamble) is its own section. Falls back to the whole document when there are no headings.
   */
  private splitIntoSections(text: string): string[] {
    const isHeading = (line: string) => /^#{1,6}\s+\S/.test(line);
    const sections: string[] = [];
    let current: string[] = [];
    for (const line of text.split('\n')) {
      if (isHeading(line) && current.some((l) => l.trim())) {
        sections.push(current.join('\n'));
        current = [line];
      } else {
        current.push(line);
      }
    }
    if (current.some((l) => l.trim())) sections.push(current.join('\n'));
    return sections.length ? sections : [text];
  }

  /**
   * Recursive fallback for a block that exceeds the hard cap: split into sentences and pack
   * them up to maxWords; a single oversized sentence is hard-split by words. No overlap —
   * heading-aware sections already preserve local context.
   */
  private splitOversized(block: string, maxWords: number): string[] {
    const sentences = block.match(/[^.!?\n]+[.!?]*(?:\s+|$)/g)?.map((s) => s.trim()) ?? [];
    const units = sentences.filter(Boolean).length ? sentences.filter(Boolean) : [block.trim()];
    const pieces: string[] = [];
    let buf: string[] = [];
    let bufWords = 0;
    for (const sentence of units) {
      const w = this.countWords(sentence);
      if (w > maxWords) {
        if (buf.length) {
          pieces.push(buf.join(' '));
          buf = [];
          bufWords = 0;
        }
        const words = sentence.split(/\s+/);
        for (let i = 0; i < words.length; i += maxWords) {
          pieces.push(words.slice(i, i + maxWords).join(' '));
        }
        continue;
      }
      if (bufWords > 0 && bufWords + w > maxWords) {
        pieces.push(buf.join(' '));
        buf = [];
        bufWords = 0;
      }
      buf.push(sentence);
      bufWords += w;
    }
    if (buf.length) pieces.push(buf.join(' '));
    return pieces;
  }

  /**
   * Markdown-aware chunking. (1) Split on headings so sections stay intact. (2) Within each
   * section, pack paragraphs up to TARGET_TOKENS; oversized paragraphs fall back to
   * sentence/word splitting, never exceeding HARD_CAP_TOKENS. Header-aware chunking beats
   * naive fixed-size windows by ~5–10 pts on structured docs.
   */
  private chunkContent(text: string): ChunkResult[] {
    const targetWords = Math.floor(this.TARGET_TOKENS * this.WORDS_PER_TOKEN);
    const hardCapWords = Math.floor(this.HARD_CAP_TOKENS * this.WORDS_PER_TOKEN);
    const chunks: ChunkResult[] = [];
    let cursor = 0;

    const emit = (raw: string) => {
      const content = raw.trim();
      if (!content) return;
      const first = content.split(/\s+/)[0];
      const found = first ? text.indexOf(first, cursor) : -1;
      const startOffset = Math.max(0, found >= 0 ? found : cursor);
      const endOffset = startOffset + content.length;
      chunks.push({
        content,
        startOffset,
        endOffset,
        tokenCount: this.tokensForWords(this.countWords(content)),
      });
      cursor = Math.max(cursor, endOffset);
    };

    for (const section of this.splitIntoSections(text)) {
      const paragraphs = section
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      let buf: string[] = [];
      let bufWords = 0;
      const flush = () => {
        if (buf.length) {
          emit(buf.join('\n\n'));
          buf = [];
          bufWords = 0;
        }
      };
      for (const para of paragraphs) {
        const w = this.countWords(para);
        if (w > hardCapWords) {
          flush();
          for (const piece of this.splitOversized(para, hardCapWords)) emit(piece);
          continue;
        }
        if (bufWords > 0 && bufWords + w > targetWords) flush();
        buf.push(para);
        bufWords += w;
      }
      flush();
    }

    // Degenerate input (no paragraph/heading structure, e.g. one giant line): hard-split.
    if (chunks.length === 0 && text.trim()) {
      for (const piece of this.splitOversized(text.trim(), hardCapWords)) emit(piece);
    }
    return chunks;
  }

  async ingestMarkdown(
    spaceId: string,
    title: string,
    content: string,
    userId: string,
    existingDocId?: string,
    onProgress?: (pct: number) => Promise<void>
  ) {
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    await onProgress?.(5);
    let doc;
    if (existingDocId) {
      // Idempotent retry: doc was pre-created in the controller — clear stale chunks and reuse
      await this.prisma.$executeRaw`DELETE FROM "doc_chunk" WHERE "docId" = ${existingDocId}`;
      doc = await this.prisma.importedDoc.update({
        where: { id: existingDocId },
        data: { rawContent: content, wordCount, isIndexed: false },
      });
    } else {
      doc = await this.prisma.importedDoc.create({
        data: {
          spaceId,
          title,
          sourceType: 'markdown',
          rawContent: content,
          wordCount,
          createdBy: userId,
          isIndexed: false,
        },
      });
    }

    await onProgress?.(15);
    const chunks = this.chunkContent(content);
    await onProgress?.(25);
    // Cap each chunk at 2000 tokens (≈ 1500 words) before embedding to limit vector injection surface (T-07-03-06)
    const MAX_CHUNK_TOKENS = 2000;
    const cappedContents = chunks.map((c) => {
      if (c.tokenCount > MAX_CHUNK_TOKENS) {
        this.logger.warn(
          `Chunk truncated from ${c.tokenCount} to ${MAX_CHUNK_TOKENS} tokens in doc "${title}"`
        );
        const maxWords = Math.floor(MAX_CHUNK_TOKENS * 0.75);
        return c.content.split(/\s+/).slice(0, maxWords).join(' ');
      }
      return c.content;
    });
    let embeddings: number[][] | null = null;
    try {
      embeddings = await this.embeddingService.generateBatchEmbeddings(cappedContents, spaceId);
    } catch {
      // Embedding provider not configured or unreachable — store chunks without vector
      this.logger.warn(
        `No embeddings for doc "${title}" — embedding provider not set; storing chunks without vector`
      );
    }

    await onProgress?.(80);
    await this.insertChunks(doc.id, chunks, embeddings);

    await onProgress?.(90);
    await this.linkExtractor.extractLinks(content, doc.id, spaceId);

    // P-01: mark indexed BEFORE memory extraction. insertMemory may call an LLM, which
    // must not delay the doc becoming searchable / the library showing "Indexed".
    await this.prisma.importedDoc.update({
      where: { id: doc.id },
      data: { isIndexed: true, chunkCount: chunks.length },
    });

    await onProgress?.(95);
    await this.insertMemory(spaceId, doc.id, content);

    await onProgress?.(100);
    this.logger.log(`Ingested doc "${title}" — ${chunks.length} chunks`);
    return doc;
  }

  async reindexDoc(
    spaceId: string,
    docId: string,
    onProgress?: (pct: number) => Promise<void>
  ): Promise<void> {
    await onProgress?.(5);
    // Load the doc's rawContent
    const doc = await this.prisma.importedDoc.findUniqueOrThrow({
      where: { id: docId },
    });

    await onProgress?.(10);
    // Delete existing DocChunk rows
    await this.prisma.$executeRaw`DELETE FROM "doc_chunk" WHERE "docId" = ${docId}`;

    // Re-chunk content
    const content = doc.rawContent ?? '';
    if (!content) {
      await this.insertMemory(spaceId, docId, ''); // clears any prior memory for this doc
      await this.prisma.importedDoc.update({
        where: { id: docId },
        data: { isIndexed: true, chunkCount: 0 },
      });
      await onProgress?.(100);
      return;
    }

    await onProgress?.(20);
    const chunks = this.chunkContent(content);
    await onProgress?.(30);
    const MAX_CHUNK_TOKENS = 2000;
    const cappedContents = chunks.map((c) => {
      if (c.tokenCount > MAX_CHUNK_TOKENS) {
        this.logger.warn(
          `Chunk truncated from ${c.tokenCount} to ${MAX_CHUNK_TOKENS} tokens in doc "${doc.title}"`
        );
        const maxWords = Math.floor(MAX_CHUNK_TOKENS * 0.75);
        return c.content.split(/\s+/).slice(0, maxWords).join(' ');
      }
      return c.content;
    });

    let embeddings: number[][] | null = null;
    try {
      embeddings = await this.embeddingService.generateBatchEmbeddings(cappedContents, spaceId);
    } catch {
      this.logger.warn(
        `No embeddings for doc "${doc.title}" — embedding provider not set; storing chunks without vector`
      );
    }

    await onProgress?.(80);
    await this.insertChunks(docId, chunks, embeddings);

    // P-01: mark indexed before memory extraction (may call an LLM) so the doc is
    // searchable immediately; memory populates after, best-effort.
    await this.prisma.importedDoc.update({
      where: { id: docId },
      data: { isIndexed: true, chunkCount: chunks.length },
    });

    await onProgress?.(95);
    await this.insertMemory(spaceId, docId, content);

    await onProgress?.(100);
    this.logger.log(`Reindexed doc "${doc.title}" (${docId}) — ${chunks.length} chunks`);
  }

  async ingestPdf(
    spaceId: string,
    title: string,
    pdfBuffer: Buffer,
    userId: string,
    existingDocId?: string,
    onProgress?: (pct: number) => Promise<void>
  ) {
    // pdf-parse uses CommonJS exports; dynamic require is intentional here
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>;
    const { text } = await pdfParse(pdfBuffer);
    const doc = await this.ingestMarkdown(spaceId, title, text, userId, existingDocId, onProgress);
    await this.prisma.importedDoc.update({ where: { id: doc.id }, data: { sourceType: 'pdf' } });
    return doc;
  }
}
