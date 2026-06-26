import { useEffect } from 'react';
import { useDocSearchStore } from './useDocSearchStore';

export const useDocSearchKeyboardShortcut = () => {
  const { toggleDocSearch } = useDocSearchStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+Shift+K (Mac) or Ctrl+Shift+K (Windows/Linux)
      const isMac =
        typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // event.key is uppercase "K" while Shift is held, so compare case-insensitively.
      // Comparing against lowercase 'k' alone never matched → the shortcut never fired.
      if (modifier && event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggleDocSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDocSearch]);
};
