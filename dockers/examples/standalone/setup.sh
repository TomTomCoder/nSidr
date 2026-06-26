#!/usr/bin/env bash
# Teable standalone quickstart
# Usage: ./setup.sh [--reset] [--no-pull]
set -euo pipefail

# ─── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}→${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC} $*"; }
error()   { echo -e "${RED}✗ ERROR:${NC} $*" >&2; exit 1; }
section() { echo -e "\n${BOLD}── $* ──${NC}"; }
ask()     { read -rp "  $1" "$2"; }

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yaml"

# ─── Flags ────────────────────────────────────────────────────────────────────
FORCE_RESET=false
SKIP_PULL=false
for arg in "$@"; do
  case "$arg" in
    --reset)   FORCE_RESET=true ;;
    --no-pull) SKIP_PULL=true ;;
    --help|-h)
      echo "Usage: $0 [--reset] [--no-pull]"
      echo "  --reset    Reconfigure even if .env already exists"
      echo "  --no-pull  Skip docker image pull"
      exit 0 ;;
    *) warn "Unknown flag: $arg" ;;
  esac
done

# ─── Helper: generate a random 32-char hex string ─────────────────────────────
gen_secret() {
  if command -v openssl &>/dev/null; then
    openssl rand -hex 16
  else
    LC_ALL=C tr -dc 'a-f0-9' < /dev/urandom | head -c 32
  fi
}

# ─── Helper: detect local IP ──────────────────────────────────────────────────
detect_local_ip() {
  # macOS
  if command -v ipconfig &>/dev/null; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1"
    return
  fi
  # Linux
  if command -v hostname &>/dev/null; then
    hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1"
    return
  fi
  echo "127.0.0.1"
}

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}Teable — Standalone Setup${NC}"
echo -e "────────────────────────────────────────────────────"

# ─── 1. Prerequisites ─────────────────────────────────────────────────────────
section "Checking prerequisites"

command -v docker &>/dev/null || error "Docker is not installed. https://docs.docker.com/get-docker/"
DOCKER_VER=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
success "Docker $DOCKER_VER"

# Prefer compose v2 plugin; fall back to standalone docker-compose
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  error "Docker Compose not found. https://docs.docker.com/compose/install/"
fi
COMPOSE_VER=$($COMPOSE version --short 2>/dev/null || echo "?")
success "Docker Compose $COMPOSE_VER  ($COMPOSE)"

command -v curl &>/dev/null || error "curl is required (used for health check)"
success "curl"

# ─── 2. Existing .env handling ────────────────────────────────────────────────
CONFIGURE=true

if [[ -f "$ENV_FILE" && "$FORCE_RESET" == "false" ]]; then
  echo ""
  warn ".env already exists."
  echo -e "  ${YELLOW}[s]${NC} Start / restart services with the existing .env  (default)"
  echo -e "  ${YELLOW}[r]${NC} Reconfigure — generate new secrets, back up .env"
  echo -e "  ${YELLOW}[q]${NC} Quit"
  ask "Choice [s/r/q, default s]: " choice
  choice="${choice:-s}"
  case "$choice" in
    r|R) cp "$ENV_FILE" "${ENV_FILE}.bak"; info "Backed up to .env.bak"; CONFIGURE=true ;;
    q|Q) echo "Quit."; exit 0 ;;
    *)   CONFIGURE=false ;;
  esac
fi

# ─── 3. Configuration ─────────────────────────────────────────────────────────
if [[ "$CONFIGURE" == "true" ]]; then
  section "Configuration"

  # --- Public origin ---
  LOCAL_IP=$(detect_local_ip)
  DEFAULT_ORIGIN="http://${LOCAL_IP}:3000"
  echo ""
  echo -e "  What URL will users access Teable at?"
  echo -e "  (Use your server's domain or public IP if deploying remotely)"
  ask "  Public origin [${DEFAULT_ORIGIN}]: " raw_origin
  PUBLIC_ORIGIN="${raw_origin:-$DEFAULT_ORIGIN}"
  PUBLIC_ORIGIN="${PUBLIC_ORIGIN%/}"   # strip trailing slash

  # Derive the host part for PUBLIC_DATABASE_PROXY
  # Use bash parameter expansion — portable across macOS (BSD) and Linux (GNU)
  _stripped="${PUBLIC_ORIGIN#http://}"; _stripped="${_stripped#https://}"
  DB_PROXY_HOST="${_stripped%%:*}"; DB_PROXY_HOST="${DB_PROXY_HOST%%/*}"

  # --- AI assistant ---
  echo ""
  echo -e "  ${BOLD}AI assistant (optional)${NC}"
  echo -e "  Supported providers: ${YELLOW}openai${NC} | ${YELLOW}anthropic${NC} | ${YELLOW}openai_compatible${NC}"
  ask "  Provider [skip]: " raw_ai_provider
  AI_PROVIDER="${raw_ai_provider:-}"
  AI_API_KEY="" AI_OPENAI_KEY="" AI_ANTHROPIC_KEY="" AI_MODEL="" AI_BASE_URL=""

  if [[ -n "$AI_PROVIDER" ]]; then
    case "$AI_PROVIDER" in
      openai)
        ask "  OpenAI API key (sk-...): " AI_OPENAI_KEY
        ask "  Model [gpt-4o]: " raw_model
        AI_MODEL="${raw_model:-gpt-4o}"
        ;;
      anthropic)
        ask "  Anthropic API key (sk-ant-...): " AI_ANTHROPIC_KEY
        ask "  Model [claude-3-5-sonnet-20241022]: " raw_model
        AI_MODEL="${raw_model:-claude-3-5-sonnet-20241022}"
        ;;
      openai_compatible)
        ask "  Base URL (e.g. https://your-api/v1): " AI_BASE_URL
        ask "  API key: " AI_API_KEY
        ask "  Model: " AI_MODEL
        ;;
      *)
        warn "Unknown provider — will write AI_PROVIDER as-is. Check docs for correct env vars."
        ask "  API key: " AI_API_KEY
        ask "  Model: " AI_MODEL
        ;;
    esac
  fi

  # --- Secrets ---
  PG_PASSWORD=$(gen_secret)
  REDIS_PASSWORD=$(gen_secret)
  info "Generated random secrets for Postgres and Redis"

  # --- Write .env ---
  cat > "$ENV_FILE" <<ENVEOF
TIMEZONE=UTC

# Postgres
POSTGRES_HOST=teable-db
POSTGRES_PORT=5432
POSTGRES_DB=teable
POSTGRES_USER=teable
POSTGRES_PASSWORD=${PG_PASSWORD}

# Redis
REDIS_HOST=teable-cache
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=${REDIS_PASSWORD}

# App
PUBLIC_ORIGIN=${PUBLIC_ORIGIN}
PRISMA_DATABASE_URL=postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@\${POSTGRES_HOST}:\${POSTGRES_PORT}/\${POSTGRES_DB}
PUBLIC_DATABASE_PROXY=${DB_PROXY_HOST}:42345

BACKEND_CACHE_PROVIDER=redis
BACKEND_CACHE_REDIS_URI=redis://default:\${REDIS_PASSWORD}@\${REDIS_HOST}:\${REDIS_PORT}/\${REDIS_DB}
ENVEOF

  # AI block
  if [[ -n "$AI_PROVIDER" ]]; then
    {
      echo ""
      echo "# AI / LLM"
      echo "AI_PROVIDER=${AI_PROVIDER}"
      [[ -n "$AI_OPENAI_KEY"     ]] && echo "OPENAI_API_KEY=${AI_OPENAI_KEY}"
      [[ -n "$AI_ANTHROPIC_KEY"  ]] && echo "ANTHROPIC_API_KEY=${AI_ANTHROPIC_KEY}"
      [[ -n "$AI_API_KEY"        ]] && echo "AI_API_KEY=${AI_API_KEY}"
      [[ -n "$AI_BASE_URL"       ]] && echo "AI_BASE_URL=${AI_BASE_URL}"
      [[ -n "$AI_MODEL"          ]] && echo "AI_MODEL=${AI_MODEL}"
    } >> "$ENV_FILE"
    success "AI provider '${AI_PROVIDER}' configured"
  else
    cat >> "$ENV_FILE" <<'AIEOF'

# AI / LLM — configure at least one provider to enable the AI chat assistant
# Supported providers: openai | anthropic | openai_compatible
#AI_PROVIDER=openai
#OPENAI_API_KEY=sk-...
#ANTHROPIC_API_KEY=sk-ant-...
#AI_MODEL=gpt-4o
# For openai_compatible (e.g. Azure, local Ollama):
#AI_BASE_URL=https://your-endpoint/v1
#AI_API_KEY=your-key
AIEOF
    warn "AI not configured — AI chat will be disabled. Edit .env to add AI_PROVIDER later."
  fi

  success ".env written"

  # Mail hint
  echo ""
  info "Email sending is disabled by default."
  info "To enable it, uncomment the BACKEND_MAIL_* block in .env."
fi

# ─── 4. Pull images ───────────────────────────────────────────────────────────
if [[ "$SKIP_PULL" == "false" ]]; then
  section "Pulling images"
  $COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
  success "Images up to date"
fi

# ─── 5. Start services ────────────────────────────────────────────────────────
section "Starting services"
# --pull never when we skipped the explicit pull above (avoids implicit pulls)
PULL_FLAG="--pull missing"
[[ "$SKIP_PULL" == "true" ]] && PULL_FLAG="--pull never"
$COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans $PULL_FLAG
success "Containers started"

# ─── 6. Wait for health ───────────────────────────────────────────────────────
section "Waiting for Teable to be ready"

# Resolve the health URL — always check on localhost regardless of PUBLIC_ORIGIN
HEALTH_URL="http://localhost:3000/health"

MAX_WAIT=120   # seconds
ELAPSED=0
INTERVAL=5

printf "  Polling %s " "$HEALTH_URL"
while ! curl -sf "$HEALTH_URL" &>/dev/null; do
  if [[ $ELAPSED -ge $MAX_WAIT ]]; then
    echo ""
    echo ""
    warn "Timed out after ${MAX_WAIT}s. Services may still be starting up."
    echo ""
    echo -e "  Check logs:  ${YELLOW}$COMPOSE -f $COMPOSE_FILE logs -f teable${NC}"
    echo -e "  Retry check: ${YELLOW}curl -s $HEALTH_URL${NC}"
    echo ""
    exit 1
  fi
  printf "."
  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done
echo " ✓"

# ─── 7. Print ENV validation warnings ────────────────────────────────────────
WARN_COUNT=0
check_env_set() {
  local key="$1"
  local value
  value=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"'"'" || echo "")
  if [[ -z "$value" || "$value" == *"replace"* || "$value" == *"example"* || "$value" == "sk-..." ]]; then
    warn "  ${key} looks like a placeholder — review your .env"
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
}
check_env_set "POSTGRES_PASSWORD"
check_env_set "REDIS_PASSWORD"
check_env_set "PUBLIC_ORIGIN"

# ─── 8. Success banner ───────────────────────────────────────────────────────
DISPLAY_URL=$(grep -E "^PUBLIC_ORIGIN=" "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'")
DISPLAY_URL="${DISPLAY_URL:-http://localhost:3000}"

echo ""
echo -e "${GREEN}${BOLD}┌──────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}${BOLD}│         Teable is ready! 🎉                  │${NC}"
echo -e "${GREEN}${BOLD}├──────────────────────────────────────────────┤${NC}"
echo -e "${GREEN}${BOLD}│${NC}  Open:   ${BOLD}${DISPLAY_URL}${NC}"
echo -e "${GREEN}${BOLD}│${NC}"
echo -e "${GREEN}${BOLD}│${NC}  Useful commands:"
echo -e "${GREEN}${BOLD}│${NC}    Logs:    $COMPOSE -f docker-compose.yaml logs -f"
echo -e "${GREEN}${BOLD}│${NC}    Stop:    $COMPOSE -f docker-compose.yaml down"
echo -e "${GREEN}${BOLD}│${NC}    Upgrade: ./update.sh"
echo -e "${GREEN}${BOLD}└──────────────────────────────────────────────┘${NC}"
echo ""

[[ $WARN_COUNT -gt 0 ]] && warn "${WARN_COUNT} configuration warning(s) above — review your .env before going to production."
