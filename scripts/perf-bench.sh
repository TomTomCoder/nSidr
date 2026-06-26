#!/usr/bin/env bash
#
# perf-bench.sh — production-mode launch for perf measurement
#
# Why: `next dev` adds ~5× overhead vs `next build && next start`. Profiling
# against dev mode produces misleading flamegraphs. This wrapper builds the
# monorepo and starts the prod-mode separated stack (API :3002, web :3000).
#
# Usage:
#   pnpm perf:bench           # build then start
#   pnpm perf:bench --no-build # reuse last build (faster iteration)
#
# Once running, capture a CDP trace from Chrome DevTools Performance tab while
# exercising the slow flow. Compare against the dev baseline.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "${1:-}" != "--no-build" ]]; then
  echo "[perf-bench] running pnpm g:build (prod build of all packages)…"
  pnpm g:build
fi

echo "[perf-bench] launching prod stack (api :3002, web :3000)…"
echo "[perf-bench] open http://localhost:3000 and start a Chrome DevTools profile."
exec pnpm start:separated
