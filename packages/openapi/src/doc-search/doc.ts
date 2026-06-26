import { z } from 'zod';
import { axios } from '../axios';
import { urlBuilder } from '../utils';

const DOC_COLLECTION_PATH = '/spaces/{spaceId}/docs';
const DOC_ITEM_PATH = '/spaces/{spaceId}/docs/{docId}';
export const GET_DOC_LIST = DOC_COLLECTION_PATH;
export const GET_DOC = DOC_ITEM_PATH;
export const CREATE_DOC = DOC_COLLECTION_PATH;
export const UPDATE_DOC = DOC_ITEM_PATH;
export const DELETE_DOC = DOC_ITEM_PATH;

export const CreateDocSchema = z.object({
  title: z.string().min(1).max(500).optional().default('Untitled'),
  folderId: z.string().nullable().optional(),
  content: z.string().max(512_000).optional().default(''),
  order: z.number().optional(),
});
export type ICreateDoc = z.infer<typeof CreateDocSchema>;

export const UpdateDocSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(512_000).optional(),
  folderId: z.string().nullable().optional(),
  order: z.number().optional(),
});
export type IUpdateDoc = z.infer<typeof UpdateDocSchema>;

// Minimal doc shape returned by API — IImportedDoc in index.ts extends this
export interface IDocBase {
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

export const listDocs = (spaceId: string) => {
  return axios.get<IDocBase[]>(urlBuilder(GET_DOC_LIST, { spaceId }));
};

export const getDoc = (spaceId: string, docId: string) => {
  return axios.get<IDocBase>(urlBuilder(GET_DOC, { spaceId, docId }));
};

export const createDoc = (spaceId: string, data: ICreateDoc) => {
  return axios.post<IDocBase>(urlBuilder(CREATE_DOC, { spaceId }), data);
};

export const updateDoc = (spaceId: string, docId: string, data: IUpdateDoc) => {
  return axios.patch<IDocBase>(urlBuilder(UPDATE_DOC, { spaceId, docId }), data);
};

export const deleteDoc = (spaceId: string, docId: string) => {
  return axios.delete<{ deleted: boolean }>(urlBuilder(DELETE_DOC, { spaceId, docId }));
};

export const reindexDoc = (spaceId: string, docId: string) => {
  return axios.post<{ queued: boolean; docId: string }>(
    urlBuilder(`/spaces/{spaceId}/docs/{docId}/reindex`, { spaceId, docId })
  );
};
