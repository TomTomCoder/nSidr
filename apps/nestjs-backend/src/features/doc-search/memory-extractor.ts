/**
 * Injection token + interface for the agent-memory extractor (Phase 1).
 *
 * Mirrors EMBEDDING_GENERATOR: the API process binds this to UnifiedAiService (full AI
 * stack), while the standalone doc-ingest worker leaves it unbound. DocIngestionService
 * injects it as @Optional and simply skips memory extraction when it is absent or when no
 * chat model is configured — so ingestion never fails because of memory extraction.
 */
export const MEMORY_EXTRACTOR = Symbol('MEMORY_EXTRACTOR');

export interface IExtractedEntity {
  name: string;
  type: string;
  summary: string;
}

export interface IExtractedRelation {
  from: string; // entity name
  to: string; // entity name
  label: string;
}

export interface IMemoryExtraction {
  entities: IExtractedEntity[];
  relations: IExtractedRelation[];
}

export interface IMemoryExtractor {
  /**
   * Extract a small knowledge graph (entities + relations) from document text for a space.
   * Implementations must resolve to `{ entities: [], relations: [] }` (never throw) when no
   * model is configured or extraction fails — callers treat memory as best-effort.
   */
  extractMemory(spaceId: string, text: string): Promise<IMemoryExtraction>;
}
