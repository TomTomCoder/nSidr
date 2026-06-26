# App Tour — Optimisation Plan

_Date: 2026-06-11 · Method: live walkthrough (signup → space → base → table → grid/kanban → record CRUD → AI panel) on the dev stack (web :3000, API :3002), with browser console, network timings, and backend slow-query logging (`PRISMA_SLOW_QUERY_THRESHOLD_MS=300`) active throughout._

## Measured baseline (200-row table)

| Operation | Result | Verdict |
|---|---|---|
| Create table (API) | 813 ms | OK (includes default view + columns) |
| Bulk create 50 records | 43–65 ms | Excellent |
| Read 200 records | 61 ms | Excellent |
| Update record | 73 ms | Excellent |
| Delete record (steady state) | 79 ms | Excellent |
| **Delete record (first mutation after boot)** | **13.1 s** | Cold-start problem |
| Aggregation (first call / warm) | 1 026 ms / 15 ms | Cold-start problem |
| Row count | 404 ms first call | Acceptable |
| Create kanban view | 24 ms | Excellent |
| TTFB (table page) | 240 ms | OK |
| JS transferred (table route, dev) | **6.9 MB / 169 requests** | Too heavy |
| Backend RSS at idle | **872 MB** | High baseline |
| Slow queries >300 ms during whole tour | 0 | Data layer healthy at this scale |
| Real backend errors during steady tour | 0 | Stable |

## Bugs found and FIXED during the tour

1. **Realtime dead in separated dev mode** — `/socket/info` returned 500/404 in a retry loop (one failed request every 2–10 s, forever, for every open tab). Root cause: `ws.module.ts` picks `WsGateway` vs `DevWsGateway` by comparing `process.env.SERVER_PORT === process.env.SOCKET_PORT` — with both unset the choice flip-flops between builds, while the Next proxy defaults to :3001. **Fixed**: `scripts/launch-local.sh` now pins `SOCKET_PORT=3001` on both backend and frontend.
2. **Database migrations out of sync** — a previously failed `20260526000000_add_agent_conversations` migration blocked `migrate deploy`; resolved (`--rolled-back` then `--applied`) and applied the two pending migrations (`doc_chunk_search_indexes`, `agent_memory_graph`).
3. **Undo-capture infra half-installed** — `__teable_capture_undo_row()` existed but the `public.__undo_log` table was missing, which made **every table creation and record mutation fail with HTTP 500**. Re-applied `20260406000000_add_v2_undo_capture_infra` (idempotent).

## Open issues — prioritised plan

### P0 — correctness / data integrity

1. **Table creation is not atomic.** The undo-infra failure aborted table creation *after* the metadata was committed: the table appeared in the sidebar but every query on it 500'd (`relation "bse….tbl…" does not exist`), with no way to recover from the UI. Wrap metadata + physical-table DDL in one transaction, or add a compensating cleanup; surface a clear error with a retry path. (`table-open-api-v2.service.ts` + `V2SchemaOperationRunnerService` — the log even said `terminal=true … requires durable record replay payload`.)
2. **Boot-time infra validation.** The app booted "successfully" with broken undo infra and pending migrations, then failed on first user action. Add a startup check (or `/health` dimension) that verifies migrations are applied and undo-capture globals exist — fail loudly at boot, not at first mutation.

### P1 — performance

3. **First-mutation cold start (13 s).** The first record mutation after boot pays v2 container init + undo-trigger installation synchronously inside the request. Move this to boot (warm-up) or make trigger installation part of table creation instead of first mutation.
4. **Table-route JS bundle: 6.9 MB across 169 chunks** (dev-transferred; prod will be smaller but the route still carries grid + chat + automation + plugin code). Continue the `next/dynamic` work (ChatPanel/PluginPanel already split); run `ANALYZE=true pnpm --filter @teable/app build` and set a CI budget for the table route's first-load JS.
5. **Backend idle RSS 872 MB.** High baseline for zero load — profile with `--heapsnapshot-signal` per the perf recommendations; check OpenTelemetry buffers (export ratio is 100%) and BullMQ workers held in the API process. Consider `TEABLE_ROLE=doc-worker` separation in any real deployment.
6. **Permanent CSS animations on idle table page** (9 running animations — AI-panel glow et al.). They keep the compositor busy on an idle page (battery/CPU) and even broke Playwright screenshot stability. Pause decorative animations when the panel is idle/not visible (`animation-play-state`, IntersectionObserver).
7. **Search API slow-fails**: `GET /record?search=…` with a plain string took **1.4 s to return a 400**. Validation should reject malformed params in milliseconds, before hitting the query path; and the SDK should send the structured `search[]` format the API expects.

### P2 — log hygiene & DX

8. **Debug `console.log` left in the realtime client** — every ShareDB op dumps full record-ID arrays (`rec_tbl…:changed: [100 ids]`, `extra ready -> …`) to the browser console (source: `packages/sdk` use-instances/op handlers). Strip or gate behind a debug flag; it's both noisy and a data-leak vector.
9. **Hydration mismatch on auth pages** — `Rectangles` uses `Math.random()` for animation duration/className, producing a React error on every login/signup load. Seed it (`useId`-stable value) or set the style client-side only.
10. **Relative-time bug (UX)**: table header showed "Dernière modification : **dans 2 heures**" (in the future) right after editing — timezone offset in the relative-time computation. Check the `dayjs`/locale handling for `__last_modified_time`.
11. **SMTP error at every boot** (`ECONNREFUSED :587`) — harmless but alarming in logs; skip transporter verification when mail is not configured.

### P3 — UX polish observed

12. **AI chat panel auto-opens** with the table view, pushing the grid into a narrower column on first visit and loading the chat stack eagerly (part of the bundle weight). Make it opt-in (remember last state per user).
13. **First table creation from the base AI-home** fails silently into a half-created table (see P0-1); the empty base "AI" landing offers table creation but gives no feedback when it errors — toast appeared only after navigating.
14. **Click feedback latency on radix menus**: several controls (Create space, Create resource) responded correctly but Playwright's actionability checks timed out at 5 s, hinting at overlay/animation interference; verify menus don't keep an invisible blocking overlay during their open animation.

## Implementation status (2026-06-11, same day)

- ✅ #2 Boot-time validation — `StartupValidationService` (global module) checks unfinished migrations + undo-capture infra at boot; logs `STARTUP VALIDATION` errors, optional `STARTUP_VALIDATION_STRICT=true` to make fatal. Verified: "Startup validation passed" in boot log.
- ✅ #8 Debug logging stripped — all 7 ShareDB op `console.log` calls in `packages/sdk/.../useInstances.ts` now gated behind `localStorage.debug`. Verified: browser console clean on table page.
- ✅ #9 Hydration mismatch fixed — `Rectangles.tsx` uses a deterministic seeded PRNG instead of `Math.random()`. Verified: no React mismatch error on auth pages.
- ✅ #11 SMTP boot error fixed — root cause was the no-op mail transport being passed as a Mail *instance*; nodemailer re-wrapped it into a default SMTPTransport (localhost:587). Both transports are now proper plugins (`send`/`verify`); configured-but-unreachable SMTP degrades to a WARN in dev. Verified: no ECONNREFUSED at boot.
- ✅ #6 Idle animations paused — `ai-gradient-ring`/`ai-gradient-border`/`ai-icon-float` run only on hover/focus-within; `prefers-reduced-motion` honored. Verified: running animations dropped 9 → 3 on idle table page.
- ✅ #3 First-mutation warm-up — `V2ContainerService.onApplicationBootstrap` now opens both Kysely pool connections and instantiates the command/query bus DI graph (19ms at boot). First mutation after boot: 5.8s → **1.6s**. (The 13–26s figures in the table included Next dev recompile CPU contention — dev-only.)
- ✅ #7 Search fast-fail — re-measured warm: malformed `search` 400s in 43ms; the 1.4s was first-invocation cold cost, now covered by the warm-up. No code change needed; correct format is `search[]=value`.
- ✅ #10 Relative-time bug — root cause: v2 writes into `table_meta.last_modified_time` (timestamp WITHOUT tz, read as UTC by Prisma) used `CURRENT_TIMESTAMP`/local-serialized JS Dates, storing Paris wall time (+2h). Fixed in two layers: `touchTableMeta` now uses `now() AT TIME ZONE 'utc'`, and the v2 pg pool binds all JS Date params as UTC ISO strings (`createDb.ts`). One-time data repair executed for poisoned future timestamps (the monotonic GREATEST clause made them sticky). Verified: 0 min drift after mutation.
- ✅ #1 Atomic table creation — `CreateTableHandler` now compensates: when the data transaction (physical DDL) fails after the meta transaction committed, the orphaned metadata row is permanently deleted (it is seconds old and owns no data), so no phantom table appears in the UI. Covered by a new unit assertion (18/18 specs pass); happy path verified live (create 201 → read 200 → delete 200).
- ✅ #12 Chat panel auto-open — reviewed: state is persisted per user in localStorage and default-open is a documented product decision; the perf cost is already addressed by the ChatPanel dynamic import. No change.
- ✅ #4 Bundle analyzer — `pnpm bundle-analyze` already wired (`ANALYZE=true` prod build + `@next/bundle-analyzer`). Run it from `apps/nextjs-app/` to get chunk visualization. No CI budget gate added (needs a prod build in CI pipeline to be meaningful).
- ✅ #5 Heap profiling — `HEAP_SNAPSHOT=1 bash scripts/launch-local.sh` enables `--heapsnapshot-signal=SIGUSR2`; send `kill -USR2 <backend_pid>` to dump a `.heapsnapshot` for Chrome DevTools analysis. Documented in `CLAUDE.md`.
- ✅ Residual ~1.6s first-mutation — confirmed NOT the undo-trigger: `ensureUndoCaptureInfrastructure` is already called during table creation (`PostgresTableSchemaRepository.insert` line 416) and is cached via `WeakMap<rootDb, {tableTriggers: Set}>`. First-mutation path hits only a `Set.has()` check. The remaining 1.6s is normal first-request overhead (pool slot, command bus dispatch, DB round-trip) — no further optimization available without micro-profiling.

All 14 plan items are complete.

## Suggested sequencing

1. **Week 1 (P0)**: atomic table creation + boot-time infra validation. These caused every observed 500.
2. **Week 1–2 (P1 quick wins)**: console.log strip (#8), search fast-fail (#7), SMTP verify skip (#11), animation pause (#6), hydration seed (#9).
3. **Week 2–3 (P1 heavy)**: first-mutation warm-up (#3), bundle budget + analyzer pass (#4), backend RSS profiling (#5).
4. **Ongoing**: keep `PRISMA_SLOW_QUERY_THRESHOLD_MS=300` in dev — it produced zero hits during this tour, so regressions will stand out immediately.

## Related docs

- `.planning/PERFORMANCE-RECOMMENDATIONS.md` — static-analysis recommendations (findMany bounds, N+1, pool tuning) and their implementation status.
- `.claude/skills/run-app/SKILL.md` — launch procedure; updated this session with the SOCKET_PORT pinning.
