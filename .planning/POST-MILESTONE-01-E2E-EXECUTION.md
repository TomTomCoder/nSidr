# E2E Test Execution Plan

## Objective
Execute the complete Playwright E2E test suite from Phase 9 against a running Teable stack (PostgreSQL, Redis, NestJS backend, Next.js frontend). Document results and identify any environment-specific failures.

## Prerequisites

### Services Required
1. **PostgreSQL 15** — Port 5432 (database)
2. **Redis** — Port 6379 (cache/session store)
3. **Next.js Frontend** — Port **3000** (user-facing web app)
4. **NestJS Backend** — Port 3001 (API server, dev only; port 3000 in prod)
5. **MinIO** (optional) — Port 9000 (S3-compatible storage)

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://teable:teable@localhost:5432/teable?schema=public"
REDIS_URL="redis://localhost:6379"

# NextJS
NEXT_PUBLIC_API_ORIGIN="http://localhost:3000"
NEXT_PUBLIC_SOCKET_ENDPOINT="ws://localhost:3000"

# E2E Testing
E2E_WEBSERVER_MODE="START"  # or "DEV"
E2E_ADMIN_PASSWORD="admin123"
E2E_ADMIN_EMAIL="tommy.lambert@converteo.com"

# AI/Integrations (optional for basic tests)
OPENAI_API_KEY="sk-..."
GOOGLE_CLIENT_ID="..."
SLACK_CLIENT_ID="..."
```

## Execution Steps

### Step 1: Start Services (Docker Compose)
```bash
# Start PostgreSQL and Redis together
docker-compose -f dockers/database-postgres.yml -f dockers/cache-redis.yml up -d

# Verify services
docker ps | grep teable

# Initialize database schema
cd apps/nestjs-backend
pnpm run prisma:migrate:deploy
pnpm run prisma:seed  # if seed scripts exist
```

### Step 2: Start NestJS Backend
```bash
cd apps/nestjs-backend
pnpm install
pnpm run dev &  # or `pnpm run start` for production mode
# Wait for: "Server is running on http://localhost:3000"
```

### Step 3: Start Next.js Frontend
```bash
cd apps/nextjs-app
pnpm install
pnpm run dev &
# Wait for: "- Ready in X.XXs"
```

### Step 4: Verify Services Running
```bash
# Check all ports are open
lsof -i :3000  # Next.js UI (user-facing)
lsof -i :3001  # NestJS backend API (dev)
lsof -i :5432 # PostgreSQL
lsof -i :6379 # Redis

# Health check via curl
curl -s http://localhost:3001/health | jq .  # NestJS health
curl -s http://localhost:3000 | head -20      # Next.js UI
```

### Step 5: Run E2E Test Suite
```bash
cd apps/nextjs-app

# Option A: Run all tests
pnpm exec playwright test

# Option B: Run specific wave/feature
pnpm exec playwright test e2e/pages/features/grid-view.spec.ts
pnpm exec playwright test e2e/pages/features/form-view.spec.ts
pnpm exec playwright test e2e/pages/features/gantt-view.spec.ts

# Option C: Run with debugging
PWDEBUG=1 pnpm exec playwright test e2e/pages/features/grid-view.spec.ts

# Option D: Generate HTML report
pnpm exec playwright test --reporter=html
# Open: playwright-report/index.html
```

### Step 6: Analyze Results
- Check test output for failures
- Review HTML report (if generated)
- Document any environment-specific issues
- Capture screenshots/videos from failed tests

## Expected Test Coverage

| Feature | Tests | Status |
|---------|-------|--------|
| Grid View | 4 | Phase 09-01 |
| Form View | 2 | Phase 09-02 |
| Gallery View | 2 | Phase 09-02 |
| Kanban View | 3 | Phase 09-03 |
| Calendar View | 3 | Phase 09-03 |
| Gantt View | 6 | Phase 09-04 |
| Database View | 1 | Phase 09-05 |
| Share Base | 1 | Phase 09-06 |
| API Access | 1 | Phase 09-07 |
| Authority Matrix | 3 | Phase 09-09 |
| Integrations | 5 | Phase 09-11 |
| Full Sweep | 5 | Phase 09-08 |
| **Total** | **36+** | **All Waves** |

## Known Issues & Workarounds

### Issue 1: Port Conflicts
**Symptom:** `Address already in use` when starting services
**Solution:** Check what's using the port and either kill it or use different ports
```bash
# Find and kill process on port
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Issue 2: Database Not Initialized
**Symptom:** Tests fail with "ECONNREFUSED" on database
**Solution:** Ensure migrations are applied before running tests
```bash
cd apps/nestjs-backend
pnpm run prisma:migrate:deploy
```

### Issue 3: Redis Connection Failures
**Symptom:** Tests timeout or fail with Redis errors
**Solution:** Verify Redis is running and accessible
```bash
redis-cli ping  # Should respond with PONG
```

### Issue 4: Frontend Build Errors
**Symptom:** Next.js fails to start with compilation errors
**Solution:** Clean cache and reinstall dependencies
```bash
cd apps/nextjs-app
rm -rf .next node_modules
pnpm install
pnpm run dev
```

## Test Execution Checklist

- [ ] PostgreSQL container running (port 5432)
- [ ] Redis container running (port 6379)
- [ ] Next.js frontend running (port **3000**, loading without errors)
- [ ] NestJS backend running (port 3001 in dev, health check passing)
- [ ] Database migrations applied
- [ ] Playwright installed (`pnpm run install:playwright`)
- [ ] Test auth fixtures working (admin login successful)
- [ ] Grid view E2E test passing (09-01)
- [ ] Form/Gallery view tests passing (09-02)
- [ ] Kanban/Calendar view tests passing (09-03)
- [ ] Gantt view tests passing (09-04)
- [ ] Authority Matrix tests passing (09-09)
- [ ] Integrations tests passing (09-11)
- [ ] Full-sweep smoke tests passing (09-08)
- [ ] HTML report generated and reviewed
- [ ] All failures documented
- [ ] Screenshots captured for any visual failures

## Success Criteria

✓ **PASS**: All 12 test suites execute without errors
✓ **PASS**: No timeout errors
✓ **PASS**: HTML report generated with <5% failure rate
✓ **PASS**: All critical paths (login, grid view CRUD) working
✓ **PASS**: Performance acceptable (tests complete <20 minutes)

## Output Artifacts

1. **Test Results Report** — `.planning/POST-MILESTONE-RESULTS.md`
2. **HTML Report** — `apps/nextjs-app/playwright-report/index.html`
3. **Failed Test Videos** — `apps/nextjs-app/test-results/*`
4. **Environment Checklist** — `.planning/E2E-ENVIRONMENT-CHECKLIST.md`

## Timeline

- **Estimated Duration:** 45-60 minutes (including service startup)
- **Test Execution Only:** 15-20 minutes
- **Troubleshooting:** Add 30+ minutes if environment issues arise

## Next Steps After Execution

1. Document all failures and root causes
2. Identify environment vs. code issues
3. Create gap closure plans if tests fail
4. Feed results into CI/CD setup (Task 2)
5. Use baseline metrics for performance tuning
