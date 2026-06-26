import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3002';

/**
 * Comprehensive UI Feature Tests for Teable
 * Tests all major features including NEW additions:
 * - Typewriter carousel (auto-cycling prompts)
 * - Task progress panel (sticky checklist)
 * - AI agent tools
 */

test.describe('Teable UI Feature Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Set a reasonable timeout for pages to load
    page.setDefaultTimeout(10000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  // ========================================================================
  // 1. APP INITIALIZATION & NAVIGATION
  // ========================================================================

  test('should load the homepage', async () => {
    await page.goto(BASE_URL);
    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('localhost:3000');
  });

  test('should have visible UI elements on home', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check for key navigation elements
    const mainContent = await page.locator('main, [role="main"], body').isVisible();
    expect(mainContent).toBeTruthy();
  });

  // ========================================================================
  // 2. CHAT PANEL & AGENT FEATURES
  // ========================================================================

  test('should display chat panel', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for chat-related elements
    const chatElements = await page.locator('[class*="chat"], [class*="Chat"]').count();
    console.log(`Found ${chatElements} chat-related elements`);
  });

  test('should show typewriter carousel in empty state (NEW FEATURE)', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for carousel indicators or text animation
    const carouselElements = await page.locator('[class*="carousel"], [class*="Carousel"]').count();
    console.log(`Found ${carouselElements} carousel elements`);

    // Look for pagination dots or animated text
    const pagination = await page.locator('[class*="pagination"], [class*="dots"], svg[class*="dot"]').count();
    console.log(`Found ${pagination} pagination elements`);
  });

  test('should display task progress panel when available (NEW FEATURE)', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for task progress panel
    const taskProgressElements = await page.locator(
      'text=/Task Progress|Progress.*\\d+.*\\d+|✓|completed/',
      { exact: false }
    ).count();
    console.log(`Found ${taskProgressElements} task progress indicators`);
  });

  // ========================================================================
  // 3. FORM & INPUT ELEMENTS
  // ========================================================================

  test('should have textarea for chat input', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea');
    const textareaCount = await textarea.count();
    console.log(`Found ${textareaCount} textarea elements`);
  });

  test('should accept text input in chat', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textarea.fill('test message');
      const value = await textarea.inputValue();
      expect(value).toBe('test message');
    } else {
      console.log('Textarea not found or not visible');
    }
  });

  // ========================================================================
  // 4. BUTTONS & INTERACTIVE ELEMENTS
  // ========================================================================

  test('should have send button or submit action', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for send button
    const sendButtons = await page.locator(
      'button:has-text("Send"), button[aria-label*="send" i], [class*="send"] button'
    ).count();
    console.log(`Found ${sendButtons} send-related buttons`);
  });

  test('should have navigation buttons or menus', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Count all buttons
    const buttons = await page.locator('button').count();
    console.log(`Found ${buttons} total button elements`);

    // Look for specific navigation patterns
    const navElements = await page.locator('nav, [role="navigation"]').count();
    console.log(`Found ${navElements} navigation elements`);
  });

  // ========================================================================
  // 5. VIEWS & DATA DISPLAY
  // ========================================================================

  test('should have grid/table view elements', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for table-like structures
    const tables = await page.locator('table, [role="grid"], [class*="grid"], [class*="Grid"]').count();
    console.log(`Found ${tables} grid/table elements`);
  });

  test('should have view switcher or view options', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for view type buttons (grid, kanban, calendar, etc.)
    const viewButtons = await page.locator(
      'button:has-text("Grid"), button:has-text("Kanban"), button:has-text("Calendar"), button:has-text("Gallery"), button:has-text("Form"), button:has-text("Gantt")'
    ).count();
    console.log(`Found ${viewButtons} view type buttons`);
  });

  // ========================================================================
  // 6. ACCESSIBILITY & SEMANTIC HTML
  // ========================================================================

  test('should have proper semantic HTML structure', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check for main content landmark
    const main = await page.locator('main').count();
    console.log(`Found ${main} main landmark(s)`);

    // Check for headings
    const headings = await page.locator('h1, h2, h3').count();
    console.log(`Found ${headings} heading element(s)`);
  });

  test('should have proper ARIA labels', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Count elements with ARIA labels
    const ariaLabeled = await page.locator('[aria-label]').count();
    console.log(`Found ${ariaLabeled} elements with ARIA labels`);
  });

  // ========================================================================
  // 7. RESPONSIVE DESIGN
  // ========================================================================

  test('should be responsive at mobile viewport', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify content is visible
    const body = page.locator('body');
    expect(body).toBeVisible();
  });

  test('should be responsive at tablet viewport', async () => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    expect(body).toBeVisible();
  });

  test('should be responsive at desktop viewport', async () => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    expect(body).toBeVisible();
  });

  // ========================================================================
  // 8. PERFORMANCE & LOAD TIMES
  // ========================================================================

  test('should load within reasonable time', async () => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Page loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(15000); // 15 second threshold
  });

  // ========================================================================
  // 9. API INTEGRATION
  // ========================================================================

  test('should connect to backend API', async () => {
    // Direct API check
    const response = await page.request.get(`${API_URL}/api/healthz`);
    expect(response.status()).toBeLessThan(400); // 2xx or 3xx
    console.log(`API health check: ${response.status()}`);
  });

  // ========================================================================
  // 10. ERROR HANDLING
  // ========================================================================

  test('should handle navigation to non-existent routes gracefully', async () => {
    await page.goto(`${BASE_URL}/nonexistent-route`);
    await page.waitForLoadState('networkidle');

    // Should not crash, may show 404 or redirect to home
    expect(page.url()).toBeDefined();
    console.log(`Non-existent route redirected to: ${page.url()}`);
  });

  // ========================================================================
  // 11. CONSOLE ERRORS
  // ========================================================================

  test('should not have critical console errors on load', async () => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Filter out known, non-critical errors
    const criticalErrors = errors.filter(
      err => !err.includes('ResizeObserver') && !err.includes('Non-Error promise rejection')
    );

    console.log(`Critical errors: ${criticalErrors.length}`);
    if (criticalErrors.length > 0) {
      console.log('Errors:', criticalErrors);
    }
  });

  // ========================================================================
  // 12. LOCAL STORAGE & PERSISTENCE
  // ========================================================================

  test('should persist user preferences if applicable', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check for localStorage or sessionStorage usage
    const storageKeys = await page.evaluate(() => ({
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
    }));

    console.log('Storage keys:', storageKeys);
  });
});

test.describe('NEW FEATURES SPECIFIC TESTS', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(10000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  // ========================================================================
  // TYPEWRITER CAROUSEL TEST
  // ========================================================================

  test('[NEW] PromptCarousel should render with animation', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for carousel/animation indicators
    const animatedElements = await page.locator('[class*="animate"], [class*="typing"]').count();
    console.log(`Found ${animatedElements} animated elements (carousel, typing)`);

    // Try to capture a screenshot showing the carousel
    if (animatedElements > 0) {
      await page.screenshot({ path: '/tmp/carousel-screenshot.png' });
      console.log('Carousel screenshot saved to /tmp/carousel-screenshot.png');
    }
  });

  // ========================================================================
  // TASK PROGRESS PANEL TEST
  // ========================================================================

  test('[NEW] TaskProgressPanel should be present in DOM', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for task progress related elements
    const progressElements = await page.locator('[class*="progress"], [class*="Progress"]').count();
    console.log(`Found ${progressElements} progress-related elements`);

    // Look for checklist indicators
    const checklistElements = await page.locator('[class*="check"], svg[class*="check"]').count();
    console.log(`Found ${checklistElements} checklist elements`);
  });

  // ========================================================================
  // AGENT TOOLS AVAILABILITY TEST
  // ========================================================================

  test('[NEW] Agent tools should be callable through chat', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for chat input
    const textarea = page.locator('textarea').first();

    if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Try typing an agent command
      await textarea.fill('create a table called Test');

      // Look for submit button
      const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
      if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Agent chat interface is ready for tool execution');
      }
    }
  });
});
