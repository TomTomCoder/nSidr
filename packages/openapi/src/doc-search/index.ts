export * from './doc';
export * from './doc-folder';

export interface IDocSearchQuery {
  query: string;
  mode?: 'semantic' | 'keyword' | 'hybrid';
  limit?: number;
}

export interface IDocSearchResult {
  chunkId: string;
  docId: string;
  docTitle: string;
  chunkContent: string;
  score: number;
}

export interface IImportedDoc {
  id: string;
  spaceId: string;
  title: string;
  sourceType: 'markdown' | 'pdf' | 'url';
  sourceUrl?: string;
  wordCount: number;
  chunkCount: number;
  isIndexed: boolean;
  indexProgress?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  folderId?: string | null;
  order?: number;
  rawContent?: string;
}

export interface IDocLinkGraph {
  outbound: Array<{
    id: string;
    toDocId?: string;
    toUrl?: string;
    linkText: string;
    linkType: 'internal' | 'external';
  }>;
  inbound: Array<{
    id: string;
    fromDocId: string;
    linkText: string;
    linkType: 'internal' | 'external';
  }>;
}
