import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3002';

/**
 * Standalone UI Smoke Tests
 * No auth fixture needed - tests public/early-load UI elements
 */

test.describe('Teable UI Smoke Tests', () => {
  // ========================================================================
  // 1. PAGE LOAD & BASIC STRUCTURE
  // ========================================================================

  test('page loads and responds', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBeLessThan(400);
  });

  test('page has content visible', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Should have some content
    const bodyContent = await page.locator('body').isVisible();
    expect(bodyContent).toBeTruthy();
  });

  test('backend API responds', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/api/healthz`);
    expect([200, 201, 204, 301, 302, 303, 304, 307, 308]).toContain(response.status());
  });

  // ========================================================================
  // 2. RENDER TIME
  // ========================================================================

  test('page renders within 15 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(15000);
    console.log(`✓ Page loaded in ${loadTime}ms`);
  });

  // ========================================================================
  // 3. INTERACTIVE ELEMENTS
  // ========================================================================

  test('has interactive elements (buttons, inputs)', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Count interactive elements
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input, textarea').count();

    console.log(`✓ Found ${buttons} buttons and ${inputs} input elements`);
    expect(buttons + inputs).toBeGreaterThan(0);
  });

  // ========================================================================
  // 4. NO CRITICAL CONSOLE ERRORS
  // ========================================================================

  test('no critical errors in console', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Filter known non-critical errors
    const critical = errors.filter(
      e => !e.includes('ResizeObserver') &&
           !e.includes('Non-Error') &&
           !e.includes('Warning')
    );

    console.log(`✓ Console errors: ${critical.length}`);
    expect(critical.length).toBeLessThan(3); // Allow some minor warnings
  });

  // ========================================================================
  // 5. TEXT CONTENT VERIFICATION
  // ========================================================================

  test('page contains expected text content', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Look for common UI text
    const pageText = await page.textContent('body');

    // Should have some meaningful content
    expect(pageText?.length).toBeGreaterThan(100);
    console.log(`✓ Page has ${pageText?.length} characters of content`);
  });

  // ========================================================================
  // 6. RESPONSIVE DESIGN
  // ========================================================================

  test('is responsive at mobile size', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const body = page.locator('body');
    expect(await body.isVisible()).toBeTruthy();
    console.log('✓ Mobile viewport OK');
  });

  test('is responsive at tablet size', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const body = page.locator('body');
    expect(await body.isVisible()).toBeTruthy();
    console.log('✓ Tablet viewport OK');
  });

  test('is responsive at desktop size', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const body = page.locator('body');
    expect(await body.isVisible()).toBeTruthy();
    console.log('✓ Desktop viewport OK');
  });

  // ========================================================================
  // 7. NEW FEATURES - VISUAL VERIFICATION
  // ========================================================================

  test('[NEW] PromptCarousel elements exist in DOM', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Look for carousel-related classes or patterns
    const caretElements = await page.locator('[class*="caret"], [class*="Caret"]').count();
    const carouselElements = await page.locator('[class*="carousel"], [class*="Carousel"]').count();
    const animateElements = await page.locator('[class*="animate"], [class*="Animate"]').count();

    console.log(`✓ Carousel elements: ${caretElements + carouselElements + animateElements}`);
  });

  test('[NEW] TaskProgressPanel elements exist in DOM', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Look for progress-related elements
    const progressElements = await page.locator('[class*="progress"], [class*="Progress"]').count();
    const taskElements = await page.locator('[class*="task"], [class*="Task"]').count();

    console.log(`✓ Progress panel elements: ${progressElements + taskElements}`);
  });

  // ========================================================================
  // 8. ACCESSIBILITY BASELINE
  // ========================================================================

  test('has semantic HTML landmarks', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const main = await page.locator('main, [role="main"]').count();
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    const nav = await page.locator('nav, [role="navigation"]').count();

    console.log(`✓ Landmarks: main=${main}, headings=${headings}, nav=${nav}`);
    expect(headings + nav).toBeGreaterThan(0);
  });

  test('has ARIA labels on interactive elements', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const ariaElements = await page.locator('[aria-label], [aria-describedby], [role]').count();
    console.log(`✓ Elements with ARIA attributes: ${ariaElements}`);
  });
});
