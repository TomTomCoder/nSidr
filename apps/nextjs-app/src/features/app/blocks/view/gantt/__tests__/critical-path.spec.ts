import { describe, it, expect } from 'vitest';
import { computeCriticalPath } from '../hooks/useCriticalPath';
import type { GanttBarItem, GanttDependency } from '../type';

const makeBar = (
  recordId: string,
  startDaysOffset: number,
  durationDays: number,
  rowIndex = 0
): GanttBarItem => {
  const start = new Date(2026, 0, 1 + startDaysOffset);
  const end = new Date(2026, 0, 1 + startDaysOffset + durationDays);
  return {
    recordId,
    title: recordId,
    startDate: start,
    endDate: end,
    isMilestone: durationDays === 0,
    isCriticalPath: false,
    rowIndex,
  };
};

describe('computeCriticalPath', () => {
  it('returns correct critical path for a simple linear chain', () => {
    // A(3d) -> B(5d) -> C(2d)
    const bars = [makeBar('A', 0, 3), makeBar('B', 3, 5), makeBar('C', 8, 2)];
    const deps: GanttDependency[] = [
      { fromRecordId: 'A', toRecordId: 'B' },
      { fromRecordId: 'B', toRecordId: 'C' },
    ];
    const result = computeCriticalPath(bars, deps);
    expect(result.has('A')).toBe(true);
    expect(result.has('B')).toBe(true);
    expect(result.has('C')).toBe(true);
  });

  it('identifies the longest path in a diamond DAG', () => {
    // A(1d) -> B(5d) -> D(1d)
    // A(1d) -> C(2d) -> D(1d)
    // Critical path: A -> B -> D (total 7d vs A -> C -> D = 4d)
    const bars = [
      makeBar('A', 0, 1),
      makeBar('B', 1, 5),
      makeBar('C', 1, 2),
      makeBar('D', 6, 1),
    ];
    const deps: GanttDependency[] = [
      { fromRecordId: 'A', toRecordId: 'B' },
      { fromRecordId: 'A', toRecordId: 'C' },
      { fromRecordId: 'B', toRecordId: 'D' },
      { fromRecordId: 'C', toRecordId: 'D' },
    ];
    const result = computeCriticalPath(bars, deps);
    expect(result.has('A')).toBe(true);
    expect(result.has('B')).toBe(true);
    expect(result.has('D')).toBe(true);
    // C is NOT on the critical path
    expect(result.has('C')).toBe(false);
  });

  it('returns empty set for empty dependencies', () => {
    const bars = [makeBar('A', 0, 3), makeBar('B', 5, 2)];
    const deps: GanttDependency[] = [];
    const result = computeCriticalPath(bars, deps);
    expect(result.size).toBe(0);
  });

  it('handles single-node graph with no dependencies', () => {
    const bars = [makeBar('A', 0, 5)];
    const deps: GanttDependency[] = [];
    const result = computeCriticalPath(bars, deps);
    expect(result.size).toBe(0);
  });

  it('handles empty bars array', () => {
    const bars: GanttBarItem[] = [];
    const deps: GanttDependency[] = [{ fromRecordId: 'A', toRecordId: 'B' }];
    const result = computeCriticalPath(bars, deps);
    expect(result.size).toBe(0);
  });

  it('skips cyclic edges gracefully and does not throw', () => {
    // A -> B -> A (cycle — Kahn's algo leaves them out of topoOrder)
    const bars = [makeBar('A', 0, 3), makeBar('B', 3, 2)];
    const deps: GanttDependency[] = [
      { fromRecordId: 'A', toRecordId: 'B' },
      { fromRecordId: 'B', toRecordId: 'A' },
    ];
    expect(() => computeCriticalPath(bars, deps)).not.toThrow();
  });

  it('handles two parallel chains and returns the longer one', () => {
    // Chain 1: X(10d)  — single node, no successor
    // Chain 2: Y(3d) -> Z(3d)  — total 6d
    // Longest single node: X with 10d
    const bars = [makeBar('X', 0, 10), makeBar('Y', 0, 3), makeBar('Z', 3, 3)];
    const deps: GanttDependency[] = [{ fromRecordId: 'Y', toRecordId: 'Z' }];
    const result = computeCriticalPath(bars, deps);
    // X has no deps so it may or may not appear based on whether longest-path considers
    // disconnected nodes. Both X and Z are candidates for endNode — X(10) vs Z(6).
    // X wins, so critical path is just {X}.
    expect(result.has('X')).toBe(true);
    expect(result.size).toBe(1);
  });
});
