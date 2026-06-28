import { useAiProcessingStore } from '@/features/app/stores/useAiProcessingStore';

/**
 * Ambient "Ocean Sunset" gradient glow around the whole viewport, shown
 * while an AI request is streaming. Pure CSS (see .ai-app-glow in global.css);
 * pointer-events: none so it never blocks interaction underneath.
 */
export function AppAiGlow() {
  const isProcessing = useAiProcessingStore((s) => s.isProcessing);
  return <div className={`ai-app-glow ${isProcessing ? 'is-active' : ''}`} aria-hidden />;
}
