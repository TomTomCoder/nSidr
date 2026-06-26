'use client';

/**
 * MemoryPanel — Phase 3 agent-memory-graph UI.
 *
 * Read-only sidebar listing the entities + relations the ingest pipeline extracted from the
 * currently open doc. Fetches GET /api/spaces/:spaceId/docs/:docId/memory (returns
 * { entities, relations }, matching the get_memory MCP tool). Clones the LinkedDocsPanel
 * pattern — no new route, no editing. All values are rendered as JSX text (React escapes).
 */

import { useQuery } from '@tanstack/react-query';

interface MemoryEntity {
  id: string;
  name: string;
  type: string;
  summary: string;
  version: number;
}

interface MemoryRelation {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  label: string;
}

interface DocMemoryResponse {
  entities: MemoryEntity[];
  relations: MemoryRelation[];
}

interface IMemoryPanelProps {
  spaceId: string;
  docId: string;
}

async function fetchDocMemory(spaceId: string, docId: string): Promise<DocMemoryResponse> {
  const res = await fetch(`/api/spaces/${spaceId}/docs/${docId}/memory`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as DocMemoryResponse;
}

const Header = () => (
  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    Memory
  </h3>
);

export function MemoryPanel({ spaceId, docId }: IMemoryPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['doc-memory', spaceId, docId],
    queryFn: () => fetchDocMemory(spaceId, docId),
    enabled: Boolean(docId),
  });

  if (isLoading) {
    return (
      <div className="border-t p-4">
        <Header />
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded-sm bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded-sm bg-muted" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-t p-4">
        <Header />
        <p className="text-xs text-destructive">Couldn&apos;t load memory — try again.</p>
      </div>
    );
  }

  const entities = data?.entities ?? [];
  const relations = data?.relations ?? [];
  if (entities.length === 0) {
    return null;
  }

  const nameById = new Map(entities.map((e) => [e.id, e.name]));

  return (
    <div className="border-t p-4">
      <Header />

      <div className="mb-3">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Entities ({entities.length})
        </p>
        <ul className="space-y-1.5">
          {entities.map((e) => (
            <li key={e.id} className="text-xs">
              <span className="font-medium text-foreground">{e.name}</span>
              <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                {e.type}
              </span>
              {e.summary ? (
                <p className="mt-0.5 line-clamp-2 text-muted-foreground">{e.summary}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {relations.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Relations ({relations.length})
          </p>
          <ul className="space-y-1">
            {relations.map((r) => (
              <li key={r.id} className="truncate text-xs text-foreground">
                <span>{nameById.get(r.fromEntityId) ?? '?'}</span>
                <span className="mx-1 text-muted-foreground">{r.label}</span>
                <span>{nameById.get(r.toEntityId) ?? '?'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
