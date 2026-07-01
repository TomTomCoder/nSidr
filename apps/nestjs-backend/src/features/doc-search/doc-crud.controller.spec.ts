import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocCrudController } from './doc-crud.controller';

const mockQueue = {
  add: vi.fn(),
};

const mockPrisma = {
  importedDoc: {
    create: vi.fn(),
    update: vi.fn(),
    findFirstOrThrow: vi.fn(),
  },
};

const mockUnifiedAi = {
  reformatDocument: vi.fn(),
};

const mockReq = { user: { id: 'user-1' } };

describe('DocCrudController', () => {
  let controller: DocCrudController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new DocCrudController(
      mockQueue as never,
      mockPrisma as never,
      mockUnifiedAi as never
    );
  });

  describe('POST createDoc', () => {
    it('creates a doc with isIndexed=false', async () => {
      const docId = 'doc-1';
      mockPrisma.importedDoc.create.mockResolvedValue({
        id: docId,
        spaceId: 'space-1',
        title: 'Untitled',
        rawContent: '',
        isIndexed: false,
      });

      await controller.createDoc('space-1', { title: 'Untitled', content: '' }, mockReq);

      expect(mockPrisma.importedDoc.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isIndexed: false, spaceId: 'space-1' }),
        })
      );
    });

    it('does NOT queue reindex when rawContent is empty', async () => {
      mockPrisma.importedDoc.create.mockResolvedValue({
        id: 'doc-1',
        rawContent: '',
        isIndexed: false,
      });

      await controller.createDoc('space-1', { title: 'Untitled', content: '' }, mockReq);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('queues reindex when rawContent is non-empty', async () => {
      mockPrisma.importedDoc.create.mockResolvedValue({
        id: 'doc-1',
        spaceId: 'space-1',
        rawContent: 'some content',
        isIndexed: false,
      });

      await controller.createDoc(
        'space-1',
        { title: 'Untitled', content: 'some content' },
        mockReq
      );

      expect(mockQueue.add).toHaveBeenCalledWith('reindex', {
        type: 'reindex',
        docId: 'doc-1',
        spaceId: 'space-1',
      });
    });
  });

  describe('PATCH updateDoc', () => {
    it('sets isIndexed=false and queues reindex when content is provided', async () => {
      mockPrisma.importedDoc.update.mockResolvedValue({
        id: 'doc-1',
        rawContent: 'updated content',
        isIndexed: false,
      });

      await controller.updateDoc('space-1', 'doc-1', { content: 'updated content' });

      expect(mockPrisma.importedDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rawContent: 'updated content', isIndexed: false }),
        })
      );
      expect(mockQueue.add).toHaveBeenCalledWith('reindex', {
        type: 'reindex',
        docId: 'doc-1',
        spaceId: 'space-1',
      });
    });

    it('does NOT queue reindex when content is not provided', async () => {
      mockPrisma.importedDoc.update.mockResolvedValue({ id: 'doc-1', title: 'New title' });

      await controller.updateDoc('space-1', 'doc-1', { title: 'New title' });

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('updates only provided fields', async () => {
      mockPrisma.importedDoc.update.mockResolvedValue({ id: 'doc-1', order: 5 });

      await controller.updateDoc('space-1', 'doc-1', { order: 5 });

      expect(mockPrisma.importedDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { order: 5 },
        })
      );
    });
  });

  describe('POST reformatDoc (P1-11)', () => {
    it('reformats raw content passed inline (does NOT read the DB, does NOT persist)', async () => {
      const result = { reformatted: '# Title', originalLength: 10, reformattedLength: 7, possibleLoss: false };
      mockUnifiedAi.reformatDocument.mockResolvedValue(result);

      const out = await controller.reformatDoc('space-1', { content: 'raw markdown' });

      expect(mockUnifiedAi.reformatDocument).toHaveBeenCalledWith('space-1', 'raw markdown');
      expect(mockPrisma.importedDoc.findFirstOrThrow).not.toHaveBeenCalled();
      expect(mockPrisma.importedDoc.update).not.toHaveBeenCalled();
      expect(out).toBe(result);
    });

    it('reads rawContent from the DB when only a docId is given', async () => {
      mockPrisma.importedDoc.findFirstOrThrow.mockResolvedValue({ rawContent: 'stored md' });
      mockUnifiedAi.reformatDocument.mockResolvedValue({
        reformatted: '# x',
        originalLength: 9,
        reformattedLength: 3,
        possibleLoss: true,
      });

      await controller.reformatDoc('space-1', { docId: 'doc-9' });

      expect(mockPrisma.importedDoc.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'doc-9', spaceId: 'space-1' } })
      );
      expect(mockUnifiedAi.reformatDocument).toHaveBeenCalledWith('space-1', 'stored md');
    });
  });
});
