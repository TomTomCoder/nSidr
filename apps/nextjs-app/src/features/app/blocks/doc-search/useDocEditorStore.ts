import { LocalStorageKeys } from '@teable/sdk/config';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface IDocEditorState {
  selectedDocId: string | null;
  selectedFolderId: string | null;
  mode: 'edit' | 'split' | 'preview';
  setSelectedDoc: (id: string | null) => void;
  setSelectedFolder: (id: string | null) => void;
  setMode: (mode: 'edit' | 'split' | 'preview') => void;
}

export const useDocEditorStore = create<IDocEditorState>()(
  persist(
    (set) => ({
      selectedDocId: null,
      selectedFolderId: null,
      mode: 'edit',
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
