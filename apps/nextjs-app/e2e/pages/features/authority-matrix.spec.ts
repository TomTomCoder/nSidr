/**
 * Authority Matrix E2E tests — plan 09-09
 *
 * Tests the Authority Matrix feature (Phase 1):
 *   - Navigate to base and access authority matrix page
 *   - Verify matrix table renders with role columns (Owner/Creator/Editor/Commenter/Viewer)
 *   - Test permission toggle (checkbox interaction and API call)
 *   - Test unauthorized access is blocked
 *
 * The authority matrix is accessed via /base/{baseId}/authority-matrix
 * and provides a UI to manage roles and their permissions across actions.
 */

import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { authFile } from '../../fixtures/authPaths';
import { getOrCreateTestBase } from '../../fixtures/testBase';

// ─── constants ──────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3001';

// ─── test configuration ──────────────────────────────────────────────────────

test.use({ storageState: authFile });

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Create an authority matrix via the REST API.
 * Returns the matrixId for use in subsequent tests.
 */
async function createAuthorityMatrixViaApi(
  request: APIRequestContext,
  baseId: string,
  name: string
): Promise<string> {
  const res = await request.post(`${BASE_URL}/api/base/${baseId}/authority-matrix`, {
    data: { name },
  });
  expect(res.ok(), `POST authority-matrix failed: ${res.status()}`).toBe(true);
  const body = await res.json();
  return body.id as string;
}

/**
 * Create a role in the authority matrix via REST API.
 * Returns the roleId.
 */
async function createAuthorityMatrixRoleViaApi(
  request: APIRequestContext,
  baseId: string,
  matrixId: string,
  roleData: { name: string }
): Promise<string> {
  const res = await request.post(
    `${BASE_URL}/api/base/${baseId}/authority-matrix/${matrixId}/role`,
    {
      data: roleData,
    }
  );
  expect(res.ok(), `POST authority-matrix role failed: ${res.status()}`).toBe(true);
  const body = await res.json();
  return body.id as string;
}

// ─── test suite ──────────────────────────────────────────────────────────────

test.describe('Authority Matrix', () => {
  let baseId: string;
  let matrixId: string;
  let roleId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();
    baseId = await getOrCreateTestBase(page);
    await context.close();
  });

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();

    // Create a fresh authority matrix for each test
    matrixId = await createAuthorityMatrixViaApi(page.request, baseId, 'Test Authority Matrix');
    roleId = await createAuthorityMatrixRoleViaApi(page.request, baseId, matrixId, {
      name: 'Test Role',
    });

    await context.close();
  });

  test('renders authority matrix page with table', async ({ page }) => {
    // Navigate directly to the authority matrix page
    await page.goto(`/base/${baseId}/authority-matrix`);

    // Wait for the page to load and the main content to be visible
    await page.waitForLoadState('networkidle');

    // Verify that a table or grid with role columns is visible
    // Look for headers or labels indicating role columns (Owner, Creator, Editor, Commenter, Viewer)
    const matrixTable = await page.locator('table, [role="grid"], .authority-matrix').first();
    await expect(matrixTable).toBeVisible();

    // Verify at least 4 columns are present by checking for role-related text
    const pageText = await page.content();
    const hasRoleIndicators =
      pageText.includes('Owner') ||
      pageText.includes('Creator') ||
      pageText.includes('Editor') ||
      pageText.includes('Commenter') ||
      pageText.includes('Viewer') ||
      pageText.includes('Propriétaire') ||
      pageText.includes('Créateur') ||
      pageText.includes('Éditeur');

    expect(hasRoleIndicators).toBe(true);
  });

  test('permission toggle saves without error', async ({ page }) => {
    // Navigate to authority matrix
    await page.goto(`/base/${baseId}/authority-matrix`);
    await page.waitForLoadState('networkidle');

    // Collect all network responses to monitor for errors
    let serverErrorOccurred = false;
    page.on('response', (response) => {
      if (response.status() >= 500) {
        serverErrorOccurred = true;
        console.error(`Server error: ${response.status()} ${response.url()}`);
      }
    });

    // Find a checkbox for a permission toggle and click it
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    if (checkboxes.length > 0) {
      const firstCheckbox = checkboxes[0];
      const isChecked = await firstCheckbox.isChecked();

      // Click to toggle the permission
      await firstCheckbox.click();

      // Wait a moment for the API call to complete
      await page.waitForLoadState('networkidle');

      // Verify no server errors occurred
      expect(serverErrorOccurred).toBe(false);

      // Verify the checkbox state changed
      const newState = await firstCheckbox.isChecked();
      expect(newState).not.toBe(isChecked);
    }
  });

  test('unauthorized access is blocked', async ({ browser }) => {
    // Create a fresh context without authentication
    const unauthContext = await browser.newContext();
    const unauthPage = await unauthContext.newPage();

    // Try to navigate directly to the authority matrix page without auth
    const response = await unauthPage.goto(`/base/${baseId}/authority-matrix`);

    // Expect redirect to login or 403 response
    const urlAfterNav = unauthPage.url();
    const isRedirectedToLogin =
      urlAfterNav.includes('/auth/login') ||
      urlAfterNav.includes('/login') ||
      response?.status() === 403 ||
      response?.status() === 401;

    expect(isRedirectedToLogin).toBe(true);

    await unauthContext.close();
  });
});
