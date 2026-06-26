import type { DocSearchResult } from '../../doc-search/search.service';

/**
 * D-01: a backend-agnostic vector store contract so other engines
 * (Weaviate, pgvector-as-external, Pinecone) can slot in later without
 * touching DocSearchService — it only ever talks to this interface.
 *
 * The required embedding dimensionality for the internal RAG pipeline.
 * doc_chunk.embedding is a 1536-dim pgvector (OpenAI text-embedding-3-small),
 * so any external collection MUST match or its hits are meaningless when
 * fused alongside internal results.
 */
export const REQUIRED_VECTOR_DIM = 1536;

export interface IVectorConnector {
  /**
   * Validate the target collection is usable before any query runs.
   * MUST reject fast (throw) when the collection's vector size != REQUIRED_VECTOR_DIM
   * so a mis-dimensioned store never silently poisons RAG results (T-18-02-T).
   */
  validate(): Promise<void>;

  /**
   * Query the external store by a pre-computed query embedding and return
   * hits mapped into the internal DocSearchResult shape so they can be fused
   * through the existing RRF pipeline.
   */
  search(embedding: number[], limit: number): Promise<DocSearchResult[]>;
}
