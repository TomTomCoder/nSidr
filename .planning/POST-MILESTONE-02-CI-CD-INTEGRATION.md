# CI/CD Integration Plan: GitHub Actions E2E Testing

## Objective
Set up GitHub Actions workflow that automatically runs Playwright E2E tests on every PR and commit to main/develop branches. Include service startup via Docker Compose, test execution, coverage reporting, and failure notifications.

## Workflow Design

### Trigger Events
```yaml
on:
  push:
    branches: [main, develop, refactor/architecture-deep-fix]
  pull_request:
    branches: [main, develop]
```

### Jobs Structure
1. **E2E Tests** (primary job)
   - Start services (PostgreSQL, Redis)
   - Build and start NestJS backend
   - Build and start Next.js frontend
   - Run Playwright tests
   - Upload test results and reports

2. **Test Report** (secondary job)
   - Parse test results
   - Post PR comment with summary
   - Upload HTML report artifact

## Implementation Steps

### Step 1: Create GitHub Actions Workflow

Create file: `.github/workflows/e2e-tests.yml`

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop, refactor/architecture-deep-fix]
  pull_request:
    branches: [main, develop]

env:
  DATABASE_URL: "postgresql://teable:teable@localhost:5432/teable?schema=public"
  REDIS_URL: "redis://localhost:6379"
  NEXT_PUBLIC_API_ORIGIN: "http://localhost:3000"
  E2E_ADMIN_PASSWORD: "admin123"
  E2E_ADMIN_EMAIL: "test@example.com"
  E2E_WEBSERVER_MODE: "START"

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    services:
      postgres:
        image: postgres:15.4
        env:
          POSTGRES_DB: teable
          POSTGRES_USER: teable
          POSTGRES_PASSWORD: teable
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7.0-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run database migrations
        run: |
          cd apps/nestjs-backend
          pnpm run prisma:migrate:deploy

      - name: Build NestJS backend
        run: |
          cd apps/nestjs-backend
          pnpm run build

      - name: Start NestJS backend
        run: |
          cd apps/nestjs-backend
          pnpm run start > backend.log 2>&1 &
          sleep 10
          curl -s http://localhost:3000/health || (cat backend.log && exit 1)

      - name: Build Next.js frontend
        run: |
          cd apps/nextjs-app
          pnpm run build

      - name: Start Next.js frontend
        run: |
          cd apps/nextjs-app
          pnpm run start > frontend.log 2>&1 &
          sleep 10
          curl -s http://localhost:3001 > /dev/null || (cat frontend.log && exit 1)

      - name: Install Playwright browsers
        run: pnpm run install:playwright

      - name: Run E2E tests
        run: |
          cd apps/nextjs-app
          pnpm exec playwright test --reporter=github

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: apps/nextjs-app/playwright-report/
          retention-days: 30

      - name: Upload test videos
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-videos
          path: apps/nextjs-app/test-results/
          retention-days: 7

      - name: Post test summary to PR
        if: always() && github.event_name == 'pull_request'
        uses: daun/playwright-report-comment@v2
        with:
          report-path: apps/nextjs-app/playwright-report

      - name: Check test results
        if: failure()
        run: |
          echo "::notice::E2E tests failed. Check artifacts for details."
          exit 1
```

### Step 2: Create GitHub Actions Workflow for PR Status Checks

Create file: `.github/workflows/pr-checks.yml`

```yaml
name: PR Checks

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm g:lint
      - run: pnpm g:typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm g:test-unit

  e2e-tests:
    needs: [lint-and-type-check]
    uses: ./.github/workflows/e2e-tests.yml
```

### Step 3: Set GitHub Repository Settings

1. **Branch Protection Rules** (for main branch)
   - Require status checks to pass:
     - E2E Tests (e2e-tests job)
     - Lint and Type Check
     - Unit Tests
   - Require code reviews: 1 approval
   - Dismiss stale reviews on new commits

2. **PR Permissions**
   - Allow auto-merge for admins
   - Require branch to be up to date before merging

### Step 4: Configure Test Report Publishing

Add to `.github/workflows/e2e-tests.yml`:

```yaml
      - name: Publish test report
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: Playwright Test Results
          path: 'apps/nextjs-app/test-results/*.xml'
          reporter: 'java-junit'
          fail-on-error: false

      - name: Create deployment status
        if: success()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.repos.createDeploymentStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              deployment_id: context.payload.deployment.id,
              state: 'success'
            })
```

## Performance Optimizations

### Parallel Test Execution
```yaml
      - name: Run E2E tests (parallel shards)
        run: |
          cd apps/nextjs-app
          pnpm exec playwright test --shard=${{ matrix.shard }}/4
```

### Caching Strategy
```yaml
      - uses: actions/cache@v3
        with:
          path: |
            apps/nextjs-app/.next
            ~/.cache/Cypress
          key: ${{ runner.os }}-build-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-build-
```

### Conditional Skipping
```yaml
      - name: Skip E2E tests for docs-only changes
        id: skip-test
        run: |
          # Skip if only markdown/docs files changed
          if git diff --name-only HEAD~1 | grep -qv '\.(md|txt)$'; then
            echo "should_skip=false" >> $GITHUB_OUTPUT
          else
            echo "should_skip=true" >> $GITHUB_OUTPUT
          fi
```

## Monitoring & Alerts

### Slack Notifications
```yaml
      - name: Notify Slack on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "E2E tests failed on ${{ github.ref }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*E2E Tests Failed* 🔴\n*Branch:* ${{ github.ref }}\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Details>"
                  }
                }
              ]
            }
```

## Implementation Checklist

- [ ] Create `.github/workflows/e2e-tests.yml`
- [ ] Create `.github/workflows/pr-checks.yml`
- [ ] Set up GitHub Secrets:
  - [ ] SLACK_WEBHOOK (if using notifications)
  - [ ] Any required API keys for integrations
- [ ] Configure branch protection rules
- [ ] Test workflow on feature branch
- [ ] Verify PR status checks appear
- [ ] Verify artifacts upload correctly
- [ ] Verify PR comment with test summary
- [ ] Document workflow in README.md

## Maintenance

### Regular Updates
- Monitor Actions versions for updates (GitHub sends Dependabot PRs)
- Review test failures weekly
- Update timeout values based on execution time trends
- Adjust shard count if tests become too slow

### Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| Services timeout to start | Increase `timeout-minutes` in job |
| Tests timeout on CI but pass locally | Reduce parallel shards or increase Playwright timeouts |
| Flaky tests | Add retry logic or investigate race conditions |
| Out of disk space | Clean up artifacts more aggressively |

## Expected Behavior

### On Push to main/develop
- ✓ Run full test suite
- ✓ Generate HTML report
- ✓ Post artifacts to GitHub
- ✓ Send Slack notification if failed

### On Pull Request
- ✓ Run linting + type checking (quick)
- ✓ Run unit tests
- ✓ Run E2E tests (waits for checks)
- ✓ Comment on PR with results
- ✓ Block merge if tests fail

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `.github/workflows/e2e-tests.yml` | Create | Main E2E test workflow |
| `.github/workflows/pr-checks.yml` | Create | PR status check orchestration |
| `.github/workflows/lint.yml` | Create (optional) | Separate lint workflow |
| `.github/dependabot.yml` | Update | Auto-update workflow versions |
| `README.md` | Update | Document CI/CD setup |
| `.github/CODEOWNERS` | Create | Auto-assign PR reviewers |

## Next Steps

1. Create workflow files in local branch
2. Push to GitHub and verify actions trigger
3. Review GitHub Actions logs for any errors
4. Adjust timeouts/configuration based on results
5. Set up branch protection rules
6. Document in project README
7. Train team on reading GitHub Actions reports
