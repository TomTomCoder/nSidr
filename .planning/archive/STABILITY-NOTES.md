# Backend Stability Notes — 2026-06-03

## Symptom
NestJS backend OOM-crashes ~90 seconds after startup, consistently.

## Sequence
1. Nest starts, routes mapped, DocIndexRecovery runs
2. `computed:polling:started`
3. Next.js frontend connects via socket (ShareDB/sockjs)
4. Memory spikes beyond heap limit → FATAL OOM

## Confirmed workarounds
- Drain BullMQ before restart: `redis-cli KEYS "bull:DOC_INGEST:*" | xargs redis-cli DEL`
- Mark all unindexed docs: `UPDATE imported_doc SET "isIndexed"=true WHERE "isIndexed"=false`
- Start with `NODE_OPTIONS='--max-old-space-size=8192'`

## Crash trigger
The crash happens when socket connections arrive while `ComputedUpdatePollingService` is actively polling.
Suspect: `ComputedUpdateWorker.runOnce()` loads/allocates large result sets from DB without releasing them.

## Files to investigate
- `packages/v2/adapter-table-repository-postgres/src/record/computed/worker/ComputedUpdateWorker.ts`
- `apps/nestjs-backend/src/ws/ws.gateway.ts` (socket connection handler)
- `apps/nestjs-backend/src/share-db/share-db.adapter.ts`

## Fix for dev:swc missing heap flag
`apps/nestjs-backend/package.json` — `dev:swc` script lacks `NODE_OPTIONS='--max-old-space-size=8192'`.
