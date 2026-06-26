#!/usr/bin/env bash
set -euo pipefail

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[info]${NC} $*"; }
success() { echo -e "${GREEN}[ok]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $*"; }
error()   { echo -e "${RED}[err]${NC}  $*"; exit 1; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/nextjs-app/.env"
ENV_EXAMPLE="$REPO_ROOT/apps/nextjs-app/.env.example"

echo ""
echo "  Teable — dev setup"
echo "  =================="
echo ""

# ── 1. Prerequisites ──────────────────────────────────────────────────────────

info "Checking prerequisites..."

command -v node >/dev/null 2>&1 || error "Node.js not found. Install Node 20+ from https://nodejs.org"
NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
NODE_MAJOR="${NODE_VER%%.*}"
[[ "$NODE_MAJOR" -ge 20 ]] || error "Node 20+ required (found $NODE_VER)"

command -v pnpm >/dev/null 2>&1 || error "pnpm not found. Run: npm i -g pnpm"

command -v docker >/dev/null 2>&1 || warn "Docker not found — you will need to start PostgreSQL and Redis manually."

success "Prerequisites OK (Node $NODE_VER)"

# ── 2. .env ───────────────────────────────────────────────────────────────────

if [[ -f "$ENV_FILE" ]]; then
  warn ".env already exists — skipping copy. Edit $ENV_FILE manually if needed."
else
  info "Creating $ENV_FILE from .env.example..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"

  # Set sane local defaults
  SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32 || true)
  if [[ -n "$SECRET" ]]; then
    sed -i.bak "s|SECRET_KEY=defaultSecretKey|SECRET_KEY=$SECRET|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  fi
  sed -i.bak "s|PUBLIC_ORIGIN=https://app.teable.ai|PUBLIC_ORIGIN=http://localhost:3000|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  sed -i.bak "s|PRISMA_DATABASE_URL=postgresql://teable:teable@127.0.0.1:5432/teable|PRISMA_DATABASE_URL=postgresql://teable:teable@127.0.0.1:5432/teable?schema=public\&statement_cache_size=1|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"

  success ".env created with a random SECRET_KEY and local defaults."
  echo ""
  echo "  Required variables to review in $ENV_FILE:"
  echo "    PRISMA_DATABASE_URL  — PostgreSQL connection string"
  echo "    SECRET_KEY           — already randomised"
  echo "    PUBLIC_ORIGIN        — set to http://localhost:3000"
  echo ""
fi

# ── 3. Docker services (optional) ─────────────────────────────────────────────

if command -v docker >/dev/null 2>&1; then
  info "Starting PostgreSQL + Redis via Docker..."
  docker compose \
    -f "$REPO_ROOT/dockers/database-postgres.yml" \
    -f "$REPO_ROOT/dockers/cache-redis.yml" \
    -f "$REPO_ROOT/dockers/networks.yml" \
    up -d 2>&1 | tail -5
  success "Docker services started."
  info "Waiting 5s for PostgreSQL to be ready..."
  sleep 5
else
  warn "Skipping Docker services — make sure PostgreSQL and Redis are running."
fi

# ── 4. pnpm install ───────────────────────────────────────────────────────────

info "Installing dependencies (this may take a few minutes on first run)..."
cd "$REPO_ROOT"
pnpm install --frozen-lockfile
success "Dependencies installed."

# ── 5. Build packages ─────────────────────────────────────────────────────────

info "Building shared packages..."
pnpm build:packages
success "Packages built."

# ── 6. Database migration ─────────────────────────────────────────────────────

info "Running Prisma migrations..."
pnpm --filter @teable/db-main-prisma prisma:migrate:deploy
success "Database migrated."

# ── 7. Done ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "  To start the dev server:"
echo ""
echo "    NODE_OPTIONS='--max-old-space-size=8192' pnpm --filter @teable/nestjs-backend dev"
echo ""
echo "  App will be available at: http://localhost:3000"
echo ""
echo "  IMPORTANT: Never run 'next dev' separately — NestJS serves both the"
echo "             API and the Next.js frontend on the same port."
echo ""
