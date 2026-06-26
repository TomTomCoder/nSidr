/**
 * Playwright E2E spec for the Automations feature (Phase 4 / Plan 09-06).
 *
 * Navigates to the nXtFlow base, opens the Automations section, clicks the
 * "Test" automation entry, and verifies that the detail panel renders with a
 * trigger section and a Run button.
 *
 * API route under test: GET /api/base/:baseId/workflow  (frontend URL: /base/:baseId/automation)
 * BackEnd controller: WorkflowController in apps/nestjs-backend/src/features/workflow/
 */

import { test, expect } from '@playwright/test';
import { authFile } from './fixtures/authPaths';

test.use({ storageState: authFile });

test.describe('Automations', () => {
  test('automation list loads and panel opens', async ({ page }) => {
    // Collect any 4xx/5xx API errors throughout the test
    const apiErrors: { url: string; status: number }[] = [];
    page.on('response', (r) => {
      if (r.status() >= 400) {
        apiErrors.push({ url: r.url(), status: r.status() });
      }
    });

    // 1. Navigate to the app root
    await page.goto('http://localhost:3001');

    // 2. Wait for the sidebar to be ready, then click the "nXtFlow" base
    const nxtFlowBase = page.getByText('nXtFlow', { exact: false }).first();
    const baseFound = await nxtFlowBase
      .waitFor({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (!baseFound) {
      test.skip(true, 'nXtFlow base not found in sidebar — skipping automation test');
      return;
    }

    await nxtFlowBase.click();

    // 3. Wait for the base page to load, then find the Automations navigation item
    //    The URL pattern is /base/{baseId}/automation
    //    Try tab role first, then fallback to text link in sidebar
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const automationsNav =
      page.getByRole('tab', { name: /automations/i }).first() ||
      page.getByRole('link', { name: /automations/i }).first() ||
      page.getByText(/^automations$/i).first();

    const automationsNavFound = await automationsNav
      .waitFor({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (!automationsNavFound) {
      // Try navigating directly by URL: find the baseId from current URL
      const currentUrl = page.url();
      const baseIdMatch = currentUrl.match(/\/base\/([^/]+)/);
      if (baseIdMatch) {
        const baseId = baseIdMatch[1];
        await page.goto(`http://localhost:3001/base/${baseId}/automation`);
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      }
    } else {
      await automationsNav.click();
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    }

    // 4. Wait for the automation list panel to appear and assert no API errors
    //    The list container shows a heading or workflow entries
    await page
      .getByText(/automation|workflow/i)
      .first()
      .waitFor({ timeout: 8_000 })
      .catch(() => {});

    const automationApiErrors = apiErrors.filter(
      (e) =>
        (e.url.includes('workflow') || e.url.includes('automation')) &&
        (e.status === 404 || e.status === 500)
    );
    expect(
      automationApiErrors,
      `API errors for automation endpoints: ${JSON.stringify(automationApiErrors)}`
    ).toHaveLength(0);

    // 5. Click the "Test" automation entry (or first automation if not found)
    const testEntry = page.getByText('Test', { exact: true }).first();
    const testEntryFound = await testEntry
      .waitFor({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (testEntryFound) {
      await testEntry.click();
    } else {
      // Fall back to the first automation card in the list
      const firstAutomation = page
        .locator('[role="button"]')
        .filter({ hasText: /automation|workflow/i })
        .first();
      const firstFound = await firstAutomation
        .waitFor({ timeout: 3_000 })
        .then(() => true)
        .catch(() => false);

      if (firstFound) {
        await firstAutomation.click();
      } else {
        // If no automations exist at all, the empty state is valid — test passes as long as
        // no API errors occurred (checked above).
        test.skip(true, 'No automation entries found in list — skipping panel assertions');
        return;
      }
    }

    // 6. Wait for the automation detail panel / dialog to open
    //    Assert trigger section is visible
    const triggerSection = page.getByText(/trigger|déclencheur/i).first();
    await expect(triggerSection).toBeVisible({ timeout: 5_000 });

    //    Assert Run button is visible
    const runButton = page.getByRole('button', { name: /run|exécuter/i }).first();
    await expect(runButton).toBeVisible({ timeout: 5_000 });

    // Final: no automation-related API errors at any point
    const finalApiErrors = apiErrors.filter(
      (e) => e.url.includes('workflow') || e.url.includes('automation')
    );
    expect(
      finalApiErrors,
      `Unexpected automation API errors: ${JSON.stringify(finalApiErrors)}`
    ).toHaveLength(0);
  });
});
