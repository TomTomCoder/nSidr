---
phase: 21-knowledge-graph-write-linking
verified: 2026-06-07T00:00:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Boot backend and call create_knowledge_doc via MCP tool, verify row in imported_doc with sourceType='agent' and isIndexed=false"
    expected: "Tool returns {docId, status:'pending'}; subsequent query to imported_doc table shows the row"
    why_human: "Requires live DB + running backend to confirm DB state and resolveAgentCallerUserId helper resolves to a real user id (not agent id)"
  - test: "Boot backend and call link_docs MCP tool between two agent-created docs, then query GET /api/spaces/:spaceId/docs/:docId/agent-links"
    expected: "Linked doc appears in outgoing list with correct label badge in LinkedDocsPanel"
    why_human: "UI rendering of label badges and end-to-end link traversal UI cannot be verified programmatically"
  - test: "Perform a hybrid search with traverseLinks:true and verify results include content from linked docs up to maxHops=2"
    expected: "Search returns chunks from neighbor docs not in the direct scope"
    why_human: "Requires live pgvector DB with indexed docs and doc_link rows to confirm the CTE expands scope correctly"
---

# Phase 21: Knowledge Graph Write/Linking — Verification Report

**Phase Goal:** Implement knowledge graph write path and entity linking — agents create/edit docs (KG-01), docs link to each other (KG-02), hybrid search traverses N hops through links (KG-03), all surfaced via 4 MCP tools and a UI sidebar.
**Verified:** 2026-06-07T00:00:00Z
**Status:** human_needed (all automated checks pass; 3 live-boot tests cannot be verified programmatically)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DocSourceType enum includes 'agent' value | VERIFIED | schema.prisma line 1083: `agent` present; migration SQL `ALTER TYPE "DocSourceType" ADD VALUE IF NOT EXISTS 'agent'` |
| 2 | doc_link table accepts label + createdBy for agent-authored links | VERIFIED | schema.prisma lines 1159-1160: `label String?`, `createdBy String?`; DocLinkService.linkDocs writes both fields |
| 3 | Self-links rejected at DB layer via CHECK | VERIFIED | migration.sql lines 10-12: `doc_link_no_self_link` CHECK constraint; DocLinkService.linkDocs fast-fails before DB with BadRequestException |
| 4 | UNIQUE (fromDocId, toDocId, label) enforced | VERIFIED | schema.prisma line 1163: `@@unique([fromDocId, toDocId, label])`; migration.sql lines 15-16: `CREATE UNIQUE INDEX doc_link_from_to_label_uq` |
| 5 | Agent can create doc via KnowledgeDocService.createDoc | VERIFIED | knowledge-doc.service.ts exists, substantive (114 lines), wired in doc-search.module.ts (providers + exports line 58/67), called from agent-execution.service.ts case 'create_knowledge_doc' |
| 6 | Agent can link two docs via DocLinkService.linkDocs | VERIFIED | doc-link.service.ts exists, substantive (164 lines), wired in doc-search.module.ts (providers + exports line 59/68), called from agent-execution.service.ts case 'link_docs' |
| 7 | hybridSearch supports traverseLinks + maxHops CTE expansion | VERIFIED | search.service.ts has `traverseLinks?`, `maxHops?`, `expandScopeViaLinks` with `WITH RECURSIVE neighbors(id, depth)` CTE; parameterized, not string-interpolated |
| 8 | 4 MCP tools registered in agent-tool-registry.service.ts | VERIFIED | Lines 183, 206, 225, 246: create_knowledge_doc, update_knowledge_doc, link_docs, get_doc_links using {type:'function', function:{...}} shape |
| 9 | LinkedDocsPanel UI component fetches /api/.../agent-links and renders | VERIFIED | LinkedDocsPanel.tsx: 149 lines, fetches `/api/spaces/${spaceId}/docs/${docId}/agent-links`, imported and rendered in DocEditorArea.tsx line 309; endpoint exists in doc-search.controller.ts line 74 |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/db-main-prisma/prisma/postgres/schema.prisma` | DocSourceType+'agent', DocLink+label/createdBy | VERIFIED | Lines 1079-1083 (enum), 1159-1163 (model fields + unique constraint) |
| `packages/db-main-prisma/prisma/postgres/migrations/20260606000000_kg_agent_docs_and_doc_links/migration.sql` | ALTER TYPE + ALTER TABLE + CHECK + UNIQUE | VERIFIED | 16-line migration, all 4 DDL statements present |
| `apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.ts` | KnowledgeDocService.createDoc / updateDoc | VERIFIED | 114 lines, both methods substantive with RBAC, word-count, transaction |
| `apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.spec.ts` | vitest unit coverage | VERIFIED | 7 `it(` blocks |
| `apps/nestjs-backend/src/features/doc-search/doc-link.service.ts` | DocLinkService.linkDocs / getOutgoing / getIncoming | VERIFIED | 164 lines, all three methods with self-link guard, RBAC, label filter |
| `apps/nestjs-backend/src/features/doc-search/doc-link.service.spec.ts` | vitest coverage | VERIFIED | 7 `it(` blocks |
| `apps/nestjs-backend/src/features/doc-search/search.service.traverse.spec.ts` | traverseLinks spec | VERIFIED | 9 `it(` blocks |
| `apps/nestjs-backend/src/features/agent/mcp/kg-tools.integration.spec.ts` | MCP tool integration spec | VERIFIED | 10 `it(` blocks |
| `apps/nextjs-app/src/features/app/blocks/doc-search/LinkedDocsPanel.tsx` | UI sidebar | VERIFIED | 149 lines, fetches agent-links endpoint, rendered from DocEditorArea |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| knowledge-doc.service.ts | PrismaService | constructor DI (value import) | VERIFIED | `import { PrismaService } from '@teable/db-main-prisma'` line 2 |
| doc-search.module.ts | KnowledgeDocService | providers + exports | VERIFIED | Lines 58, 67 |
| doc-search.module.ts | DocLinkService | providers + exports | VERIFIED | Lines 59, 68 |
| agent-execution.service.ts | KnowledgeDocService | case 'create_knowledge_doc' + case 'update_knowledge_doc' | VERIFIED | Lines 711, 732 |
| agent-execution.service.ts | DocLinkService | case 'link_docs' + case 'get_doc_links' | VERIFIED | Lines 746, 762 |
| agent-execution.service.ts | resolveAgentCallerUserId | helper called for all 3 write dispatchers | VERIFIED | Line 103 (def), used at 724, 742, 758 |
| LinkedDocsPanel.tsx | /api/spaces/:spaceId/docs/:docId/agent-links | fetch in useQuery | VERIFIED | Line 42 in LinkedDocsPanel.tsx; endpoint at doc-search.controller.ts line 74 |
| DocEditorArea.tsx | LinkedDocsPanel | import + JSX render | VERIFIED | Line 16 (import), line 309 (render) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| LinkedDocsPanel.tsx | outgoing/incoming links | `useQuery` fetches GET /api/.../agent-links | Endpoint calls DocLinkService.getOutgoing/getIncoming → prisma.docLink.findMany | FLOWING |
| knowledge-doc.service.ts | createDoc result | prisma.importedDoc.create | Real DB insert returning row.id | FLOWING |
| doc-link.service.ts | linkDocs result | prisma.docLink.create | Real DB insert with fromDocId, toDocId, label | FLOWING |
| search.service.ts traversal | expanded scope | prisma.$queryRaw WITH RECURSIVE | Recursive CTE on doc_link expanding docId set | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for DB-dependent paths (requires live Postgres + booted backend). Live UAT documented in 21-SUMMARY.md confirms create_knowledge_doc, get_doc_links, and tools/list pass against booted dev stack.

### Probe Execution

No probe-*.sh files declared or found for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| KG-01 | 21-02 | Agent creates/updates knowledge docs | SATISFIED | KnowledgeDocService.createDoc + updateDoc; MCP tools create_knowledge_doc + update_knowledge_doc wired |
| KG-02 | 21-01, 21-03 | Agent-authored doc-doc links with label discrimination | SATISFIED | DocLinkService.linkDocs/getOutgoing/getIncoming; schema migration with UNIQUE + CHECK; LinkedDocsPanel UI |
| KG-03 | 21-04 | Traversal queries via hybridSearch | SATISFIED | search.service.ts expandScopeViaLinks recursive CTE; traverseLinks/maxHops options wired |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | No TBD/FIXME/XXX/placeholder found in phase files | — | — |

No debt markers found. No stub implementations detected. All services contain substantive logic.

---

### Human Verification Required

#### 1. create_knowledge_doc live call — DB row verification

**Test:** Boot backend, call `tools/call create_knowledge_doc({title:"Test",rawContent:"Hello world"})` via MCP endpoint; then query `SELECT id, "sourceType", "isIndexed" FROM imported_doc ORDER BY "createdAt" DESC LIMIT 1`
**Expected:** Row exists with sourceType='agent', isIndexed=false; tool returns `{docId, status:'pending'}`
**Why human:** Requires live Postgres + NestJS + resolveAgentCallerUserId resolving to a real users.id (not agent.id — the FK violation bug was fixed in commit d9a9b88a4 but only live UAT can confirm)

#### 2. LinkedDocsPanel renders agent-authored links with label badges

**Test:** Create two docs via MCP, call link_docs with label='references', open the doc in the UI, verify LinkedDocsPanel sidebar appears with the outgoing link and label badge
**Expected:** Sidebar shows "references" badge next to the linked doc title
**Why human:** UI rendering, React Query cache hydration, and label badge display cannot be verified by grep

#### 3. traverseLinks expands hybrid search scope across linked docs

**Test:** Index two docs with distinct content, link them via link_docs, run hybridSearch with traverseLinks:true and a query matching only the second doc's content but scoped to the first doc
**Expected:** Results include content from the second (linked) doc
**Why human:** Requires live pgvector + indexed docs + CTE execution against real DB rows; no fixtures cover end-to-end path

---

### Gaps Summary

No gaps found. All 9 must-haves are verified at the code level. The 3 human verification items are behavioral integration tests that require a running backend+DB+pgvector stack and cannot be confirmed by static analysis.

Commits verified against repo: 7 commits from 39264b938 to d9a9b88a4 all present in git log.

---

_Verified: 2026-06-07T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
