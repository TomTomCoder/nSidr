#!/usr/bin/env bash
# Teable standalone — safe zero-downtime upgrade
# Usage: ./update.sh [--tag <version>]
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}→${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC} $*"; }
error()   { echo -e "${RED}✗ ERROR:${NC} $*" >&2; exit 1; }
section() { echo -e "\n${BOLD}── $* ──${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yaml"

[[ -f "$ENV_FILE" ]]    || error ".env not found — run ./setup.sh first"
[[ -f "$COMPOSE_FILE" ]] || error "docker-compose.yaml not found"

if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  error "Docker Compose not found"
fi

# Optional --tag flag to pin a specific version
TAG="latest"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag) TAG="$2"; shift 2 ;;
    --help|-h) echo "Usage: $0 [--tag <version>]"; exit 0 ;;
    *) warn "Unknown flag: $1"; shift ;;
  esac
done

echo ""
echo -e "${BOLD}Teable — Upgrade${NC}"
echo -e "────────────────────────────────────────────────────"

# Show current image digest
CURRENT=$(docker inspect --format='{{index .RepoDigests 0}}' ghcr.io/teableio/teable:"$TAG" 2>/dev/null || echo "not pulled yet")
info "Current image: $CURRENT"

# ─── Pull new image ───────────────────────────────────────────────────────────
section "Pulling ghcr.io/teableio/teable:${TAG}"
docker pull "ghcr.io/teableio/teable:${TAG}"
NEW=$(docker inspect --format='{{index .RepoDigests 0}}' "ghcr.io/teableio/teable:${TAG}" 2>/dev/null || echo "unknown")
if [[ "$CURRENT" == "$NEW" ]]; then
  info "Already on the latest image — nothing to do."
  success "Teable is up to date."
  exit 0
fi
success "New image: $NEW"

# ─── Rolling restart ─────────────────────────────────────────────────────────
section "Applying update"
# Compose recreates the container with the new image; DB and cache are unaffected.
$COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps --pull never teable
success "Container restarted with new image"

# ─── Wait for health ─────────────────────────────────────────────────────────
section "Waiting for health check"
HEALTH_URL="http://localhost:3000/health"
MAX_WAIT=90; ELAPSED=0; INTERVAL=5
printf "  Polling %s " "$HEALTH_URL"
while ! curl -sf "$HEALTH_URL" &>/dev/null; do
  if [[ $ELAPSED -ge $MAX_WAIT ]]; then
    echo ""
    warn "Timed out — check logs: $COMPOSE -f docker-compose.yaml logs -f teable"
    exit 1
  fi
  printf "."; sleep "$INTERVAL"; ELAPSED=$((ELAPSED + INTERVAL))
done
echo " ✓"

# ─── Done ────────────────────────────────────────────────────────────────────
DISPLAY_URL=$(grep -E "^PUBLIC_ORIGIN=" "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'")
echo ""
echo -e "${GREEN}${BOLD}┌──────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}${BOLD}│         Upgrade complete! 🚀                 │${NC}"
echo -e "${GREEN}${BOLD}├──────────────────────────────────────────────┤${NC}"
echo -e "${GREEN}${BOLD}│${NC}  Running:  ${BOLD}${NEW:-ghcr.io/teableio/teable:${TAG}}${NC}"
echo -e "${GREEN}${BOLD}│${NC}  Open:     ${BOLD}${DISPLAY_URL:-http://localhost:3000}${NC}"
echo -e "${GREEN}${BOLD}└──────────────────────────────────────────────┘${NC}"
echo ""
