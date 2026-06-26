import { Injectable, Logger } from '@nestjs/common';
import type { IEmbeddingGenerator } from '../features/doc-search/embedding.service';

/**
 * Lightweight embedding backend for the standalone doc-ingest worker.
 *
 * Mirrors UnifiedAiService.generateEmbeddings (direct OpenAI call) but carries none of the
 * heavy AI-module dependencies (BaseNode/Record/Field), keeping the worker's memory footprint
 * small. Failures throw plain Errors; the ingestion service catches them and stores chunks
 * without vectors (keyword-only fallback).
 */
@Injectable()
export class OpenAiEmbeddingGenerator implements IEmbeddingGenerator {
  private readonly logger = new Logger(OpenAiEmbeddingGenerator.name);

  async generateEmbeddings(texts: string[], _spaceId: string): Promise<number[][]> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY required for embeddings');

    const batchSize = 20;
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const abortCtrl = new AbortController();
      const abortTimer = setTimeout(() => abortCtrl.abort(), 10_000);
      let res: Response;
      try {
        res = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: 'text-embedding-3-small', input: batch }),
          signal: abortCtrl.signal,
        });
      } catch (e) {
        clearTimeout(abortTimer);
        throw new Error(`Embeddings API unreachable or timed out: ${(e as Error).message}`);
      }
      clearTimeout(abortTimer);
      if (!res.ok) throw new Error(`Embeddings API error: ${await res.text()}`);
      const data = (await res.json()) as { data: { embedding: number[] }[] };
      results.push(...data.data.map((d) => d.embedding));
    }
    return results;
  }
}
