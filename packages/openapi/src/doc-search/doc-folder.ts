import { z } from 'zod';
import { axios } from '../axios';
import { urlBuilder } from '../utils';

export const GET_DOC_FOLDERS = '/spaces/{spaceId}/doc-folders';
export const CREATE_DOC_FOLDER = '/spaces/{spaceId}/doc-folders';
export const UPDATE_DOC_FOLDER = '/spaces/{spaceId}/doc-folders/{folderId}';
export const DELETE_DOC_FOLDER = '/spaces/{spaceId}/doc-folders/{folderId}';

export const CreateDocFolderSchema = z.object({
  name: z.string().min(1).max(200),
  parentFolderId: z.string().nullable().optional(),
  order: z.number().optional(),
});
export type ICreateDocFolder = z.infer<typeof CreateDocFolderSchema>;

export const UpdateDocFolderSchema = CreateDocFolderSchema.partial();
export type IUpdateDocFolder = z.infer<typeof UpdateDocFolderSchema>;

export interface IDocFolder {
  id: string;
  spaceId: string;
  parentFolderId: string | null;
  name: string;
  order: number;
  createdAt: string;
}

export const listDocFolders = (spaceId: string) => {
  return axios.get<IDocFolder[]>(urlBuilder(GET_DOC_FOLDERS, { spaceId }));
};

export const createDocFolder = (spaceId: string, data: ICreateDocFolder) => {
  return axios.post<IDocFolder>(urlBuilder(CREATE_DOC_FOLDER, { spaceId }), data);
};

export const updateDocFolder = (spaceId: string, folderId: string, data: IUpdateDocFolder) => {
  return axios.patch<IDocFolder>(urlBuilder(UPDATE_DOC_FOLDER, { spaceId, folderId }), data);
};

export const deleteDocFolder = (spaceId: string, folderId: string) => {
  return axios.delete<{ deleted: boolean }>(urlBuilder(DELETE_DOC_FOLDER, { spaceId, folderId }));
};
