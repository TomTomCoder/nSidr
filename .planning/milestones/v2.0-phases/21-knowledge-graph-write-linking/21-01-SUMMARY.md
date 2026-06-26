---
phase: 21-knowledge-graph-write-linking
plan: 01
status: complete
completed: 2026-06-06
requirements: [KG-01, KG-02]
tasks_completed: 2/2
files_created:
  - packages/db-main-prisma/prisma/postgres/migrations/20260606000000_kg_agent_docs_and_doc_links/migration.sql
files_modified:
  - packages/db-main-prisma/prisma/postgres/schema.prisma
---

# Phase 21 Plan 01: Schema Migration — Agent Docs + Doc Links Summary

Extended `DocSourceType` enum with `agent` value and added `label` + `createdBy` columns to `doc_link` with a self-link CHECK and `(fromDocId,toDocId,label)` UNIQUE — enabling agent-authored docs (KG-01) and agent-authored semantic links (KG-02) to coexist with existing ingestion-extracted markdown links in one table.

## What shipped

| Task | What | File |
|------|------|------|
| 1 | schema.prisma: enum + DocLink extension (label, createdBy, named unique) | `packages/db-main-prisma/prisma/postgres/schema.prisma` |
| 2 | migration SQL + applied + client regenerated + psql verified | `packages/db-main-prisma/prisma/postgres/migrations/20260606000000_kg_agent_docs_and_doc_links/migration.sql` |

## Verification

- `prisma validate` → "schema is valid"
- `prisma migrate deploy` → "All migrations have been successfully applied"
- `prisma generate` → completed
- psql verification one-liner → `t` (enum has 'agent', label + createdBy columns exist, doc_link_no_self_link CHECK exists)

## Success Criteria

- [x] DocSourceType enum has 4 values including 'agent'
- [x] doc_link has label TEXT + createdBy TEXT nullable columns
- [x] doc_link_no_self_link CHECK constraint exists
- [x] doc_link_from_to_label_uq UNIQUE index exists
- [x] Prisma client regenerated — downstream plans can use `prisma.docLink.create({data:{label, createdBy}})`

## Deviations

None — plan executed as written.

## Self-Check: PASSED
