import { create } from 'zustand';

/**
 * App-wide flag: is the AI chat currently streaming a response?
 * Drives the ambient glow overlay (.ai-app-glow) mounted in _app.tsx.
 */
export const useAiProcessingStore = create<{
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}>((set) => ({
  isProcessing: false,
  setIsProcessing: (v) => set({ isProcessing: v }),
}));
