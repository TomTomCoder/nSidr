---
name: run-app
description: Launch the Teable app locally (web :3000 + API :3002) with all known stability fixes applied
---

# Run Teable locally

One command does everything (service checks, arch-mismatch handling, stale-dist rebuild, ordered startup, readiness gates):

```bash
pnpm start:local            # or: bash scripts/launch-local.sh
pnpm start:local:rebuild    # force backend rebuild
```

Then open http://localhost:3000. Logs: `/tmp/teable-backend.log`, `/tmp/teable-frontend.log`.

Stop with: `pkill -f 'nestjs-backend/dist/index.js'; pkill -f 'next dev'`

## Known failure modes the script handles (don't rediscover these)

1. **Native module arch mismatch** — this arm64 Mac has an x86_64 node at
   `~/.local/bin/node` and arm64 nodes under nvm. `bcrypt` (and `sqlite3`,
   `better-sqlite3`) must match the node that loads them. The script detects the
   mismatch and rebuilds bcrypt with the matching node. Symptom:
   `incompatible architecture (have 'arm64', need 'x86_64')` or vice versa.
2. **Stale backend dist** — an old `apps/nestjs-backend/dist/index.js` can carry
   bugs already fixed in source (seen: `DocSearchModule` circular-dependency
   boot crash). The script rebuilds when any `src/**/*.ts` is newer than dist.
3. **Postgres stale PID** — if `pg_isready` fails after a crash, remove
   `postmaster.pid` and restart the service. Redis must answer `PING`.
4. **`--env-file` must be an absolute path** — node silently exits with
   `.env: not found` if launched from the wrong cwd. The script anchors all
   paths on the repo root.
5. **SMTP ECONNREFUSED 127.0.0.1:587 at boot is harmless** — the mail
   transporter check fails locally; the app still starts fine.

## Manual launch (only if the script is unavailable)

```bash
# backend (build first if dist is stale):
cd apps/nestjs-backend && NODE_OPTIONS='--max-old-space-size=4096' pnpm exec nest build --webpackPath ./webpack.swc.js
PORT=3002 BACKEND_SKIP_NEXT_START=true NODE_OPTIONS='--max-old-space-size=4096' \
  node --env-file=<ABSOLUTE>/apps/nestjs-backend/.env <ABSOLUTE>/apps/nestjs-backend/dist/index.js

# frontend:
BACKEND_URL=http://localhost:3002 BACKEND_PORT=3002 PORT=3000 pnpm --filter @teable/app dev
```

Readiness signals: backend logs `Nest application successfully started`;
frontend logs `✓ Ready`.
