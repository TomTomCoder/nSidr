/**
 * Playwright fixture that ensures "E2E-Test-Base" exists in the app before
 * feature tests run.
 *
 * Usage in spec files:
 *   import { test, expect, getOrCreateTestBase, TEST_BASE_NAME } from '../fixtures/testBase';
 *
 * The file re-exports `test` and `expect` from @playwright/test so callers
 * can use a single import for both the test harness and the base-setup helper.
 */

import type { Page } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { authFile } from './authPaths';

export { expect } from '@playwright/test';

export const TEST_BASE_NAME = 'E2E-Test-Base';
const BASE_URL = 'http://localhost:3001';

/**
 * Checks if a base named `TEST_BASE_NAME` already exists and creates it only
 * if absent.  Uses the REST API (via page.context().request) for reliable
 * idempotent setup.
 *
 * @returns The id of the E2E-Test-Base.
 */
export async function getOrCreateTestBase(page: Page): Promise<string> {
  const request = page.context().request;

  // 1. Get all accessible bases via the "all" endpoint.
  const allBasesRes = await request.get(`${BASE_URL}/api/base/access/all`);
  if (!allBasesRes.ok()) {
    throw new Error(`GET /api/base/access/all failed: ${allBasesRes.status()}`);
  }
  const allBases = (await allBasesRes.json()) as Array<{
    id: string;
    name: string;
    spaceId: string;
  }>;

  // 2. Return early if the base already exists.
  const existing = allBases.find((b) => b.name === TEST_BASE_NAME);
  if (existing) return existing.id;

  // 3. Find the user's first space to create the base in.
  const spacesRes = await request.get(`${BASE_URL}/api/space/`);
  if (!spacesRes.ok()) {
    throw new Error(`GET /api/space/ failed: ${spacesRes.status()}`);
  }
  const spaces = (await spacesRes.json()) as Array<{ id: string; name: string }>;

  if (spaces.length === 0) {
    throw new Error(
      'No spaces found for the test user. The user needs at least one space to create a base.'
    );
  }

  // 4. Create the base.
  const createRes = await request.post(`${BASE_URL}/api/base`, {
    data: { spaceId: spaces[0].id, name: TEST_BASE_NAME },
  });
  if (!createRes.ok()) {
    throw new Error(`POST /api/base failed: ${createRes.status()} ${await createRes.text()}`);
  }
  const newBase = (await createRes.json()) as { id: string };
  return newBase.id;
}

/**
 * Extended test fixture that:
 *  1. Runs as the authenticated admin (storageState from auth.ts).
 *  2. Provides `testBasePage` — a page already on the E2E-Test-Base.
 */
export const test = base.extend<{ testBasePage: Page }>({
  storageState: authFile,

  testBasePage: async ({ page }, use) => {
    await getOrCreateTestBase(page);
    await use(page);
  },
});

/**
 * Standalone setup test — can be run as part of a global setup project.
 * Named clearly so it is recognisable in reports.
 */
base.describe('Setup: create E2E-Test-Base', () => {
  base.use({ storageState: authFile });

  base('create or verify E2E-Test-Base exists', async ({ page }) => {
    const baseId = await getOrCreateTestBase(page);
    expect(baseId, 'E2E-Test-Base should have an id').toBeTruthy();
  });
});
