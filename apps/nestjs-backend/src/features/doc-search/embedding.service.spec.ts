import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingService } from './embedding.service';

const mockUnifiedAiService = {
  generateEmbeddings: vi.fn(),
};

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmbeddingService(mockUnifiedAiService as never);
  });

  describe('generateBatchEmbeddings', () => {
    it('delegates to unifiedAiService.generateEmbeddings (D-09)', async () => {
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];
      mockUnifiedAiService.generateEmbeddings.mockResolvedValue(mockEmbeddings);

      const result = await service.generateBatchEmbeddings(['hello', 'world'], 'space-1');

      expect(mockUnifiedAiService.generateEmbeddings).toHaveBeenCalledWith(
        ['hello', 'world'],
        'space-1'
      );
      expect(result).toEqual(mockEmbeddings);
    });

    it('propagates errors from unifiedAiService', async () => {
      mockUnifiedAiService.generateEmbeddings.mockRejectedValue(new Error('API error'));

      await expect(service.generateBatchEmbeddings(['text'], 'space-1')).rejects.toThrow(
        'API error'
      );
    });
  });

  describe('generateEmbedding', () => {
    it('calls generateBatchEmbeddings with single element and returns first result', async () => {
      const mockEmbeddings = [[0.1, 0.2, 0.3]];
      mockUnifiedAiService.generateEmbeddings.mockResolvedValue(mockEmbeddings);

      const result = await service.generateEmbedding('test text', 'space-1');

      expect(mockUnifiedAiService.generateEmbeddings).toHaveBeenCalledWith(
        ['test text'],
        'space-1'
      );
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });
  });
});
