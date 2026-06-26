# Teable — what must be done next

_Captured 2026-06-14 after milestone v2.0 archival + stability/perf audits. Single source of truth for outstanding work; merge into ROADMAP / next milestone when scoping v3.0._

Priority key:
- **P0** — does measurable harm to users today (perf, OOM risk, stability)
- **P1** — silent debt that will hurt within the next sprint
- **P2** — polish / nice-to-have / process

---

## P0 — must do before next push to production

### 1. Cut the table-switch re-render cascade

**Evidence:** 18 inline `<X.Provider value={{...}}>` literals across `packages/sdk/src` + `apps/nextjs-app/src`. Each rebuilds the value on every render → every consumer re-renders. `renderWithHooks` was the #1 self-time in profiling (~5.9s dev / dominant in prod).

**Status (2026-06-14):** raw-literal sweep complete. 10 production providers memoized this session:
- SDK: `LinkViewProvider`, `StandaloneViewProvider` (empty-state extracted to constants), `ShareViewProxy`, `QueryFormProvider` (correct path is `packages/sdk/src/components/base-query/`), `ExpandRecordWrap`, `Modal`, `CommentPanel`, `FilterLink`, `FilterWithTable`
- App: `Design`, `SpaceInnerSideBar`, `SelectTable` (LinkOptions), `CreateBaseModal`
- Skipped: `BaseList.tsx:264` — literal lives inside a render helper (`renderBaseRow`), no useMemo possible without extracting a row component. Marginal cost (one extra object alloc per row); revisit when refactoring BaseList to memoized rows.
- Test files left as-is.

**Still open:** memoize always-mounted shells (`TableInfo`, `Collaborators`, `RightActions`, view-list items) with `React.memo`.

**Effort:** S–M · **Risk:** low · **Cache memo pattern already proven** in Table/PersonalViewProxy/DraggableWrapper/BaseNodeTree.

### 2. Shrink the SSR page payload (305 KB → <128 KB)

**Evidence:** Next.js warns "large page data" on every `/base/[baseId]/[[...slug]]` (305 KB) and `/space/[spaceId]` (305 KB) and `/admin/setting` (434 KB) load. SSR (`backend/api/rest/ssr-api.ts`) serializes base + all tables + all fields (full options/formula/link/AI config) + all views (filter/sort/group/columnMeta) + group points + permissions, then hydrates them client-side.

**Action:**
- Only SSR the *active* table/view; lazy-load others client-side
- Trim field/view payloads to what first paint needs
- Move large lists off SSR props into a client query with `staleTime`

**Effort:** M · **Risk:** medium (touches SSR contract — verify hydration mismatch-free)

### 3. Defer / chunk the synchronous grid mount

**Evidence:** settled prod switch ≈ 6–8 s long-task for a *3-record* table → cost is fixed grid-mount overhead (field-instance construction × fields + canvas layout setup), independent of data volume.

**Action:**
- Build field instances lazily; memoize across switches (cache by tableId)
- Defer non-visible work (off-screen panels) with `requestIdleCallback`
- Verify the ~9 `dynamic()` boundaries actually exclude heavy panels from the table chunk (run `cd apps/nextjs-app && pnpm bundle-analyze`)

**Effort:** M–L · **Risk:** medium (grid is core path)

### 4. ~~Wire `--heapsnapshot-signal=SIGUSR2` in prod backend launch~~ — DONE locally

**Status (verified 2026-06-14):** flag already wired in `scripts/launch-local.sh:103` behind `HEAP_SNAPSHOT=1`. Only the prod start command still needs it — confirm whatever launches the prod backend sets `HEAP_SNAPSHOT=1` (or hard-wires the flag).

### 5. ~~Enable slow-query logging by default~~ — DONE locally

**Status (verified 2026-06-14):** `apps/nestjs-backend/.env:6` sets `PRISMA_SLOW_QUERY_THRESHOLD_MS=300` locally. Outstanding: set the same in staging/prod env (outside this repo).

---

## P1 — silent debt

### 6. Drive the unbounded-`findMany` baseline down — progress 2026-06-14

**Status:** baseline 234 → **186** sites (−48).
- 2 real caps applied on user-facing trash lists (`trash.service.ts:142` space-trash, `:195` base-trash) — both `take: 1000` + `orderBy deletedTime desc`, with TODO for proper cursor.
- Heuristic in `scripts/check-unbounded-findmany.sh` widened to recognize any `*Id: { in: }` (not just bare `id:`), removing ~46 false positives where calls were already bounded by `recordId`/`parentId`/`tableId`/etc.

**Still open:**
- `apps/nestjs-backend/src/features/doc-search/doc-search.controller.ts:156` (listDocs — needs UI pagination decision first)
- `apps/nestjs-backend/src/features/field/open-api/field-open-api.service.ts` (6 sites: 188, 356, 388, 1041, 1269, 1750)
- Other trash sites at 495, 943, 990 (small per-base lists; probably fine)
- Re-baseline after each future batch.

### 7. ~~Refactor `useAppBuilderStore.generate`~~ — DONE 2026-06-14

**Status:** SSE handling extracted to `createStreamEventHandler` (pure factory) + read loop extracted to `readSseStream`. `generate` is now ~25 lines (setup → stream → catch); eslint-disable removed. Typecheck clean.

### 8. Frontend smoke tests — partial 2026-06-14

**Status:**
- ✅ `/agent/new` wizard — existing `e2e/agent-wizard.spec.ts`
- ✅ `/agent/[id]` ChatContainer — existing `e2e/agent-chat.spec.ts`
- ✅ Table-switch keeps grid mounted — added `e2e/table-switch-smoke.spec.ts`

Outstanding: run the new spec green against a fresh `pnpm start:local`, fold into CI matrix.

### 9. Re-verify runtime OOM under load

**Evidence:** memory file flagged "still open"; today's healthy run contradicts. Cannot conclude without a load test against a large base.

**Action:** seed a base with 50k records + run a concurrent agent loop for 30 min. Capture heap on SIGUSR2 if RSS climbs.

**Effort:** S · **Risk:** none · **Blocks:** #4 must ship first

---

## P2 — process / polish

### 10. ~~`pnpm perf:bench` prod-mode benchmark~~ — DONE 2026-06-14

**Status:** `pnpm perf:bench` wraps `scripts/perf-bench.sh` (g:build + start:separated, `--no-build` flag for fast iteration). Documented in `.planning/PERFORMANCE-RECOMMENDATIONS.md` under "Benchmarking methodology".

### 11. ~~Drop the `docSearchQueryClient` bare instance~~ — DONE 2026-06-14

**Status:** `apps/nextjs-app/src/AppProviders.tsx` now uses `createQueryClient()` from `@teable/sdk/context` (60s staleTime, no window-focus refetch).

### 12. Live UAT for milestone v2.0 (creds-blocked items)

**Status:** code-complete; 5 phases (15, 16, 17, 21, 22) + 3 ARH items deferred per `v2.0-MILESTONE-AUDIT.md`. Blocked on credentials.

**Required env wiring:**
- Live OpenAI/Anthropic key (Phase 15/16/17/21/22 + ARH-01 failover needs a primary + fallback)
- Gmail/Slack/GitHub OAuth client IDs (ARH-04 per-user OAuth)
- Second user account in QA space (ARH-04 fallback test)
- A configured agent with knowledge tools (Phase 21, ARH-02 guardrail, ARH-03 HITL)

Once wired, a ~1-hour UAT sweep closes all deferred items.

**Effort:** M (one-shot setup) · **Risk:** none

### 13. ~~Decide on parallel-work-in-progress~~ — STALE

**Status (verified 2026-06-14):** the agent-planner / reflection work was committed in `648e5c5e2 feat(agent): plan-and-execute + reflexion loop`. Only untracked files now are 2 planning notes + `.gitignore` edit — no in-flight code.

---

## Done this session (reference, no action needed)

- ✅ ROADMAP reconciled; milestone v2.0 archived (`tag v2.0` pushed)
- ✅ Migration `20260526000000_add_agent_conversations` tracked (fresh-clone fix)
- ✅ Concurrent-delete invariant in v2 postgres repo (no false snapshot-loss errors)
- ✅ Agent route pages, 5 AgentChat components, run-app skill, agent-wizard e2e all tracked
- ✅ `start:local` workflow scripted + documented in README
- ✅ `check-no-direct-ai-sdk.sh` false-positive fix (`@ai-sdk/provider` types permitted)
- ✅ `check-unbounded-findmany.sh` CI guard + 234-site baseline
- ✅ Worker findMany paths chunked (ingestion recovery, vector-sync backfill)
- ✅ Memory updated to reflect today's healthy backend observation
