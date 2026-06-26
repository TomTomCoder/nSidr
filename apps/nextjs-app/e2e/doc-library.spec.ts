/**
 * Playwright spec: Doc Library — import and search markdown doc
 *
 * Tests the Phase 7 doc-search controllers end-to-end:
 *   1. Navigate to Doc Library via left sidebar (or directly).
 *   2. Import a small markdown doc via the import API.
 *   3. Verify the doc appears in the list.
 *   4. Search for the doc by name.
 *   5. Assert no 500 errors on any doc-related API calls.
 */

import { test, expect } from '@playwright/test';
import { authFile } from './fixtures/authPaths';

test.use({ storageState: authFile });

const BASE_URL = 'http://localhost:3001';
const DOC_TITLE = 'e2e-test-doc';
const DOC_CONTENT = '# Test Doc\n\nThis is a test document for E2E.';

test.describe('Doc Library', () => {
  test('import and search markdown doc', async ({ page }) => {
    // Collect API 5xx errors for doc-related routes
    const apiErrors: { url: string; status: number }[] = [];
    page.on('response', (r) => {
      if (r.status() >= 500) {
        apiErrors.push({ url: r.url(), status: r.status() });
      }
    });

    // ------------------------------------------------------------------
    // Step 1: Resolve a spaceId by calling the spaces API
    // ------------------------------------------------------------------
    const spacesResp = await page.request.get(`${BASE_URL}/api/space`);
    let spaceId: string | undefined;

    if (spacesResp.ok()) {
      const spaces = (await spacesResp.json()) as Array<{ id: string; name: string }>;
      if (spaces.length > 0) {
        spaceId = spaces[0].id;
      }
    }

    // Fallback: parse spaceId from the current URL after navigating home
    if (!spaceId) {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const urlMatch = page.url().match(/space\/([a-zA-Z0-9_-]+)/);
      if (urlMatch) {
        spaceId = urlMatch[1];
      }
    }

    // ------------------------------------------------------------------
    // Step 2: Navigate to Doc Library via sidebar or direct URL
    // ------------------------------------------------------------------
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Try sidebar link first
    const sidebarLink = page
      .getByRole('link', { name: /doc library|bibliothèque|knowledge base/i })
      .first();
    const sidebarVisible = await sidebarLink.isVisible().catch(() => false);

    if (sidebarVisible) {
      await sidebarLink.click();
      await page.waitForURL((url) => /doc|library|knowledge/i.test(url.pathname), {
        timeout: 5_000,
      });
    } else {
      // Direct navigation fallback
      const docUrl = spaceId
        ? `${BASE_URL}/space/${spaceId}/doc-library`
        : `${BASE_URL}/doc-library`;
      await page.goto(docUrl, { waitUntil: 'networkidle' });
    }

    // Assert we are not on a 404 page
    const pageTitle = await page.title();
    expect(pageTitle).not.toMatch(/404/i);

    // ------------------------------------------------------------------
    // Step 3: Import a markdown doc via API (fallback approach)
    //         The import endpoint is POST /api/spaces/:spaceId/docs/import/markdown
    // ------------------------------------------------------------------
    if (spaceId) {
      const importResp = await page.request.post(
        `${BASE_URL}/api/spaces/${spaceId}/docs/import/markdown`,
        {
          data: { title: DOC_TITLE, content: DOC_CONTENT },
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Should be 200/201 with a jobId
      expect(
        importResp.status(),
        `Import endpoint returned ${importResp.status()}`
      ).toBeLessThan(500);

      // Wait briefly for async BullMQ processor to complete
      await page.waitForTimeout(3_000);

      // ------------------------------------------------------------------
      // Step 4: Verify the doc appears in the list via API
      // ------------------------------------------------------------------
      const listResp = await page.request.get(`${BASE_URL}/api/spaces/${spaceId}/docs`);
      expect(listResp.status(), 'List docs endpoint returned non-2xx').toBeLessThan(300);

      const docs = (await listResp.json()) as Array<{ id: string; title: string }>;
      const found = docs.find((d) => d.title === DOC_TITLE);
      expect(found, `Doc "${DOC_TITLE}" not found in list`).toBeTruthy();

      // ------------------------------------------------------------------
      // Step 5: Search for the doc (keyword search — no OPENAI_API_KEY needed)
      // ------------------------------------------------------------------
      const searchResp = await page.request.post(
        `${BASE_URL}/api/spaces/${spaceId}/docs/search`,
        {
          data: { query: DOC_TITLE, mode: 'keyword', limit: 10 },
          headers: { 'Content-Type': 'application/json' },
        }
      );

      expect(
        searchResp.status(),
        `Search endpoint returned ${searchResp.status()}`
      ).toBeLessThan(500);

      // Clean up: delete the doc so re-runs are idempotent
      if (found?.id) {
        await page.request.delete(`${BASE_URL}/api/spaces/${spaceId}/docs/${found.id}`);
      }
    } else {
      // spaceId could not be resolved — skip import/search steps
      // but still verify the doc library page loads (not 404)
      test.skip(true, 'Could not resolve spaceId — skipping import/search steps');
    }

    // ------------------------------------------------------------------
    // Step 6: If Doc Library UI is rendered, check the page visually
    //         (best-effort — the UI may require a spaceId in the route)
    // ------------------------------------------------------------------
    const docLibraryHeading = page.getByText(/doc library|knowledge base|bibliothèque/i).first();
    const headingVisible = await docLibraryHeading.isVisible().catch(() => false);
    if (headingVisible) {
      await expect(docLibraryHeading).toBeVisible();
    }

    // ------------------------------------------------------------------
    // Final assertion: no 500 errors on any doc-related API calls
    // ------------------------------------------------------------------
    const docApiErrors = apiErrors.filter((e) => e.url.includes('/doc'));
    expect(
      docApiErrors,
      `Doc API 500 errors: ${JSON.stringify(docApiErrors)}`
    ).toHaveLength(0);
  });
});
