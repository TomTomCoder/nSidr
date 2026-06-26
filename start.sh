#!/usr/bin/env bash
# Teable — one-command launcher. Only requires Docker + curl.
#
# First run:  ./start.sh   (builds the image from source, ~5-10 min)
# After that: ./start.sh   (starts in seconds, skips the build)
#
# Web: http://localhost:3000
# Stop: docker compose -f docker-compose.full.yml down
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$ROOT/docker-compose.full.yml"
IMAGE="teable-local:latest"
DOCKERFILE="$ROOT/dockers/teable/Dockerfile"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
info()  { printf '\033[36m→ %s\033[0m\n' "$*"; }

# ── Prerequisites ──────────────────────────────────────────────────────────────
command -v docker &>/dev/null || { red "Docker is not installed. https://docs.docker.com/get-docker/"; exit 1; }
command -v curl   &>/dev/null || { red "curl is required (used for health check). Install it and retry."; exit 1; }

if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  red "Docker Compose not found. https://docs.docker.com/compose/install/"
  exit 1
fi

# ── Build image if missing ─────────────────────────────────────────────────────
if ! docker image inspect "$IMAGE" &>/dev/null; then
  info "Image '$IMAGE' not found — building from source (first run only, ~5-10 min)..."
  docker build -f "$DOCKERFILE" -t "$IMAGE" "$ROOT"
  green "Image built."
fi

# ── Start the full stack ───────────────────────────────────────────────────────
info "Starting Teable (Postgres + Redis + app)..."
$COMPOSE -f "$COMPOSE_FILE" up -d

# ── Wait for health ────────────────────────────────────────────────────────────
HEALTH_URL="http://localhost:3000/health"
MAX_WAIT=120
ELAPSED=0
INTERVAL=5

info "Waiting for Teable to be ready..."
printf "  "
while ! curl -sf "$HEALTH_URL" &>/dev/null; do
  if [[ $ELAPSED -ge $MAX_WAIT ]]; then
    echo ""
    red "Timed out after ${MAX_WAIT}s. The app may still be starting."
    echo "  Check logs: $COMPOSE -f docker-compose.full.yml logs -f teable-app"
    exit 1
  fi
  printf "."
  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done
echo " ✓"

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
green "Teable is ready → http://localhost:3000"
echo ""
echo "  Logs:    $COMPOSE -f docker-compose.full.yml logs -f teable-app"
echo "  Stop:    $COMPOSE -f docker-compose.full.yml down"
echo "  Wipe:    $COMPOSE -f docker-compose.full.yml down -v"
echo "  Rebuild: docker build -f dockers/teable/Dockerfile -t teable-local:latest . && $COMPOSE -f docker-compose.full.yml up -d"
