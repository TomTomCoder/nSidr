import {
  Controller,
  Optional,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Logger,
} from '@nestjs/common';
import { DocSearchService } from './search.service';
import { MemifyService } from './memify.service';
import { DocGraphService } from './graph.service';
import { DocLinkService } from './doc-link.service';
import { VectorSyncService } from '../external-connection/sync/vector-sync.service';
import { PrismaService } from '@teable/db-main-prisma';

@Controller('api/spaces/:spaceId/docs')
export class DocSearchController {
  private readonly logger = new Logger(DocSearchController.name);

  constructor(
    private readonly searchService: DocSearchService,
    private readonly memifyService: MemifyService,
    private readonly graphService: DocGraphService,
    private readonly docLinkService: DocLinkService,
    private readonly prisma: PrismaService,
    @Optional() private readonly vectorSyncService?: VectorSyncService
  ) {}

  @Post('search')
  async search(
    @Param('spaceId') spaceId: string,
    @Body() body: { query: string; mode?: 'semantic' | 'keyword' | 'hybrid'; limit?: number }
  ) {
    const { query, mode = 'hybrid', limit = 10 } = body;

    // Validate and enforce limit
    const MAX_RESULTS = 100;
    const validatedLimit = Math.min(Math.max(1, limit || 10), MAX_RESULTS);

    try {
      switch (mode) {
        case 'semantic':
          return await this.searchService.semanticSearch(spaceId, query, validatedLimit);
        case 'keyword':
          return await this.searchService.keywordSearch(spaceId, query, validatedLimit);
        default:
          return await this.searchService.hybridSearch(spaceId, query, validatedLimit);
      }
    } catch (err) {
      this.logger.warn(
        `Search failed for query "${query}": ${err instanceof Error ? err.message : String(err)}`
      );
      return [];
    }
  }

  @Get('capabilities')
  getCapabilities() {
    return { embeddingEnabled: Boolean(process.env.OPENAI_API_KEY) };
  }

  /**
   * Phase 2 — semantic search over the agent memory graph (entities). Space-scoped.
   * Used by the search_memory MCP tool and any agent/UI memory search.
   */
  @Post('memory/search')
  async searchMemory(
    @Param('spaceId') spaceId: string,
    @Body() body: { query: string; limit?: number }
  ) {
    const limit = Math.min(Math.max(1, body.limit || 10), 50);
    try {
      return await this.searchService.entitySearch(spaceId, body.query, limit);
    } catch (err) {
      this.logger.warn(
        `Memory search failed for "${body.query}": ${err instanceof Error ? err.message : String(err)}`
      );
      return [];
    }
  }

  /**
   * Phase 4 — manually trigger the self-improving "memify" pass for this space
   * (dedup/supersede entities, reweight relations). The same logic runs daily via a
   * scheduled BullMQ job; this endpoint is for on-demand refresh.
   */
  @Post('memory/memify')
  async memifyMemory(@Param('spaceId') spaceId: string) {
    return this.memifyService.memify(spaceId);
  }

  /**
   * Phase 2 — the memory graph (entities + their relations) extracted from one doc.
   * Powers the read-only "Memory" UI panel (Phase 3) and the get_memory MCP tool.
   */
  @Get(':docId/memory')
  async getDocMemory(@Param('spaceId') spaceId: string, @Param('docId') docId: string) {
    const entities = await this.prisma.memoryEntity.findMany({
      where: { sourceDocId: docId, spaceId },
      select: { id: true, name: true, type: true, summary: true, version: true },
      orderBy: { name: 'asc' },
      take: 500,
    });
    const ids = entities.map((e) => e.id);
    const relations =
      ids.length > 0
        ? await this.prisma.memoryRelation.findMany({
            where: {
              spaceId,
              OR: [{ fromEntityId: { in: ids } }, { toEntityId: { in: ids } }],
            },
            select: { id: true, fromEntityId: true, toEntityId: true, label: true },
            take: 2000,
          })
        : [];
    return { entities, relations };
  }

  @Get(':docId/links')
  async getLinks(@Param('docId') docId: string) {
    return this.graphService.getLinkedDocs(docId);
  }

  /**
   * KG-02 agent-authored doc-doc links (label IS NOT NULL).
   * Returns the canonical {outgoing, incoming} shape that matches the
   * `get_doc_links` MCP tool. The spaceId from the URL is the caller scope
   * — DocLinkService's RBAC check rejects cross-space access.
   */
  @Get(':docId/agent-links')
  async getAgentLinks(@Param('spaceId') spaceId: string, @Param('docId') docId: string) {
    const [outgoing, incoming] = await Promise.all([
      this.docLinkService.getOutgoing({ docId, callerSpaceId: spaceId }),
      this.docLinkService.getIncoming({ docId, callerSpaceId: spaceId }),
    ]);
    return { outgoing, incoming };
  }

  @Get(':docId')
  async getDoc(@Param('spaceId') spaceId: string, @Param('docId') docId: string) {
    // Scope the read by spaceId so a doc cannot be fetched cross-space — matches
    // the {id, spaceId} scoping already enforced on update/delete (F-03).
    const doc = await this.prisma.importedDoc.findFirstOrThrow({
      where: { id: docId, spaceId },
      include: {
        // memoryEntities count lets the UI skip the per-doc-open memory fetch when empty (P-04).
        _count: { select: { chunks: true, linksFrom: true, linksTo: true, memoryEntities: true } },
      },
    });
    return doc;
  }

  @Get()
  async listDocs(@Param('spaceId') spaceId: string) {
    return this.prisma.importedDoc.findMany({
      where: { spaceId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        title: true,
        sourceType: true,
        wordCount: true,
        chunkCount: true,
        isIndexed: true,
        indexProgress: true,
        createdAt: true,
      },
    });
  }

  @Delete(':docId')
  async deleteDoc(@Param('spaceId') spaceId: string, @Param('docId') docId: string) {
    // Enqueue Qdrant point removal BEFORE DB delete so the docId is still resolvable.
    // VectorSyncService is @Optional — no-op if the VECTOR_SYNC queue is absent.
    await this.vectorSyncService?.enqueueDelete(spaceId, docId);
    // Cascade deletes DocChunk and DocLink via Prisma onDelete: Cascade
    await this.prisma.importedDoc.delete({ where: { id: docId } });
    return { deleted: true };
  }
}
