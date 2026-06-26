/**
 * EmojiPickerContent — lazy-loaded via next/dynamic from EmojiPicker.tsx.
 *
 * Kept in its own file so the ~1 MB @emoji-mart/data blob and the React
 * picker component are only bundled in a separate chunk that is fetched on
 * demand, not included in the initial page JS.
 */
import emojiData from '@emoji-mart/data';
import EmojiPickerCom from '@emoji-mart/react';

interface IEmojiPickerContentProps {
  theme: string | undefined;
  onEmojiSelect: (emoji: { native: string }) => void;
}

export function EmojiPickerContent({ theme, onEmojiSelect }: IEmojiPickerContentProps) {
  return <EmojiPickerCom theme={theme} data={emojiData} onEmojiSelect={onEmojiSelect} />;
}
