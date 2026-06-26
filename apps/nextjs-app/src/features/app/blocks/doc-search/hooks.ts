import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ICreateDoc,
  ICreateDocFolder,
  IDocSearchQuery,
  IDocSearchResult,
  IImportedDoc,
  IUpdateDoc,
  IUpdateDocFolder,
} from '@teable/openapi';
import {
  createDoc,
  createDocFolder,
  deleteDoc,
  deleteDocFolder,
  getDoc,
  listDocFolders,
  listDocs,
  reindexDoc,
  updateDoc,
  updateDocFolder,
} from '@teable/openapi';

export type IDocListItem = IImportedDoc;
import { useEffect } from 'react';

const docKeys = {
  list: (spaceId: string) => ['docs', spaceId, 'list'] as const,
  doc: (docId: string) => ['docs', docId] as const,
  links: (docId: string) => ['docs', docId, 'links'] as const,
  folders: (spaceId: string) => ['doc-folders', spaceId] as const,
};

export function useDocList(spaceId: string) {
  return useQuery({
    queryKey: docKeys.list(spaceId),
    queryFn: () => listDocs(spaceId).then((r) => r.data as IImportedDoc[]),
    // While any doc is still indexing, poll so its progress bar advances live.
    // 3 s is responsive enough for progress-bar UX while reducing server load 3×.
    refetchInterval: (query) => {
      const docs = query.state.data as IImportedDoc[] | undefined;
      return docs?.some((d) => !d.isIndexed) ? 3000 : false;
    },
  });
}

export function useDocCapabilities(spaceId: string) {
  return useQuery<{ embeddingEnabled: boolean }>({
    queryKey: ['doc-capabilities', spaceId],
    queryFn: () =>
      fetch(`/api/spaces/${spaceId}/docs/capabilities`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDocSearch(spaceId: string) {
  return useMutation<IDocSearchResult[], Error, IDocSearchQuery>({
    mutationFn: (body) =>
      fetch(`/api/spaces/${spaceId}/docs/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
  });
}

export function useImportMarkdown(spaceId: string) {
  const qc = useQueryClient();
  return useMutation<
    { jobId: string; status: string },
    Error,
    { title: string; content: string; userId: string }
  >({
    mutationFn: (body) =>
      fetch(`/api/spaces/${spaceId}/docs/import/markdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: docKeys.list(spaceId) }),
  });
}

export function useImportPdf(spaceId: string) {
  const qc = useQueryClient();
  return useMutation<
    { jobId: string; status: string },
    Error,
    { title: string; file: File; userId: string }
  >({
    mutationFn: ({ title, file, userId }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('title', title);
      form.append('userId', userId);
      return fetch(`/api/spaces/${spaceId}/docs/import/pdf`, { method: 'POST', body: form }).then(
        (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: docKeys.list(spaceId) }),
  });
}

export function useImportUrl(spaceId: string) {
  const qc = useQueryClient();
  return useMutation<
    { jobId: string; status: string; docId: string; title: string },
    Error,
    { url: string; title?: string }
  >({
    mutationFn: (body) =>
      fetch(`/api/spaces/${spaceId}/docs/import/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: docKeys.list(spaceId) }),
  });
}

export function useJobProgress(spaceId: string, jobId: string | null) {
  const qc = useQueryClient();
  const query = useQuery<{ state: string; progress: number }>({
    queryKey: ['doc-job', spaceId, jobId],
    queryFn: () =>
      fetch(`/api/spaces/${spaceId}/docs/import/jobs/${jobId}`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (!state || state === 'completed' || state === 'failed' || state === 'not_found')
        return false;
      return 800;
    },
  });

  // When indexing finishes, refresh the docs list so the new doc appears as indexed
  // without requiring a manual refresh.
  const state = query.data?.state;
  useEffect(() => {
    if (state === 'completed') {
      void qc.invalidateQueries({ queryKey: docKeys.list(spaceId) });
    }
  }, [state, spaceId, qc]);

  return query;
}

export function useDocLinks(spaceId: string, docId: string) {
  return useQuery({
    queryKey: docKeys.links(docId),
    queryFn: () =>
      fetch(`/api/spaces/${spaceId}/docs/${docId}/links`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    enabled: !!docId,
  });
}

export function useDoc(spaceId: string, docId: string) {
  return useQuery({
    queryKey: docKeys.doc(docId),
    queryFn: () => getDoc(spaceId, docId).then((r) => r.data as IImportedDoc),
    enabled: !!docId,
    // Avoid re-fetching the same doc on every navigation; content is invalidated
    // on save via useUpdateDoc's onSuccess.
    staleTime: 30_000,
  });
}

export function useDeleteDoc(spaceId: string) {
  const qc = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, string>({
    mutationFn: (docId) => deleteDoc(spaceId, docId).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: docKeys.list(spaceId) }),
  });
}

export function useCreateDoc(spaceId: string) {
  const qc = useQueryClient();
  return useMutation<IImportedDoc, Error, ICreateDoc>({
    mutationFn: (data) => createDoc(spaceId, data).then((r) => r.data as IImportedDoc),
    onSuccess: () => qc.invalidateQueries({ queryKey: docKeys.list(spaceId) }),
  });
}

export function useUpdateDoc(spaceId: string) {
  const qc = useQueryClient();
  return useMutation<IImportedDoc, Error, { docId: string; data: IUpdateDoc }>({
    mutationFn: ({ docId, data }) =>
      updateDoc(spaceId, docId, data).then((r) => r.data as IImportedDoc),
    onSuccess: (_result, { docId }) => {
      qc.invalidateQueries({ queryKey: docKeys.list(spaceId) });
      qc.invalidateQueries({ queryKey: docKeys.doc(docId) });
    },
  });
}

export function useDocFolders(spaceId: string) {
  return useQuery({
    queryKey: docKeys.folders(spaceId),
    queryFn: () => listDocFolders(spaceId).then((r) => r.data),
  });
}

export function useCreateDocFolder(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ICreateDocFolder) => createDocFolder(spaceId, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: docKeys.folders(spaceId) }),
  });
}

export function useUpdateDocFolder(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, data }: { folderId: string; data: IUpdateDocFolder }) =>
      updateDocFolder(spaceId, folderId, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: docKeys.folders(spaceId) }),
  });
}

export function useDeleteDocFolder(spaceId: string) {
  const qc = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, string>({
    mutationFn: (folderId) => deleteDocFolder(spaceId, folderId).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: docKeys.folders(spaceId) }),
  });
}

export function useReindexDoc(spaceId: string) {
  const qc = useQueryClient();
  return useMutation<{ queued: boolean; docId: string }, Error, string>({
    mutationFn: (docId) => reindexDoc(spaceId, docId).then((r) => r.data),
    onSuccess: (_result, docId) => {
      qc.invalidateQueries({ queryKey: docKeys.list(spaceId) });
      qc.invalidateQueries({ queryKey: docKeys.doc(docId) });
    },
  });
}
