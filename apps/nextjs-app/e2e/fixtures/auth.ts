/**
 * Playwright authentication setup script.
 *
 * Logs in as the admin user and saves storageState to .auth.json so that
 * downstream fixture files can reuse the authenticated session without
 * repeating the login flow.
 *
 * Run as a Playwright setup project:
 *   playwright test e2e/fixtures/auth.ts --project="Desktop Chrome"
 *
 * Or import the `authFile` path constant to reference the saved state:
 *   import { authFile } from './auth';
 */

import { chromium, test as setup } from '@playwright/test';
import { authFile } from './authPaths';

export { authFile } from './authPaths';

const BASE_URL = 'http://localhost:3001';
// Credentials are configurable via environment variables.
// Defaults match the dev seed user (apps/nestjs-backend/vitest-e2e.setup.ts).
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'test@e2e.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '12345678';

setup('authenticate as admin', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  // Navigate to the login page. The app may redirect / -> /auth/login automatically.
  await page.goto('/auth/login');

  // Wait for the login form to be visible.
  // The email input uses type="text" (not type="email") in the Teable SignForm.
  await page.waitForSelector('#email', { timeout: 15_000 });

  // Fill credentials using stable id selectors (from SignForm.tsx).
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);

  // Submit the form — button text is "Sign in" in English.
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait until we are redirected away from the login page (to /space or similar).
  await page.waitForURL(
    (url) => !url.pathname.includes('login') && !url.pathname.includes('/auth/'),
    {
      timeout: 25_000,
    }
  );

  // Persist cookies / localStorage so other tests can reuse this session.
  await context.storageState({ path: authFile });

  await browser.close();
});
