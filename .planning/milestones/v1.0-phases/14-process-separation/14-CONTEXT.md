---
phase: 14
slug: process-separation
goal: Separate NestJS API and Next.js frontend into distinct Node.js processes to eliminate shared-heap OOM crashes and GC-blocking event loop stalls
depends_on: [13]
---

# Phase 14 Context — Process Separation

## Problem statement

The current combined server (`pnpm --filter @teable/backend start`) runs NestJS + Next.js in a single Node.js process. When Next.js SSR compiles and renders a 251KB page bundle, V8 performs a stop-the-world major GC pause that can block the event loop for 30–60 seconds. During that window every pending HTTP request (API calls, BullMQ job acknowledgements) stalls. This triggered the doc-library stability failures in Phase 13 testing.

Root causes observed:
- RSS grew to 3GB within minutes of first page load
- NestJS API requests (PATCH /docs/:id refetches) hung indefinitely during GC
- BullMQ job marked "active" for 5+ minutes while event loop was frozen
- `NODE_OPTIONS=--max-old-space-size=16384` delayed OOM but worsened GC pauses (larger heap = longer sweeps)

## Existing separation hooks (already in codebase)

| Hook | Location | Value |
|------|----------|-------|
| `BACKEND_SKIP_NEXT_START` | `next.service.ts:onModuleInit` | `'true'` skips `createServer(nextJsDir)` |
| `NEXT_PUBLIC_API_BASE_URL` | `apps/nextjs-app/.env` | `http://localhost:3001` |
| `PORT` (NestJS) | `apps/nestjs-backend/.env` | `3000` in combined; needs `3001` in separated |
| Socket rewrite | `next.config.js rewrites()` | Proxies `/socket/*` → port 3001 in dev |
| SSR axios baseURL | `apps/nextjs-app/src/backend/api/rest/axios.ts` | `http://localhost:${process.env.PORT}/api` — **BUG: uses Next.js PORT not NestJS port** |

## Target architecture

```
Process A — NestJS API (port 3001)
  BACKEND_SKIP_NEXT_START=true PORT=3001
  Handles: /api/*, /socket/*, /auth/*
  RSS: ~200MB (no Next.js bundle in heap)

Process B — Next.js standalone (port 3000)
  PORT=3000 BACKEND_URL=http://localhost:3001
  Handles: all page routes, proxies /api/* to Process A
  RSS: ~600MB (Next.js SSR isolated)
```

## Files requiring changes

### Wave 1 — SSR URL fix + NestJS API-only env
| File | Change |
|------|--------|
| `apps/nextjs-app/src/backend/api/rest/axios.ts` | Use `process.env.BACKEND_URL ?? \`http://localhost:\${process.env.PORT}\`` instead of hard-coded PORT |
| `apps/nextjs-app/.env.development` | Add `BACKEND_URL=http://localhost:3001` |
| `apps/nestjs-backend/.env` | Document `BACKEND_SKIP_NEXT_START=true PORT=3001` mode (comment block) |

### Wave 2 — Proxy rewrite + start scripts
| File | Change |
|------|--------|
| `apps/nextjs-app/next.config.js` | Extend `rewrites()` to proxy `/api/*` → `http://localhost:3001` in dev (already does `/socket/*`) |
| `package.json` (root) | Add `"dev:separated"` and `"start:separated"` scripts using `concurrently` |

### Wave 3 — Regression test
| File | Change |
|------|--------|
| Playwright smoke | Run doc-library save test under separated mode; assert "Saved" indicator completes in < 3s; no server OOM |

## Constraints

- **No schema changes** — pure infrastructure; zero Prisma migrations
- **Combined mode must still work** — keep `BACKEND_SKIP_NEXT_START` opt-in; default `.env` stays as-is for CI
- **Port 3000 stays user-facing** — Next.js on 3000, NestJS moves to 3001 in separated mode
- **Cookie / session continuity** — both processes share the same domain in dev (localhost); no CORS changes needed since API proxy goes through Next.js server
- **SSR data fetching** — all SSR fetch calls must reach NestJS at 3001, not the Next.js process itself (the axios.ts bug fix is blocking)

## Acceptance criteria

- AC1: `dev:separated` starts two processes, browser at localhost:3000 loads the app, `/api/health` returns 200 from NestJS at 3001
- AC2: Doc-library save (PATCH /api/spaces/:id/docs/:id) resolves in < 3 seconds with no GC stalls
- AC3: NestJS process RSS stays below 500MB after 10 minutes of normal use
- AC4: Combined mode (`pnpm --filter @teable/backend start`) still works for CI/Docker
- AC5: SSR pages render correctly (no "Cannot connect to API" errors from the axios.ts fix)
