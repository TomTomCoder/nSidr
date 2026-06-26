import { useMemo } from 'react';
import type { IGanttViewOptions } from '@teable/core';
import type { GanttBarItem, GanttDependency } from '../type';

interface IUseCriticalPathResult {
  criticalPathIds: Set<string>;
}

/**
 * Pure function: compute the critical path (longest path in the DAG) from bars and dependencies.
 * Uses Kahn's topological sort + longest-path algorithm.
 * Returns a Set of recordIds on the critical path.
 * Returns empty Set when dependencies is empty or bars is empty.
 * Handles cycles gracefully (cyclic edges are skipped by Kahn's algorithm).
 */
export function computeCriticalPath(
  bars: GanttBarItem[],
  dependencies: GanttDependency[]
): Set<string> {
  if (bars.length === 0 || dependencies.length === 0) {
    return new Set<string>();
  }

  // Build duration map (days)
  const durationMap = new Map<string, number>();
  for (const bar of bars) {
    const ms = bar.endDate.getTime() - bar.startDate.getTime();
    durationMap.set(bar.recordId, Math.max(0, ms / (1000 * 60 * 60 * 24)));
  }

  // Build adjacency: successors[id] = [ids that depend on id]
  // predecessors[id] = [ids that id depends on]
  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  const allIds = new Set(bars.map((b) => b.recordId));

  for (const id of allIds) {
    successors.set(id, []);
    predecessors.set(id, []);
  }

  for (const dep of dependencies) {
    successors.get(dep.fromRecordId)?.push(dep.toRecordId);
    predecessors.get(dep.toRecordId)?.push(dep.fromRecordId);
  }

  // Kahn's topological sort
  const inDegree = new Map<string, number>();
  for (const id of allIds) {
    inDegree.set(id, (predecessors.get(id) ?? []).length);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    topoOrder.push(node);
    for (const succ of successors.get(node) ?? []) {
      const newDeg = (inDegree.get(succ) ?? 1) - 1;
      inDegree.set(succ, newDeg);
      if (newDeg === 0) queue.push(succ);
    }
  }

  // Longest path (in days)
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  for (const id of allIds) {
    dist.set(id, durationMap.get(id) ?? 0);
    prev.set(id, null);
  }

  for (const node of topoOrder) {
    const nodeDist = dist.get(node) ?? 0;
    for (const succ of successors.get(node) ?? []) {
      const succDuration = durationMap.get(succ) ?? 0;
      const candidate = nodeDist + succDuration;
      if (candidate > (dist.get(succ) ?? 0)) {
        dist.set(succ, candidate);
        prev.set(succ, node);
      }
    }
  }

  // Find node with max distance
  let maxDist = -Infinity;
  let endNode: string | null = null;
  for (const [id, d] of dist) {
    if (d > maxDist) {
      maxDist = d;
      endNode = id;
    }
  }

  // Backtrack to find critical path
  const criticalSet = new Set<string>();
  let cur: string | null = endNode;
  while (cur !== null) {
    criticalSet.add(cur);
    cur = prev.get(cur) ?? null;
  }

  return criticalSet;
}

export function useCriticalPath(
  bars: GanttBarItem[],
  dependencies: GanttDependency[],
  options: IGanttViewOptions
): IUseCriticalPathResult {
  const criticalPathIds = useMemo<Set<string>>(() => {
    if (!options?.showCriticalPath) {
      return new Set<string>();
    }
    return computeCriticalPath(bars, dependencies);
  }, [bars, dependencies, options]);

  return { criticalPathIds };
}
