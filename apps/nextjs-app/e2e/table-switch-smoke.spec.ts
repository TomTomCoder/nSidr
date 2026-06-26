/**
 * Smoke spec: regression guard for table-switch re-render cascade
 * (NEXT-ACTIONS.md item #8). Switches between two tables in nXtFlow
 * and asserts no JS errors and that the grid container stays mounted
 * across the transition.
 *
 * Requires the dev server running and the auth fixture populated.
 */

import { expect, test } from '@playwright/test';
import { authFile } from './fixtures/authPaths';

test.use({ storageState: authFile });

test.describe('Table switch smoke', () => {
  test('switching tables keeps grid mounted and emits no JS errors', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (e) => jsErrors.push(e.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });

    const nxtFlowLink = page.getByRole('link', { name: /nXtFlow/i }).first();
    const nxtFlowVisible = await nxtFlowLink.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!nxtFlowVisible) {
      test.skip(true, 'nXtFlow base not found — skipping');
      return;
    }
    await nxtFlowLink.click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 });

    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    if (tabCount < 2) {
      test.skip(true, 'need ≥ 2 table tabs to test switching');
      return;
    }

    const grid = page.locator('[data-testid="grid-view"], [role="grid"]').first();
    await expect(grid).toBeVisible({ timeout: 15_000 });

    await tabs.nth(1).click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    await expect(grid.or(page.locator('[role="grid"]')).first()).toBeVisible({ timeout: 15_000 });

    await tabs.nth(0).click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    await expect(grid.or(page.locator('[role="grid"]')).first()).toBeVisible({ timeout: 15_000 });

    expect(jsErrors, `console errors: ${jsErrors.join('\n')}`).toHaveLength(0);
  });
});
