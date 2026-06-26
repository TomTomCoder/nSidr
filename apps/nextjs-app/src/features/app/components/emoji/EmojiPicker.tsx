import { useTheme } from '@teable/next-themes';
import { cn, Popover, PopoverContent, PopoverTrigger } from '@teable/ui-lib';
import dynamic from 'next/dynamic';
import type { FC, PropsWithChildren } from 'react';

// Lazy-load the picker + ~1 MB emoji data into a separate JS chunk.
// The chunk is only fetched when a user first opens the emoji popover.
const LazyEmojiPickerContent = dynamic(
  () => import('./EmojiPickerContent').then((m) => m.EmojiPickerContent),
  {
    ssr: false,
    loading: () => <div className="h-[435px] w-[352px]" />,
  }
);

interface IEmojiPicker {
  className?: string;
  disabled?: boolean;
  onChange?: (emoji: string) => void;
}

export const EmojiPicker: FC<PropsWithChildren<IEmojiPicker>> = (props) => {
  const { children, className, onChange, disabled } = props;
  const { resolvedTheme } = useTheme();

  if (disabled) {
    return <div className={cn('rounded transition-colors', className)}>{children}</div>;
  }

  const onEmojiSelect = (emoji: { native: string }) => {
    onChange?.(emoji.native);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={cn('rounded transition-colors', className)}>{children}</div>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0">
        <LazyEmojiPickerContent theme={resolvedTheme} onEmojiSelect={onEmojiSelect} />
      </PopoverContent>
    </Popover>
  );
};
