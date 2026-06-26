---
phase: 14-process-separation
reviewed: 2026-06-03T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - apps/nextjs-app/src/backend/api/rest/axios.ts
  - apps/nextjs-app/.env.development
  - apps/nestjs-backend/.env
  - apps/nextjs-app/next.config.js
  - package.json
  - apps/nextjs-app/e2e/doc-library-separated.spec.ts
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: fixed
fixed: 2026-06-03T00:00:00Z
fixed_info: true
---

# Phase 14: Code Review Report

**Reviewed:** 2026-06-03T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 14 implements process separation between Next.js and NestJS by introducing a `BACKEND_URL`
environment variable into the SSR axios factory, a `/api/*` dev proxy rewrite, `concurrently`-based
launch scripts, and a Playwright regression spec. The scope is narrow and the core idea is sound,
but two security-class issues were found in the committed `.env` files, one correctness issue in the
proxy (wrong port variable used at runtime), and reliability gaps in the E2E spec. No source logic
was incorrect beyond the port-variable bug.

---

## Critical Issues

### CR-01: Real JWT secret committed to `nestjs-backend/.env`

**File:** `apps/nestjs-backend/.env:5`
**Issue:** `BACKEND_JWT_SECRET="local-dev-secret-change-in-production"` is committed in plaintext.
Even though the value is labelled "local-dev", this file is tracked in git (it appears in a
committed worktree). If this repository is or becomes public, or if this pattern propagates to a
staging/prod `.env`, the JWT signing key is permanently leaked in history. The phrase "change-in-production"
is not a guard — it is a documentation comment that historically never gets acted on once a value is
wired up.

Additionally `INTEGRATION_SECRET_KEY="local-dev-integration-secret-key-32chars"` on line 16 carries
the same risk.

**Fix:** Remove all secret values from `.env` files committed to git. Keep a `.env.example` with
placeholder tokens (`BACKEND_JWT_SECRET=CHANGE_ME`) and `.gitignore` the real `.env`. If the file
must be committed (monorepo convention), replace the literal value with an empty string or documented
placeholder and enforce the pattern in CI:

```bash
# .env — committed placeholder form
BACKEND_JWT_SECRET=
INTEGRATION_SECRET_KEY=
```

Then provision real values via a secrets manager or CI environment variables only.

---

### CR-02: `start:separated` script inlines `BACKEND_URL=http://localhost:3001` for production

**File:** `package.json:65`
**Issue:** The `start:separated` script hard-codes `BACKEND_URL=http://localhost:3001` as an inline
shell assignment. In a production deployment the NestJS process will almost never be on `localhost`
at port 3001 — it will be behind a load balancer, internal DNS name, or container network address.
Any operator running `pnpm start:separated` in production without overriding this will silently
route all SSR API calls to a non-existent local address, causing 100% SSR request failures with
no warning at startup.

**Fix:** Remove the hard-coded `BACKEND_URL` from the `start:separated` inline env and require it
to be set explicitly in the deployment environment, failing fast if absent:

```jsonc
// package.json scripts — production script should NOT bake in a localhost URL
"start:separated": "concurrently --kill-others-on-fail --names \"api,web\" --prefix-colors \"blue,green\" \"PORT=3001 BACKEND_SKIP_NEXT_START=true pnpm --filter @teable/backend start\" \"pnpm --filter @teable/nextjs-app start\""
```

Document that `BACKEND_URL` must be set in the deployment environment before running this script.

---

## Warnings

### WR-01: API proxy uses `NEXTJS_SOCKET_PORT` (3001) for both socket AND API routes — env var name is misleading and fragile

**File:** `apps/nextjs-app/next.config.js:225-231`
**Issue:** The `apiProxy` destination reuses `NEXTJS_SOCKET_PORT` (defaulting to `3001`):

```js
const NEXTJS_SOCKET_PORT = process.env.SOCKET_PORT || '3001';
// ...
const apiProxy = {
  source: '/api/:path*',
  destination: `http://localhost:${NEXTJS_SOCKET_PORT}/api/:path*`,
};
```

In separated mode the intent is to forward `/api/*` to the NestJS API port. Using a variable named
`NEXTJS_SOCKET_PORT` (set via `SOCKET_PORT`) conflates socket traffic with REST API traffic. If
someone changes `SOCKET_PORT` to move WebSocket traffic without realising it also controls the REST
proxy, REST calls will break silently. More concretely: in `dev:separated`, the NestJS process runs
on `PORT=3001` (which is `BACKEND_PORT`), but the proxy reads `SOCKET_PORT` — if these ever diverge
the proxy points to the wrong address with no error.

**Fix:** Introduce a dedicated variable for the API proxy destination and read it independently:

```js
const NEXTJS_BACKEND_PORT = process.env.BACKEND_PORT || process.env.SOCKET_PORT || '3001';
const apiProxy = {
  source: '/api/:path*',
  destination: `http://localhost:${NEXTJS_BACKEND_PORT}/api/:path*`,
};
```

Alternatively, read `BACKEND_URL` directly in `next.config.js` so the proxy and the SSR axios
factory always agree on the backend address.

---

### WR-02: `axios.ts` module-level singleton is evaluated at import time — env var read is one-shot

**File:** `apps/nextjs-app/src/backend/api/rest/axios.ts:9`
**Issue:** Line 9 exports a module-level constant:

```ts
export const axios = getAxios();
```

`getAxios()` reads `process.env.BACKEND_URL` at module initialisation time (when the module is
first `require()`d by the Next.js server process). In serverless/edge runtimes and some hot-reload
scenarios this is fine, but in a long-lived Node.js process where `BACKEND_URL` is injected
after server startup (e.g. via a secrets manager writing to the process environment mid-flight),
the singleton will have already captured the old (possibly `undefined`) value. More importantly,
if a caller imports `axios` directly and `BACKEND_URL` was not set when the module first loaded
(e.g. in a test environment without `.env` pre-loading), the baseURL will silently fall back to
`http://localhost:undefined/api` (if `PORT` is also unset), producing a URL that causes
`ECONNREFUSED` with a confusing error message.

**Fix:** Prefer `getAxios()` at call sites over the re-exported singleton, or validate both env
vars at startup and throw a clear error:

```ts
export const getAxios = () => {
  const backendUrl = process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT}`;
  if (!process.env.BACKEND_URL && !process.env.PORT) {
    throw new Error('Either BACKEND_URL or PORT must be set for SSR axios baseURL');
  }
  const axios = createAxios();
  axios.defaults.baseURL = `${backendUrl}/api`;
  return axios;
};
```

---

### WR-03: Playwright spec silently swallows `waitForResponse` failures with empty catch

**File:** `apps/nextjs-app/e2e/doc-library-separated.spec.ts:163-168`
**Issue:**

```ts
try {
  await patchResponsePromise;
} catch {
  // If page.waitForResponse didn't catch it (request was direct, not via page),
  // fall back to checking the direct response status
}
```

The `waitForResponse` promise has a 3000ms timeout set on line 149. If the PATCH takes longer than
3000ms, `waitForResponse` throws a timeout error — but this catch block silently discards it. The
subsequent `patchDuration` assertion on line 175 will still catch a > 3000ms latency via the
direct `page.request.patch` path, but the `waitForResponse` failure — which specifically validates
that the request went through the Next.js proxy — is thrown away. This means the proxy routing
portion of AC2 is not verified when the timeout fires.

**Fix:** Re-throw or assert on the error if it is not a timeout:

```ts
try {
  await patchResponsePromise;
} catch (err) {
  // waitForResponse may miss direct API calls — only fail on non-timeout errors
  if (!(err instanceof Error) || !err.message.includes('Timeout')) {
    throw err;
  }
}
```

---

## Info

### IN-01: `BACKEND_URL` in `.env.development` is undocumented for combined-mode developers

**File:** `apps/nextjs-app/.env.development:38`
**Issue:** The comment says "In combined mode this file is absent/ignored and .env is used instead"
(line 37), but `.env.development` is always loaded by Next.js in `NODE_ENV=development` regardless
of whether a developer is running combined or separated mode. When a developer runs the default
`pnpm dev` (combined mode), Next.js will load `.env.development`, pick up
`BACKEND_URL=http://localhost:3001`, and point all SSR axios calls to port 3001 — but NestJS in
combined mode listens on port 3000. This silently breaks SSR in combined dev mode.

**Fix:** Either remove `BACKEND_URL` from `.env.development` and document that separated mode
requires manual export:

```bash
# How to run separated:
BACKEND_URL=http://localhost:3001 pnpm dev
```

Or guard the axios factory more carefully (e.g. only use `BACKEND_URL` if `BACKEND_PORT` is also
set and differs from `PORT`).

---

### IN-02: E2E spec has no `webServer` config and will fail silently in CI if servers are not pre-started

**File:** `apps/nextjs-app/e2e/doc-library-separated.spec.ts:1-18`
**Issue:** The spec comment acknowledges that servers must be "already started externally". Without
a `webServer` config (or a CI job step that starts `pnpm dev:separated` and waits for readiness),
this spec will fail immediately in any CI environment with a misleading `ECONNREFUSED` or
`net::ERR_CONNECTION_REFUSED` error that looks like an app bug rather than a missing prerequisite.

**Fix:** Either add a `webServer` config in the Playwright project configuration (or a local
`playwright.config.ts` override) for the separated-mode spec, or add a `test.beforeAll` that
checks port availability and skips the entire suite with a clear message if the servers are down:

```ts
test.beforeAll(async () => {
  // Verify servers are reachable before running suite
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  } catch {
    test.skip(true, 'Separated-mode servers not running. Start with: pnpm dev:separated');
  }
});
```

---

_Reviewed: 2026-06-03T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
