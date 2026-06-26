---
phase: 21-knowledge-graph-write-linking
plan: 02
status: complete
completed: 2026-06-06
requirements: [KG-01]
tasks_completed: 2/2
files_created:
  - apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.ts
  - apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.spec.ts
files_modified:
  - apps/nestjs-backend/src/features/doc-search/doc-search.module.ts
test_count_added: 7
---

# Phase 21 Plan 02: KnowledgeDocService Summary

`KnowledgeDocService` owns agent-authored doc writes (createDoc / updateDoc).
Lives in the `doc-search` feature dir to avoid a Phase-16-style DI cycle with
`agent/`. Depends only on `PrismaService` (value import — Phase 17 bug-1 lesson honoured).

## Behavior

- `createDoc` — inserts ImportedDoc with `sourceType='agent'`, `isIndexed=false`,
  `chunkCount=0`, `indexProgress=0`; computed wordCount; returns
  `{docId, status:'pending'}`. Empty title or rawContent → `BadRequestException`.
- `updateDoc` — RBAC-gates by `doc.spaceId === callerSpaceId` (NotFoundException
  on mismatch — opaque, no enumeration). Wraps `docChunk.deleteMany` +
  `importedDoc.update` in `prisma.$transaction([...])` so stale chunks cannot
  survive a partial failure (D-21-04 full re-index lock).

## Tests (7 vitest cases, all green)

createDoc happy path · createDoc empty title · createDoc empty rawContent ·
updateDoc happy path · updateDoc wrong space · updateDoc unknown docId · updateDoc empty rawContent

## Module wiring

`DocSearchModule.providers` += `KnowledgeDocService`; `exports` += same. Plan 21-05 (AgentModule) can now DI it.

## Verification

- `pnpm exec vitest run` → 7 passed
- grep gate: zero `import type { PrismaService | BadRequestException | NotFoundException }`
- No new `@ai-sdk/*` imports (service is non-AI)
- All failure paths typed (`BadRequestException` / `NotFoundException`)

## Deviations

None — plan executed as written.

## Self-Check: PASSED
