# Teable — project context

Teable is a no-code database platform (spreadsheet UI over Postgres). pnpm monorepo: `apps/nestjs-backend` (API, ~152k LoC), `apps/nextjs-app` (web), `packages/` (core, sdk, openapi, formula, db-main-prisma, db-data-prisma, v2). Requires PostgreSQL + Redis.

## Launching the app

**Always use:** `pnpm start:local` (wraps `scripts/launch-local.sh`; `pnpm start:local:rebuild` to force a backend rebuild). Web = http://localhost:3000, API = :3002. Logs in `/tmp/teable-backend.log` and `/tmp/teable-frontend.log`. Stop: `pkill -f 'nestjs-backend/dist/index.js'; pkill -f 'next dev'`.

The script handles all known failure modes — see `.claude/skills/run-app/SKILL.md` before debugging a launch by hand. Summary:
- **Native module arch mismatch**: `~/.local/bin/node` is x86_64, the machine and nvm node are arm64. bcrypt/sqlite3/better-sqlite3 must match the node that loads them (`incompatible architecture` errors). Backend unit tests currently fail for this reason (`pnpm rebuild sqlite3` with the right node fixes it).
- **Stale `apps/nestjs-backend/dist`** can carry already-fixed bugs (e.g. DocSearchModule circular-dependency boot crash) — rebuild with `pnpm exec nest build --webpackPath ./webpack.swc.js`.
- `node --env-file` needs an **absolute** path.
- SMTP `ECONNREFUSED :587` at boot is harmless.
- Avoid `pnpm dev:swc` (webpack watch + Turbopack → OOM over time).

## Performance work

`.planning/PERFORMANCE-RECOMMENDATIONS.md` tracks the perf audit (2026-06-11) and what's implemented:
- Slow-query logging: set `PRISMA_SLOW_QUERY_THRESHOLD_MS` (e.g. 500) to log slow queries in any env.
- Pool tuning: `PRISMA_CONNECTION_LIMIT` / `PRISMA_POOL_TIMEOUT` env vars are appended to the Postgres URL by `packages/db-main-prisma/src/database-url.ts`.
- Transaction defaults: `PRISMA_TRANSACTION_TIMEOUT` / `PRISMA_TRANSACTION_MAX_WAIT`.
- Biggest open item: ~500 unbounded `findMany` call sites in the backend (likely cause of the runtime OOM).
- Heap profiling: `HEAP_SNAPSHOT=1 bash scripts/launch-local.sh`, then `kill -USR2 <backend_pid>` to dump `.heapsnapshot` in cwd for Chrome DevTools analysis.
- Bundle analysis: `cd apps/nextjs-app && pnpm bundle-analyze` (runs `ANALYZE=true` prod build, opens browser with chunk visualization).

## Verification caveats

- This branch (`refactor/architecture-deep-fix`) has ~270 pre-existing TS errors in `packages/v2`, e2e specs, and AgentChat (`@/types/agent` missing). When typechecking, compare against files you touched, not the global count.
- UI is in French; test login via the browser (session usually persisted).

# context-mode — MANDATORY routing rules

You have context-mode MCP tools available. These rules are NOT optional — they protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session.

## BLOCKED commands — do NOT attempt these

### curl / wget — BLOCKED
Any Bash command containing `curl` or `wget` is intercepted and replaced with an error message. Do NOT retry.
Instead use:
- `ctx_fetch_and_index(url, source)` to fetch and index web pages
- `ctx_execute(language: "javascript", code: "const r = await fetch(...)")` to run HTTP calls in sandbox

### Inline HTTP — BLOCKED
Any Bash command containing `fetch('http`, `requests.get(`, `requests.post(`, `http.get(`, or `http.request(` is intercepted and replaced with an error message. Do NOT retry with Bash.
Instead use:
- `ctx_execute(language, code)` to run HTTP calls in sandbox — only stdout enters context

### WebFetch — BLOCKED
WebFetch calls are denied entirely. The URL is extracted and you are told to use `ctx_fetch_and_index` instead.
Instead use:
- `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` to query the indexed content

## REDIRECTED tools — use sandbox equivalents

### Bash (>20 lines output)
Bash is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `ctx_batch_execute(commands, queries)` — run multiple commands + search in ONE call
- `ctx_execute(language: "shell", code: "...")` — run in sandbox, only stdout enters context

### Read (for analysis)
If you are reading a file to **Edit** it → Read is correct (Edit needs content in context).
If you are reading to **analyze, explore, or summarize** → use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context. The raw file content stays in the sandbox.

### Grep (large results)
Grep results can flood context. Use `ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` — Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` — Sandbox execution. Only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` — Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` — Store content in FTS5 knowledge base for later search.

## Subagent routing

When spawning subagents (Agent/Task tool), the routing block is automatically injected into their prompt. Bash-type subagents are upgraded to general-purpose so they have access to MCP tools. You do NOT need to manually instruct subagents about context-mode.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES — never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `ctx_search(source: "label")` later.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `ctx_stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `ctx_doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `ctx_upgrade` MCP tool, run the returned shell command, display as checklist |
