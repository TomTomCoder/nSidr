#!/usr/bin/env bash
# Prefer Homebrew Postgres tools over any Docker wrappers in ~/.local/bin
export PATH="/opt/homebrew/opt/postgresql@16/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
# launch-local.sh — one-command, stable local launch for Teable.
#
# Handles every failure mode hit in practice on this machine:
#   1. x86_64/arm64 native-module mismatches (bcrypt, sqlite3) — picks the node
#      binary whose arch matches the installed bcrypt binding, rebuilds if needed.
#   2. Stale backend dist (old bundles can carry bugs fixed in source, e.g. the
#      DocSearchModule circular-dependency) — rebuilds when src is newer than dist.
#   3. Postgres stale PID / not running, Redis not running — checked up front.
#   4. Relative --env-file paths breaking when launched from another cwd —
#      everything is absolute, anchored on the repo root.
#
# Usage:   bash scripts/launch-local.sh [--rebuild] [--prod]
#   --rebuild  force a backend rebuild even if dist looks fresh
#   --prod     serve the frontend as a PRODUCTION build (next build + next start)
#              instead of dev. Dev mode ships ~6x more JS (unminified + HMR) and
#              recompiles each route on first visit — so dev is multiple-seconds
#              slow while prod paints sub-second. Use --prod to experience/ship the
#              fast path. Adds a one-time ~30-60s build up front.
#              MEASURES: server (TTFB ~140ms) + REST data (~10ms) are instant, and
#              prod ships ~2.1MB JS vs dev's ~5.9MB.
#              CAVEAT: `next start` + baked rewrites do NOT proxy the realtime
#              WebSocket (/socket → :3001), so live grid sync degrades in this
#              local-prod mode. A real deployment puts a WS-capable reverse proxy
#              (nginx/traefik/Caddy) in front, where realtime works normally. For
#              full local functionality incl. realtime, use plain dev mode.
#
# Web UI:  http://localhost:3000   API: http://localhost:3002
# Logs:    /tmp/teable-backend.log  /tmp/teable-frontend.log

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/apps/nestjs-backend"
FRONTEND_DIR="$ROOT/apps/nextjs-app"
BACKEND_LOG=/tmp/teable-backend.log
FRONTEND_LOG=/tmp/teable-frontend.log
FORCE_REBUILD=false
PROD_MODE=false
for arg in "$@"; do
  case "$arg" in
    --rebuild) FORCE_REBUILD=true ;;
    --prod)    PROD_MODE=true ;;
  esac
done

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
info()  { printf '\033[36m%s\033[0m\n' "$*"; }

# ---------------------------------------------------------------- services
info "[1/6] Checking required services (auto-starting via Homebrew if needed)..."

# Auto-start Postgres via Homebrew if it is not already responding.
# brew services start is a no-op when the service is already running.
if ! pg_isready -h localhost -p 5432 -q 2>/dev/null; then
  info "  Postgres not responding — attempting brew services start..."
  # Try common Homebrew postgres formula names (versioned and unversioned).
  for pg_svc in postgresql@16 postgresql@15 postgresql@14 postgresql; do
    if brew services start "$pg_svc" > /dev/null 2>&1; then
      info "  Started $pg_svc via Homebrew"
      break
    fi
  done
  # Give Postgres a moment to bind.
  for i in $(seq 1 10); do
    pg_isready -h localhost -p 5432 -q 2>/dev/null && break
    sleep 1
  done
fi
if ! pg_isready -h localhost -p 5432 -q; then
  red "Postgres is not accepting connections on :5432."
  red "If it crashed, remove the stale PID file and restart, e.g.:"
  red "  rm -f /usr/local/var/postgres*/postmaster.pid && brew services restart postgresql"
  red "Or use: pnpm start:services  (Docker-based services) then pnpm start:local"
  exit 1
fi

# Auto-start Redis via Homebrew if it is not already responding.
if ! redis-cli ping > /dev/null 2>&1; then
  info "  Redis not responding — attempting brew services start redis..."
  brew services start redis > /dev/null 2>&1 || true
  for i in $(seq 1 5); do
    redis-cli ping > /dev/null 2>&1 && break
    sleep 1
  done
fi
if ! redis-cli ping > /dev/null 2>&1; then
  red "Redis is not responding."
  red "Start it with: brew services start redis"
  red "Or use: pnpm start:services  (Docker-based services) then pnpm start:local"
  exit 1
fi
green "  Postgres + Redis OK"

# ---------------------------------------------------------------- node arch
info "[2/6] Selecting a node binary matching native modules..."
BCRYPT_BIN=$(ls "$ROOT"/node_modules/.pnpm/bcrypt@*/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node 2>/dev/null | head -1 || true)
NODE_BIN="$(command -v node)"
# ponytail: node >=24 removed SlowBuffer, breaking buffer-equal-constant-time (jsonwebtoken
# dep) at boot. Prefer node@22 (project engines: >=22) which still has it; v24 also breaks.
_NODE_MAJOR=$(NO_COLOR=1 FORCE_COLOR=0 "$NODE_BIN" -p "process.versions.node.split('.')[0]" 2>/dev/null | tr -dc '0-9' || echo 0)
if [[ "$_NODE_MAJOR" -ge 24 && -x /opt/homebrew/opt/node@22/bin/node ]]; then
  NODE_BIN=/opt/homebrew/opt/node@22/bin/node
elif [[ "$_NODE_MAJOR" -ge 26 && -x /usr/local/bin/node ]]; then
  NODE_BIN=/usr/local/bin/node
fi
if [[ -n "$BCRYPT_BIN" ]]; then
  BCRYPT_ARCH=$(file "$BCRYPT_BIN" | grep -o 'arm64\|x86_64' | head -1)
  NODE_ARCH=$("$NODE_BIN" -p "process.arch" | sed 's/x64/x86_64/')
  if [[ "$BCRYPT_ARCH" != "$NODE_ARCH" ]]; then
    # Prefer an nvm node matching the machine arch, then rebuild natives with it.
    CANDIDATE=$(ls -d ~/.nvm/versions/node/*/bin/node 2>/dev/null | tail -1 || true)
    if [[ -n "$CANDIDATE" ]]; then
      CAND_ARCH=$("$CANDIDATE" -p "process.arch" | sed 's/x64/x86_64/')
      if [[ "$CAND_ARCH" == "$BCRYPT_ARCH" ]]; then
        NODE_BIN="$CANDIDATE"
      else
        info "  Rebuilding bcrypt for $CAND_ARCH..."
        (cd "$ROOT" && "$CANDIDATE" "$(command -v pnpm)" rebuild bcrypt)
        NODE_BIN="$CANDIDATE"
      fi
    else
      info "  Rebuilding bcrypt for $NODE_ARCH..."
      (cd "$ROOT" && pnpm rebuild bcrypt)
    fi
  fi
fi
green "  Using node: $NODE_BIN ($("$NODE_BIN" -p 'process.arch + " " + process.version'))"
export PATH="$(dirname "$NODE_BIN"):$PATH"  # ponytail: frontend (pnpm) inherits the same node

# ---------------------------------------------------------------- build
info "[3/6] Checking backend build freshness..."
DIST="$BACKEND_DIR/dist/index.js"
NEEDS_BUILD=$FORCE_REBUILD
if [[ ! -f "$DIST" ]]; then
  NEEDS_BUILD=true
elif [[ -n "$(find "$BACKEND_DIR/src" -name '*.ts' -newer "$DIST" -print -quit 2>/dev/null)" ]]; then
  NEEDS_BUILD=true
fi
if [[ "$NEEDS_BUILD" == true ]]; then
  info "  Building backend (SWC)..."
  (cd "$BACKEND_DIR" && NODE_OPTIONS='--max-old-space-size=4096' pnpm exec nest build --webpackPath ./webpack.swc.js)
  green "  Backend built"
else
  green "  dist is fresh — skipping build (use --rebuild to force)"
fi

# ---------------------------------------------------------------- stop old
info "[4/6] Stopping any previous instances..."
pkill -f "nestjs-backend/dist/index.js" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

# ---------------------------------------------------------------- backend
info "[5/6] Starting backend on :3002..."
# SOCKET_PORT pinned: ws.module.ts picks the gateway by comparing SERVER_PORT to
# SOCKET_PORT — leaving them unset makes the choice non-deterministic across builds.
# HEAP_SNAPSHOT=1 to enable on-demand heap snapshots: kill -USR2 <backend_pid>
# will write a .heapsnapshot file in the cwd for analysis in Chrome DevTools.
HEAP_SNAPSHOT_FLAGS=""
[[ "${HEAP_SNAPSHOT:-}" == "1" ]] && HEAP_SNAPSHOT_FLAGS="--heapsnapshot-signal=SIGUSR2"

PORT=3002 SOCKET_PORT=3001 BACKEND_SKIP_NEXT_START=true NODE_OPTIONS='--max-old-space-size=4096' \
  "$NODE_BIN" $HEAP_SNAPSHOT_FLAGS --env-file="$BACKEND_DIR/.env" "$DIST" > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

for i in $(seq 1 40); do
  if grep -q "successfully started" "$BACKEND_LOG" 2>/dev/null; then break; fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null || grep -qE "circular dependency|EADDRINUSE|incompatible architecture" "$BACKEND_LOG" 2>/dev/null; then
    red "Backend failed to start. Last log lines:"
    tail -15 "$BACKEND_LOG"
    if grep -q "circular dependency" "$BACKEND_LOG"; then
      red "Hint: stale dist — rerun with: bash scripts/launch-local.sh --rebuild"
    fi
    exit 1
  fi
  sleep 1
done
if ! grep -q "successfully started" "$BACKEND_LOG"; then
  red "Backend did not become ready within 40s. See $BACKEND_LOG"
  exit 1
fi
green "  Backend up (PID $BACKEND_PID)"

# ---------------------------------------------------------------- frontend
if [[ "$PROD_MODE" == true ]]; then
  info "[6/6] Building + starting frontend (PRODUCTION) on :3000..."
  # Build once. PROD_PROXY=1 bakes the /api + /socket rewrites into the prod build
  # (next start does NOT apply dev rewrites). Typecheck/lint off to skip this
  # branch's ~270 pre-existing TS errors — Turbopack still emits valid JS.
  info "  Building prod bundle (one-time, ~30-60s)..."
  # NEXT_PUBLIC_SOCKET_URL is baked into the client bundle. It points the SDK
  # straight at the realtime backend (localhost:3001) instead of going through
  # next start's HTTP rewrite — which cannot proxy a WS upgrade and was the
  # cause of 20+ s /socket/info retries on every page mount.
  if ! (cd "$FRONTEND_DIR" && PROD_PROXY=1 BACKEND_URL=http://localhost:3002 \
        NEXTJS_BACKEND_PORT=3002 NEXTJS_SOCKET_PORT=3001 \
        NEXT_PUBLIC_SOCKET_URL=http://localhost:3001/socket \
        NEXT_BUILD_ENV_TYPECHECK=false NEXT_BUILD_ENV_LINT=false \
        pnpm next build > "$FRONTEND_LOG" 2>&1); then
    red "Frontend prod build failed. Last log lines:"; tail -20 "$FRONTEND_LOG"; exit 1
  fi
  # SSR (getServerSideProps) needs the same DB/env the backend uses; source it so
  # next start can render. PROD_PROXY-baked rewrites forward /api + /socket to :3002/:3001.
  ( set -a; . "$BACKEND_DIR/.env"; set +a
    cd "$FRONTEND_DIR" && BACKEND_URL=http://localhost:3002 NEXTJS_BACKEND_PORT=3002 \
      NEXTJS_SOCKET_PORT=3001 PORT=3000 pnpm next start -p 3000 >> "$FRONTEND_LOG" 2>&1 &)
else
  info "[6/6] Starting frontend (dev) on :3000..."
  (cd "$ROOT" && BACKEND_URL=http://localhost:3002 BACKEND_PORT=3002 SOCKET_PORT=3001 PORT=3000 \
    pnpm --filter @teable/app dev > "$FRONTEND_LOG" 2>&1 &)
fi

for i in $(seq 1 60); do
  if grep -qE "✓ Ready|ready|Local:" "$FRONTEND_LOG" 2>/dev/null; then break; fi
  sleep 1
done
if ! grep -qE "✓ Ready|ready|Local:" "$FRONTEND_LOG"; then
  red "Frontend did not become ready within 60s. See $FRONTEND_LOG"
  exit 1
fi
green "  Frontend up ($([[ "$PROD_MODE" == true ]] && echo production || echo dev) mode)"

echo
green "Teable is running:  http://localhost:3000  ($([[ "$PROD_MODE" == true ]] && echo PRODUCTION || echo dev) mode)"
echo  "Logs: $BACKEND_LOG / $FRONTEND_LOG"
if [[ "$PROD_MODE" == true ]]; then
  echo  "Stop: pkill -f 'nestjs-backend/dist/index.js'; pkill -f 'next start'"
else
  echo  "Stop: pkill -f 'nestjs-backend/dist/index.js'; pkill -f 'next dev'"
  echo  "Tip: run 'pnpm start:prod:local' for the fast production build (sub-second loads)."
fi
