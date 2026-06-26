/**
 * doc-search.controller.spec.ts — Phase 21-06 Task 1.
 *
 * Covers the new GET /api/spaces/:spaceId/docs/:docId/agent-links route which
 * delegates to DocLinkService.getOutgoing + getIncoming and returns the
 * canonical {outgoing, incoming} shape used by the LinkedDocsPanel UI and the
 * `get_doc_links` MCP tool.
 *
 * RBAC: DocLinkService already throws NotFoundException when the doc is
 * out-of-space; the controller surface adds no new bypass. The test asserts
 * the exception propagates cleanly.
 */
import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DocSearchController } from './doc-search.controller';
import type { DocSearchService } from './search.service';
import type { DocGraphService } from './graph.service';
import type { DocLinkService } from './doc-link.service';
import type { PrismaService } from '@teable/db-main-prisma';

function buildController(overrides?: Partial<DocLinkService>) {
  const searchService = {} as unknown as DocSearchService;
  const graphService = {} as unknown as DocGraphService;
  const prisma = {} as unknown as PrismaService;
  const docLinkService = {
    getOutgoing: vi.fn().mockResolvedValue([
      {
        linkId: 'l1',
        toDocId: 'd2',
        toTitle: 'Doc Two',
        label: 'cites',
        createdAt: new Date('2026-06-06T00:00:00Z'),
      },
    ]),
    getIncoming: vi.fn().mockResolvedValue([
      {
        linkId: 'l2',
        fromDocId: 'd3',
        fromTitle: 'Doc Three',
        label: 'references',
        createdAt: new Date('2026-06-05T00:00:00Z'),
      },
    ]),
    ...overrides,
  } as unknown as DocLinkService;

  const memifyService = {} as never;
  const controller = new DocSearchController(
    searchService,
    memifyService,
    graphService,
    docLinkService,
    prisma
  );
  return { controller, docLinkService };
}

describe('DocSearchController.getAgentLinks (21-06)', () => {
  it('returns {outgoing, incoming} from DocLinkService with spaceId scope', async () => {
    const { controller, docLinkService } = buildController();
    const result = await controller.getAgentLinks('space-1', 'doc-X');

    expect(docLinkService.getOutgoing).toHaveBeenCalledWith({
      docId: 'doc-X',
      callerSpaceId: 'space-1',
    });
    expect(docLinkService.getIncoming).toHaveBeenCalledWith({
      docId: 'doc-X',
      callerSpaceId: 'space-1',
    });
    expect(result.outgoing).toHaveLength(1);
    expect(result.outgoing[0]).toMatchObject({ toDocId: 'd2', toTitle: 'Doc Two' });
    expect(result.incoming).toHaveLength(1);
    expect(result.incoming[0]).toMatchObject({ fromDocId: 'd3', fromTitle: 'Doc Three' });
  });

  it('propagates NotFoundException when DocLinkService rejects cross-space access (T-21-20)', async () => {
    const { controller } = buildController({
      getOutgoing: vi.fn().mockRejectedValue(new NotFoundException()),
      getIncoming: vi.fn().mockRejectedValue(new NotFoundException()),
    });
    await expect(controller.getAgentLinks('space-1', 'doc-other-space')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('returns empty arrays when the doc has no agent-authored links', async () => {
    const { controller } = buildController({
      getOutgoing: vi.fn().mockResolvedValue([]),
      getIncoming: vi.fn().mockResolvedValue([]),
    });
    const result = await controller.getAgentLinks('space-1', 'doc-isolated');
    expect(result).toEqual({ outgoing: [], incoming: [] });
  });
});
