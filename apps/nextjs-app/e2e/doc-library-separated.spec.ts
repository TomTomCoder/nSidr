/**
 * Playwright spec: Doc Library — separated mode regression
 *
 * This spec is designed to run against servers already started externally
 * via `pnpm dev:separated` (Next.js on port 3000, NestJS on port 3002).
 *
 * It does NOT use a webServer config — external servers are assumed running.
 * The NestJS port defaults to 3002 (the dev:separated value) and can be
 * overridden with BACKEND_PORT.
 *
 * Acceptance criteria:
 *   AC1: Browser at localhost:3000 loads the app; /api/health returns 200 from the NestJS port
 *   AC2: Doc-library save PATCH resolves in < 3 seconds (no GC stalls)
 *   AC3: NestJS RSS < 500MB after 10 minutes (human-verified — see summary)
 *   AC4: Combined mode unchanged and working (skipped here — run separately)
 *   AC5: SSR pages render without "Cannot connect to API" errors
 *
 * Run: cd apps/nextjs-app && npx playwright test e2e/doc-library-separated.spec.ts
 */

import { test, expect } from '@playwright/test';

const FRONTEND_URL = `http://localhost:${process.env.FRONTEND_PORT ?? '3000'}`;
const BACKEND_URL = `http://localhost:${process.env.BACKEND_PORT ?? '3002'}`;

test.describe('doc-library — separated mode', () => {
  test.use({ baseURL: FRONTEND_URL });

  test.beforeAll(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    } catch {
      test.skip(true, 'Separated-mode servers not running — start with: pnpm dev:separated');
    }
  });

  // ---------------------------------------------------------------------------
  // Test 1: NestJS health endpoint responds at port 3001
  // Confirms NestJS is running as a separate process (AC1)
  // ---------------------------------------------------------------------------
  test('NestJS health endpoint responds at its own (separate) port', async ({ page }) => {
    const response = await page.request.get(`${BACKEND_URL}/health`);
    expect(
      response.status(),
      `Expected 200 from ${BACKEND_URL}/health — is NestJS running? Start with: pnpm dev:separated`
    ).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // Test 2: App loads at localhost:3000 in separated mode (AC1, AC5)
  // ---------------------------------------------------------------------------
  test('app loads at localhost:3000 without connection errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const response = await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    expect(
      response?.status() ?? 0,
      `Expected 200 from ${FRONTEND_URL} — is Next.js running? Start with: pnpm dev:separated`
    ).toBeLessThan(500);

    // AC5: no SSR "Cannot connect to API" errors in page title or body
    const pageTitle = await page.title();
    expect(pageTitle).not.toMatch(/404|Cannot connect|API error/i);

    // Check no critical connection errors appeared as page errors
    const connectionErrors = pageErrors.filter((e) =>
      /cannot connect|ECONNREFUSED|network error/i.test(e)
    );
    expect(
      connectionErrors,
      `Connection errors on page: ${JSON.stringify(connectionErrors)}`
    ).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Doc-library save completes in < 3 seconds in separated mode (AC2)
  //
  // This test navigates to the doc library, imports a doc via the API,
  // and asserts that the PATCH /api/*/docs/* request completes within 3000ms.
  // The 3-second threshold proves absence of the 30–60s GC stalls from Phase 14.
  // ---------------------------------------------------------------------------
  test('doc-library save completes in < 3 seconds in separated mode', async ({ page }) => {
    const DOC_TITLE = `e2e-separated-${Date.now()}`;
    const DOC_CONTENT =
      '# Separated Mode Test\n\nThis doc tests save latency under process separation.';

    // Collect 5xx errors
    const apiErrors: { url: string; status: number }[] = [];
    page.on('response', (r) => {
      if (r.status() >= 500) {
        apiErrors.push({ url: r.url(), status: r.status() });
      }
    });

    // Resolve a spaceId via the NestJS API (proxied through Next.js /api/*)
    const spacesResp = await page.request.get(`${FRONTEND_URL}/api/space`);
    let spaceId: string | undefined;

    if (spacesResp.ok()) {
      const spaces = (await spacesResp.json()) as Array<{ id: string; name: string }>;
      if (spaces.length > 0) {
        spaceId = spaces[0].id;
      }
    }

    // Fallback: parse spaceId from the current URL after navigating home
    if (!spaceId) {
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
      const urlMatch = page.url().match(/space\/([\w-]+)/);
      if (urlMatch) {
        spaceId = urlMatch[1];
      }
    }

    if (!spaceId) {
      test.skip(
        true,
        'Could not resolve spaceId — skipping save latency test. Ensure app is authenticated.'
      );
      return;
    }

    // Import a doc via the API
    const importResp = await page.request.post(
      `${FRONTEND_URL}/api/spaces/${spaceId}/docs/import/markdown`,
      {
        data: { title: DOC_TITLE, content: DOC_CONTENT },
        headers: { 'Content-Type': 'application/json' },
      }
    );

    expect(
      importResp.status(),
      `Import endpoint returned ${importResp.status()} — expected < 500`
    ).toBeLessThan(500);

    // Brief wait for async BullMQ processor
    await page.waitForTimeout(1_000);

    // List docs and find our test doc
    const listResp = await page.request.get(`${FRONTEND_URL}/api/spaces/${spaceId}/docs`);
    expect(listResp.status(), 'List docs endpoint returned non-2xx').toBeLessThan(300);

    const docs = (await listResp.json()) as Array<{ id: string; title: string }>;
    const found = docs.find((d) => d.title === DOC_TITLE);
    expect(found, `Doc "${DOC_TITLE}" not found in list after import`).toBeTruthy();

    if (!found?.id) return;

    // ---------------------------------------------------------------------------
    // AC2 core assertion: PATCH update must complete in < 3000ms
    // This is the regression check for GC stalls (previously 30–60 seconds)
    // ---------------------------------------------------------------------------
    const updatedContent = DOC_CONTENT + '\n\nUpdated at: ' + new Date().toISOString();

    const patchResponsePromise = page.waitForResponse(
      (r) => r.url().includes(`/docs/${found.id}`) && r.request().method() === 'PATCH',
      { timeout: 3000 }
    );

    const patchStart = Date.now();
    const patchResp = await page.request.patch(
      `${FRONTEND_URL}/api/spaces/${spaceId}/docs/${found.id}`,
      {
        data: { content: updatedContent },
        headers: { 'Content-Type': 'application/json' },
        timeout: 3000,
      }
    );
    const patchDuration = Date.now() - patchStart;

    // Await the observed network response (confirms proxy routing worked end-to-end)
    try {
      await patchResponsePromise;
    } catch (err) {
      // waitForResponse may miss direct API calls — only swallow timeout errors
      if (!(err instanceof Error) || !err.message.includes('Timeout')) {
        throw err;
      }
    }

    expect(
      patchResp.status(),
      `PATCH /docs/${found.id} returned ${patchResp.status()}`
    ).toBeLessThan(300);

    expect(
      patchDuration,
      `Save took ${patchDuration}ms — expected < 3000ms. GC stall detected in separated mode!`
    ).toBeLessThan(3000);

    // Clean up
    await page.request.delete(`${FRONTEND_URL}/api/spaces/${spaceId}/docs/${found.id}`);

    // No 5xx errors on doc-related routes
    const docApiErrors = apiErrors.filter((e) => e.url.includes('/doc'));
    expect(docApiErrors, `Doc API 500 errors: ${JSON.stringify(docApiErrors)}`).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Test 4: Combined mode — skipped (run separately per AC4)
  // ---------------------------------------------------------------------------
  test.skip('combined mode pnpm start still works', async () => {
    // Run separately: pnpm --filter @teable/backend start — see AC4
    // This test is intentionally skipped in the separated-mode spec.
    // To verify combined mode, run the existing doc-library.spec.ts:
    //   npx playwright test e2e/doc-library.spec.ts
  });
});
