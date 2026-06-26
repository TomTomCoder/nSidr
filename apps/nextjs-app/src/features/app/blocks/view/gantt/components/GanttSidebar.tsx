import { useEffect, useRef } from 'react';
import type { GanttBarItem } from '../type';
import { ROW_HEIGHT, SIDEBAR_WIDTH } from '../util';

const HEADER_HEIGHT = 40;

interface IGanttSidebarProps {
  bars: GanttBarItem[];
  scrollTop: number;
}

export const GanttSidebar = ({ bars, scrollTop }: IGanttSidebarProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Synchronize scroll with timeline
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  return (
    <div
      className="flex shrink-0 flex-col border-r border-border bg-background"
      style={{ width: SIDEBAR_WIDTH }}
    >
      {/* Header row — matches timeline header height */}
      <div
        className="flex shrink-0 items-center border-b border-border px-3 font-medium text-sm"
        style={{ height: HEADER_HEIGHT }}
      >
        Name
      </div>
      {/* Rows */}
      <div ref={scrollRef} className="overflow-hidden" style={{ flex: 1 }}>
        {bars.map((bar) => (
          <div
            key={bar.recordId}
            className="flex items-center truncate border-b border-border px-3 text-sm"
            style={{ height: ROW_HEIGHT }}
            title={bar.title}
          >
            <span className="truncate">{bar.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
