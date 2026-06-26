---
phase: 21-knowledge-graph-write-linking
plan: 03
status: complete
completed: 2026-06-06
requirements: [KG-02]
tasks_completed: 2/2
files_created:
  - apps/nestjs-backend/src/features/doc-search/doc-link.service.ts
  - apps/nestjs-backend/src/features/doc-search/doc-link.service.spec.ts
files_modified:
  - apps/nestjs-backend/src/features/doc-search/doc-search.module.ts
test_count_added: 7
---

# Phase 21 Plan 03: DocLinkService Summary

`DocLinkService` exposes `linkDocs`, `getOutgoing`, `getIncoming` for
agent/user-authored semantic links. Coexists with ingestion-extracted links
(`label IS NULL` — owned by `LinkExtractorService`); the getters explicitly
filter `label IS NOT NULL` so the UI panel and `get_doc_links` MCP tool only
see semantic agent/user authored links.

## Behavior

- `linkDocs` — fast-fail self-link `BadRequestException`; RBAC via
  `findMany({id:in:[from,to], spaceId})` then `length < 2 → NotFoundException`;
  catches Prisma `P2002` from `doc_link_from_to_label_uq` → `ConflictException`.
  Agent rows store `linkText=''`, `linkType='internal'`, `label=input.label`,
  `createdBy=callerId`.
- `getOutgoing` / `getIncoming` — RBAC pre-check on source doc; `findMany`
  with `label: { not: null }` and orderBy desc; maps `toDoc.title` /
  `fromDoc.title` for UI display. Outgoing rows whose `toDoc` resolves to
  null (legacy external links) are filtered out.

## Tests (7 vitest cases, all green)

linkDocs happy · linkDocs self-link · linkDocs cross-space · linkDocs P2002 ·
getOutgoing happy · getOutgoing out-of-space · getIncoming symmetric

## Module wiring

`DocSearchModule.providers` += `DocLinkService` (alongside
KnowledgeDocService from 21-02); `exports` += same. Plan 21-05 (MCP dispatch)
and 21-06 (UI route) both DI it.

## Verification

- `pnpm exec vitest run` → 7 passed
- No `import type` for DI deps (grep gate clean)
- All failure paths typed (`BadRequestException` / `NotFoundException` / `ConflictException`)

## Deviations

None — plan executed as written.

## Self-Check: PASSED
