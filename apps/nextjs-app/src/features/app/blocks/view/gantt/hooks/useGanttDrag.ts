import { FieldKeyType } from '@teable/core';
import type { IGanttViewOptions } from '@teable/core';
import { useRecordOperations } from '@teable/sdk/hooks';
import { toast } from '@teable/ui-lib/shadcn/ui/sonner';
import { useCallback, useRef, useState } from 'react';
import type { GanttBarItem } from '../type';
import { dateToPixel, pixelToDate } from '../util';

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const ONE_DAY_MS = 1000 * 60 * 60 * 24;

/** Clamp a Date to a safe year range. */
function clampDate(date: Date): Date {
  const ms = date.getTime();
  const minMs = new Date(MIN_YEAR, 0, 1).getTime();
  const maxMs = new Date(MAX_YEAR, 11, 31).getTime();
  if (ms < minMs) return new Date(MIN_YEAR, 0, 1);
  if (ms > maxMs) return new Date(MAX_YEAR, 11, 31);
  return date;
}

type DragMode = 'move' | 'resize-left' | 'resize-right' | 'dependency';

interface DragState {
  mode: DragMode;
  bar: GanttBarItem;
  startX: number;
  originalStart: Date;
  originalEnd: Date;
}

interface PendingGhostBar extends GanttBarItem {
  ghostLeft?: number;
  ghostWidth?: number;
}

export interface IUseGanttDragResult {
  startMove: (bar: GanttBarItem, e: React.MouseEvent) => void;
  startResizeLeft: (bar: GanttBarItem, e: React.MouseEvent) => void;
  startResizeRight: (bar: GanttBarItem, e: React.MouseEvent) => void;
  startDependency: (bar: GanttBarItem, e: React.MouseEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: (e: MouseEvent) => void;
  pendingGhostBars: PendingGhostBar[];
  /** Pixel position of rubber-band dependency line endpoint, or null if not dragging dependency */
  dependencyLineEnd: { x: number; y: number } | null;
}

interface IUseGanttDragOptions {
  bars: GanttBarItem[];
  ganttOptions: IGanttViewOptions;
  tableId: string;
  timelineStart: Date;
  timeScale: string;
  /** Map of bar recordId → pixel left offset of the timeline container (for hit-testing) */
  containerLeft?: number;
}

/**
 * Validate recordIds against the known bar set before appending to dependency field.
 * Returns the filtered set of valid record IDs.
 */
function validateDependencyIds(ids: string[], validIds: Set<string>): string[] {
  return ids.filter((id) => validIds.has(id));
}

export function useGanttDrag({
  bars,
  ganttOptions,
  tableId,
  timelineStart,
  timeScale,
}: IUseGanttDragOptions): IUseGanttDragResult {
  const { updateRecord } = useRecordOperations();
  const dragStateRef = useRef<DragState | null>(null);
  const [pendingGhostBars, setPendingGhostBars] = useState<PendingGhostBar[]>([]);
  const [dependencyLineEnd, setDependencyLineEnd] = useState<{ x: number; y: number } | null>(null);

  const validRecordIds = new Set(bars.map((b) => b.recordId));

  const startMove = useCallback((bar: GanttBarItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = {
      mode: 'move',
      bar,
      startX: e.clientX,
      originalStart: new Date(bar.startDate),
      originalEnd: new Date(bar.endDate),
    };
    setPendingGhostBars([{ ...bar }]);
  }, []);

  const startResizeLeft = useCallback((bar: GanttBarItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = {
      mode: 'resize-left',
      bar,
      startX: e.clientX,
      originalStart: new Date(bar.startDate),
      originalEnd: new Date(bar.endDate),
    };
    setPendingGhostBars([{ ...bar }]);
  }, []);

  const startResizeRight = useCallback((bar: GanttBarItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = {
      mode: 'resize-right',
      bar,
      startX: e.clientX,
      originalStart: new Date(bar.startDate),
      originalEnd: new Date(bar.endDate),
    };
    setPendingGhostBars([{ ...bar }]);
  }, []);

  const startDependency = useCallback((bar: GanttBarItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = {
      mode: 'dependency',
      bar,
      startX: e.clientX,
      originalStart: new Date(bar.startDate),
      originalEnd: new Date(bar.endDate),
    };
    setDependencyLineEnd({ x: e.clientX, y: e.clientY });
  }, []);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      if (drag.mode === 'dependency') {
        setDependencyLineEnd({ x: e.clientX, y: e.clientY });
        return;
      }

      const deltaX = e.clientX - drag.startX;

      if (drag.mode === 'move') {
        const origStartPx = dateToPixel(drag.originalStart, timelineStart, timeScale);
        const origEndPx = dateToPixel(drag.originalEnd, timelineStart, timeScale);
        const newStart = clampDate(pixelToDate(origStartPx + deltaX, timelineStart, timeScale));
        const newEnd = clampDate(pixelToDate(origEndPx + deltaX, timelineStart, timeScale));
        setPendingGhostBars([{ ...drag.bar, startDate: newStart, endDate: newEnd }]);
      } else if (drag.mode === 'resize-left') {
        const origStartPx = dateToPixel(drag.originalStart, timelineStart, timeScale);
        let newStart = clampDate(pixelToDate(origStartPx + deltaX, timelineStart, timeScale));
        // Prevent start > end - 1 day
        const maxStart = new Date(drag.originalEnd.getTime() - ONE_DAY_MS);
        if (newStart > maxStart) newStart = maxStart;
        setPendingGhostBars([{ ...drag.bar, startDate: newStart, endDate: drag.originalEnd }]);
      } else if (drag.mode === 'resize-right') {
        const origEndPx = dateToPixel(drag.originalEnd, timelineStart, timeScale);
        let newEnd = clampDate(pixelToDate(origEndPx + deltaX, timelineStart, timeScale));
        // Prevent end < start + 1 day
        const minEnd = new Date(drag.originalStart.getTime() + ONE_DAY_MS);
        if (newEnd < minEnd) newEnd = minEnd;
        setPendingGhostBars([{ ...drag.bar, startDate: drag.originalStart, endDate: newEnd }]);
      }
    },
    [timelineStart, timeScale]
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      const drag = dragStateRef.current;
      dragStateRef.current = null;
      setPendingGhostBars([]);
      setDependencyLineEnd(null);

      if (!drag) return;

      const { startField, endField, dependencyField } = ganttOptions;

      if (drag.mode === 'dependency') {
        // Hit test: find which bar the mouse is over by checking the DOM
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const barEl = target?.closest('[data-record-id]') as HTMLElement | null;
        if (!barEl) return;
        const targetRecordId = barEl.dataset.recordId;
        if (!targetRecordId || targetRecordId === drag.bar.recordId) return;

        // Validate target is in the current record set (T-05-13: prevent arbitrary injection)
        if (!validRecordIds.has(targetRecordId)) return;

        if (!dependencyField) return;

        const targetBar = bars.find((b) => b.recordId === drag.bar.recordId);
        if (!targetBar) return;

        // Read current dependency field value from existing bar metadata
        // Dependency field stores comma-separated IDs or linked record IDs
        // We only support text-field append here (linked-record field requires separate API)
        const fieldMeta = undefined; // We don't have field type info here; use text mode as default
        void fieldMeta; // suppress unused warning

        // Append targetRecordId to the dependency field (text mode)
        // The value should be a comma-separated list of validated record IDs
        const currentDepsRaw = (drag.bar as GanttBarItem & { dependencyValue?: string })
          .dependencyValue;
        const existingIds = currentDepsRaw
          ? currentDepsRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const allIds = [...existingIds, targetRecordId];
        // Validate all IDs before writing (T-05-13)
        const validatedIds = validateDependencyIds(allIds, validRecordIds);
        const newValue = validatedIds.join(', ');

        updateRecord({
          tableId,
          recordId: drag.bar.recordId,
          recordRo: {
            fieldKeyType: FieldKeyType.Id,
            record: { fields: { [dependencyField]: newValue } },
          },
        }).catch((error) => {
          console.warn('Failed to update dependencies:', error);
          toast.error('Failed to update dependency');
        });
        return;
      }

      // Move or resize: compute final dates from ghost bar state
      const deltaX = e.clientX - drag.startX;

      let newStart: Date;
      let newEnd: Date;

      if (drag.mode === 'move') {
        const origStartPx = dateToPixel(drag.originalStart, timelineStart, timeScale);
        const origEndPx = dateToPixel(drag.originalEnd, timelineStart, timeScale);
        newStart = clampDate(pixelToDate(origStartPx + deltaX, timelineStart, timeScale));
        newEnd = clampDate(pixelToDate(origEndPx + deltaX, timelineStart, timeScale));
      } else if (drag.mode === 'resize-left') {
        const origStartPx = dateToPixel(drag.originalStart, timelineStart, timeScale);
        let ns = clampDate(pixelToDate(origStartPx + deltaX, timelineStart, timeScale));
        const maxStart = new Date(drag.originalEnd.getTime() - ONE_DAY_MS);
        if (ns > maxStart) ns = maxStart;
        newStart = ns;
        newEnd = drag.originalEnd;
      } else {
        // resize-right
        const origEndPx = dateToPixel(drag.originalEnd, timelineStart, timeScale);
        let ne = clampDate(pixelToDate(origEndPx + deltaX, timelineStart, timeScale));
        const minEnd = new Date(drag.originalStart.getTime() + ONE_DAY_MS);
        if (ne < minEnd) ne = minEnd;
        newStart = drag.originalStart;
        newEnd = ne;
      }

      if (!startField || !endField) return;

      const fieldsToUpdate: Record<string, string> = {};
      if ((drag.mode === 'move' || drag.mode === 'resize-left') && startField) {
        fieldsToUpdate[startField] = newStart.toISOString();
      }
      if ((drag.mode === 'move' || drag.mode === 'resize-right') && endField) {
        fieldsToUpdate[endField] = newEnd.toISOString();
      }

      // Only update if we have valid fields to update
      if (Object.keys(fieldsToUpdate).length > 0) {
        updateRecord({
          tableId,
          recordId: drag.bar.recordId,
          recordRo: { fieldKeyType: FieldKeyType.Id, record: { fields: fieldsToUpdate } },
        }).catch((error) => {
          console.warn('Failed to update record dates:', error);
          toast.error('Failed to update task dates');
        });
      }
    },
    [ganttOptions, tableId, timelineStart, timeScale, bars, validRecordIds, updateRecord]
  );

  return {
    startMove,
    startResizeLeft,
    startResizeRight,
    startDependency,
    onMouseMove,
    onMouseUp,
    pendingGhostBars,
    dependencyLineEnd,
  };
}
