'use client';

/**
 * LinkedDocsPanel — Phase 21-06 KG-02 UI.
 *
 * Read-only sidebar that lists agent/user-authored doc-doc links (label IS NOT
 * NULL) for the currently open doc. Fetches GET /api/spaces/:spaceId/docs/:docId/agent-links
 * which returns the canonical {outgoing, incoming} shape (matches the
 * `get_doc_links` MCP tool).
 *
 * XSS safety: all label/title values are rendered as JSX text children — React
 * escapes them by default. No raw-HTML injection props are used (T-21-21).
 *
 * Out of scope for v1 (per 21-CONTEXT.md phase_boundary): create/delete UI,
 * inline link editing, force-directed graph view.
 */

import { useQuery } from '@tanstack/react-query';
import { useDocEditorStore } from './useDocEditorStore';

interface LinkRow {
  linkId: string;
  toDocId?: string;
  fromDocId?: string;
  toTitle?: string;
  fromTitle?: string;
  label: string | null;
  createdAt: string;
}

interface AgentLinksResponse {
  outgoing: LinkRow[];
  incoming: LinkRow[];
}

interface ILinkedDocsPanelProps {
  spaceId: string;
  docId: string;
}

async function fetchAgentLinks(spaceId: string, docId: string): Promise<AgentLinksResponse> {
  const res = await fetch(`/api/spaces/${spaceId}/docs/${docId}/agent-links`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as AgentLinksResponse;
}

export function LinkedDocsPanel({ spaceId, docId }: ILinkedDocsPanelProps) {
  const setSelectedDoc = useDocEditorStore((s) => s.setSelectedDoc);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['doc-agent-links', spaceId, docId],
    queryFn: () => fetchAgentLinks(spaceId, docId),
    enabled: Boolean(docId),
  });

  if (isLoading) {
    return (
      <div className="border-t p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Linked docs
        </h3>
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
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Linked docs
        </h3>
        <p className="text-xs text-destructive">Couldn&apos;t load links — try again.</p>
      </div>
    );
  }

  const outgoing = data?.outgoing ?? [];
  const incoming = data?.incoming ?? [];
  const hasAny = outgoing.length > 0 || incoming.length > 0;

  if (!hasAny) {
    return null;
  }

  return (
    <div className="border-t p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Linked docs
      </h3>

      {outgoing.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Outgoing
          </p>
          <ul className="space-y-1">
            {outgoing.map((row) => (
              <li key={row.linkId}>
                <button
                  type="button"
                  onClick={() => row.toDocId && setSelectedDoc(row.toDocId)}
                  className="block w-full truncate text-left text-xs text-foreground hover:underline"
                >
                  {row.label ? <span className="text-muted-foreground">{row.label}: </span> : null}
                  <span>{row.toTitle ?? row.toDocId}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {incoming.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Incoming
          </p>
          <ul className="space-y-1">
            {incoming.map((row) => (
              <li key={row.linkId}>
                <button
                  type="button"
                  onClick={() => row.fromDocId && setSelectedDoc(row.fromDocId)}
                  className="block w-full truncate text-left text-xs text-foreground hover:underline"
                >
                  {row.label ? <span className="text-muted-foreground">{row.label}: </span> : null}
                  <span>{row.fromTitle ?? row.fromDocId}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
