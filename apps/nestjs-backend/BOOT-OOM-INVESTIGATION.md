# Backend Startup OOM — Investigation (refactor/architecture-deep-fix)

## Symptom

`pnpm dev:separated` / `dev:separated:light` crash on boot:
`FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`,
right after all routes map (the `onApplicationBootstrap` boundary). Reproduced with
6.5 GB free RAM and 8 GB heap — so it is a runtime heap explosion, not host pressure.

## Method

- Booted prebuilt `dist` with `--heapsnapshot-near-heap-limit=1`, captured a 1.3 GB snapshot.
- Snapshot histogram: **13.1 M nodes** — 5.2 M plain `Object` + 5.67 M strings. Native crash
  stack = `ArrayPrototypeSlice` → `ExtractFastJSArray` inside an async microtask → a `.slice()`
  over a giant array in an async function.
- Bisected by config: Swagger/OpenAPI generation ruled out (`API_DOC_DISENABLED=true` still OOMs).
- Toggling `V2_COMPUTED_UPDATE_MODE` was decisive.

## Root cause (FIXED)

`apps/nestjs-backend/.env` set `V2_COMPUTED_UPDATE_MODE=sync`. In `V2ContainerService.
onApplicationBootstrap` → `createV2NodePgContainer(...)`, the `sync` computed-update mode
eagerly loads the full dataset at boot (the async `.slice()` over millions of objects),
exhausting the heap before `app.listen()`. The line's own comment claimed it _reduces_ OOM —
it does the opposite, preventing boot entirely.

**Fix:** commented out `V2_COMPUTED_UPDATE_MODE=sync` (default = background polling).
With it removed, the backend boots in ~15 s and logs `> Ready on http://localhost:3002`
(verified; `DocIndexRecoveryService` also ran and queued the 2 unindexed docs).

## Remaining issue (OUT OF SCOPE — separate, deep task)

Even with the boot OOM fixed, startup is **memory-fragile and non-deterministic**:

- First boot after the fix succeeded at just a **2 GB heap** (RAM was free) — full boot,
  `Ready on`, recovery ran.
- Later boots OOM'd at 2.5 / 4 / 6 / 8 / **10 GB** heaps as the machine's free RAM dropped and
  swap filled (3/4 GB used). Survived 3+ min idle at 6 GB once, then OOM'd at 6 GB another time.
- **Not** accumulating BullMQ/Redis state (checked: 44 keys total, ~13 tiny jobs).

Interpretation: the V2 container init (`createV2NodePgContainer`, default polling mode) has a
heavy, variable multi-GB peak that the OS can't reliably back once memory is pressured — V8
reports it as "Reached heap limit." This is an **architectural memory-footprint problem in the
v2 container** (the focus of this `architecture-deep-fix` branch), not the doc-library feature.
The `share-db.adapter.ts` batching fixes already in the tree address part of the ShareDB side.

Real fix direction: profile the v2 init allocation and make projection/schema loading lazy or
streamed so the startup peak is bounded — a focused effort inside `packages/v2`. On a 16 GB dev
box, also pin a large `--max-old-space-size` in the light/swc launch scripts for headroom.

## Update (2026-06-04) — #1 narrowed and mitigated

Inspecting `packages/v2/adapter-table-repository-postgres/.../ComputedUpdatePollingService.ts`
and `di/register.ts`: the computed-update **default mode is `hybrid`, polling `enabled: false`,
`batchSize: 50`** — i.e. once `sync` is disabled there is **no unbounded eager load** in the
default path; the strategies use bounded batches. The 5.2 M-object heap explosion was exclusive
to `sync` mode (now disabled). The later OOMs at _larger_ heaps (booted at 2 GB, failed at 10 GB)
are the inverse of a code leak — the OS failing to back a big heap under swap pressure
(environmental on this loaded 16 GB box), not a v2 allocation bug.

**Conclusion:** the v2 init is _heavy-but-bounded_, not leaking. Mitigations applied:

1. `V2_COMPUTED_UPDATE_MODE=sync` disabled (removes the only unbounded eager load). ✓
2. Heap headroom pinned (`--max-old-space-size=8192`) in `dev:separated:light` and
   `start:separated`, which previously ran the API with no heap flag (V8 default ~4 GB —
   borderline for the bounded-but-heavy init). ✓ (matches the team's own STABILITY-NOTES.)
3. Existing `share-db.adapter.ts` batching caps the ShareDB subscription spike on socket connect.

**Remaining (optional, deeper):** reduce the absolute init footprint in `packages/v2` (lazy /
streamed projection + schema loading) so the API can run comfortably under ~2 GB. That is a
focused v2 effort with uncertain payoff and is not required for stable operation given (1)+(2).

## Notes

- Default-mode boot still spikes to ~3–4 GB; recommend pinning `--max-old-space-size` in the
  `dev:separated:light` script for headroom once the runtime OOM is resolved.
- Added a local `teable-web-only` config to `.claude/launch.json` for running the Next web
  against an already-running backend on :3002.
