import { Inject, Injectable, Logger } from '@nestjs/common';

/**
 * Injection token for the embedding backend. Decoupling EmbeddingService from the concrete
 * UnifiedAiService (which drags in BaseNode/Record/Field modules) lets the standalone
 * doc-ingest worker bind a lightweight OpenAI generator instead of the full AI module.
 * - API process: bound to UnifiedAiService (see doc-search.module.ts).
 * - Worker process: bound to OpenAiEmbeddingGenerator (see worker/doc-worker.module.ts).
 */
export const EMBEDDING_GENERATOR = Symbol('EMBEDDING_GENERATOR');

export interface IEmbeddingGenerator {
  generateEmbeddings(texts: string[], spaceId: string): Promise<number[][]>;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(@Inject(EMBEDDING_GENERATOR) private readonly generator: IEmbeddingGenerator) {}

  async generateEmbedding(text: string, spaceId: string): Promise<number[]> {
    const results = await this.generateBatchEmbeddings([text], spaceId);
    return results[0];
  }

  async generateBatchEmbeddings(texts: string[], spaceId: string): Promise<number[][]> {
    return this.generator.generateEmbeddings(texts, spaceId); // DELEGATE (D-09)
  }
}
