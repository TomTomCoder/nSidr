import { LocalStorageKeys } from '@teable/sdk/config';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface IDocEditorState {
  selectedDocId: string | null;
  selectedFolderId: string | null;
  // 'wysiwyg' = Milkdown markdown-native editor (default, Coda/Notion-like).
  // 'markdown' = raw markdown in CodeMirror. 'preview' = rendered read-only.
  mode: 'wysiwyg' | 'markdown' | 'preview';
  setSelectedDoc: (id: string | null) => void;
  setSelectedFolder: (id: string | null) => void;
  setMode: (mode: 'wysiwyg' | 'markdown' | 'preview') => void;
}

export const useDocEditorStore = create<IDocEditorState>()(
  persist(
    (set) => ({
      selectedDocId: null,
      selectedFolderId: null,
      mode: 'wysiwyg',
      setSelectedDoc: (selectedDocId) => set({ selectedDocId }),
      setSelectedFolder: (selectedFolderId) => set({ selectedFolderId }),
      setMode: (mode) => set({ mode }),
    }),
    {
      name: LocalStorageKeys.DocEditor,
      partialize: (state) => ({
        mode: state.mode,
      }),
    }
  )
);
