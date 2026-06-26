import { create } from 'zustand';

interface DocSearchStore {
  isOpen: boolean;
  openDocSearch: () => void;
  closeDocSearch: () => void;
  toggleDocSearch: () => void;
}

export const useDocSearchStore = create<DocSearchStore>((set) => ({
  isOpen: false,
  openDocSearch: () => set({ isOpen: true }),
  closeDocSearch: () => set({ isOpen: false }),
  toggleDocSearch: () => set((state) => ({ isOpen: !state.isOpen })),
}));
