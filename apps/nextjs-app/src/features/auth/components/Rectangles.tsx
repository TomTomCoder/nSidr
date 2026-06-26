import { cn } from '@teable/ui-lib/shadcn';
import type { HTMLAttributes } from 'react';

// Deterministic pseudo-random per index: values must match between SSR and
// hydration, otherwise React logs a prop-mismatch error on every auth page load.
const seeded = (index: number, salt: number) => {
  const x = Math.sin(index * 374761393 + salt * 668265263) * 43758.5453;
  return x - Math.floor(x);
};

export const Rectangles = ({
  amount,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  amount: number;
}) => {
  const LIGHT_COLORS = [
    'bg-zinc-100 dark:bg-zinc-900',
    'bg-zinc-100 bg-opacity-25 dark:bg-zinc-900 dark:bg-opacity-25',
    'bg-zinc-50 dark:bg-zinc-900',
    'bg-zinc-50 bg-opacity-25 dark:bg-zinc-900 dark:bg-opacity-25',
  ];

  return Array.from({ length: amount }).map((_, index) => {
    const color = LIGHT_COLORS[Math.floor(seeded(index, 1) * LIGHT_COLORS.length)];

    const duration = seeded(index, 2) * 3 + 2;

    return (
      <div
        key={index}
        className={cn(color, className)}
        style={{
          ...style,
          animation: `pulse ${duration.toFixed(3)}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
        }}
        {...props}
      />
    );
  });
};
