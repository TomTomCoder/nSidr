/**
 * Manual UI Test Script - No fixtures, no config dependencies
 * Tests all major Teable UI features against the running dev server
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3002';

let passCount = 0;
let failCount = 0;

function log(test, result, details = '') {
  const icon = result ? '✓' : '✗';
  const color = result ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  console.log(`${color}[${icon}]${reset} ${test}${details ? ' — ' + details : ''}`);
  if (result) passCount++;
  else failCount++;
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('TEABLE UI FEATURE TEST SUITE');
  console.log('='.repeat(70) + '\n');

  const browser = await chromium.launch({ headless: true });

  try {
    // ====================================================================
    // TEST SUITE 1: INFRASTRUCTURE
    // ====================================================================
    console.log('\n[1/7] INFRASTRUCTURE TESTS\n');

    // API Health
    try {
      const response = await fetch(`${API_URL}/api/healthz`);
      log('API Health Check', response.status < 400, `status ${response.status}`);
    } catch (e) {
      log('API Health Check', false, e.message);
    }

    // ====================================================================
    // TEST SUITE 2: PAGE LOAD & STRUCTURE
    // ====================================================================
    console.log('\n[2/7] PAGE LOAD & STRUCTURE\n');

    const page = await browser.newPage();
    const startTime = Date.now();
    const response = await page.goto(BASE_URL);
    const loadTime = Date.now() - startTime;

    log('Page responds', response.ok(), `${response.status()}`);
    log('Page loads in <15s', loadTime < 15000, `${loadTime}ms`);

    // ====================================================================
    // TEST SUITE 3: INTERACTIVE ELEMENTS
    // ====================================================================
    console.log('\n[3/7] INTERACTIVE ELEMENTS\n');

    await page.waitForLoadState('domcontentloaded');

    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input, textarea').count();
    const total = buttons + inputs;

    log('Has buttons', buttons > 0, `${buttons} buttons`);
    log('Has inputs', inputs > 0, `${inputs} inputs`);
    log('Has interactive elements', total > 0, `${total} total`);

    // ====================================================================
    // TEST SUITE 4: NEW FEATURES
    // ====================================================================
    console.log('\n[4/7] NEW FEATURES\n');

    // Look for PromptCarousel
    const caretCount = await page.locator('[class*="caret"]').count();
    const carouselCount = await page.locator('[class*="carousel"], [class*="Carousel"]').count();
    const animateCount = await page.locator('[class*="animate"]').count();
    const promptCarouselFound = caretCount + carouselCount + animateCount;

    log('[NEW] PromptCarousel', promptCarouselFound > 0, `${promptCarouselFound} carousel elements`);

    // Look for TaskProgressPanel
    const progressCount = await page.locator('[class*="progress"], [class*="Progress"]').count();
    const taskCount = await page.locator('[class*="task"], [class*="Task"]').count();
    const taskProgressFound = progressCount + taskCount;

    log('[NEW] TaskProgressPanel', taskProgressFound > 0, `${taskProgressFound} progress elements`);

    // ====================================================================
    // TEST SUITE 5: CONTENT & ACCESSIBILITY
    // ====================================================================
    console.log('\n[5/7] CONTENT & ACCESSIBILITY\n');

    const bodyText = await page.textContent('body');
    log('Page has text content', (bodyText?.length || 0) > 100, `${bodyText?.length || 0} chars`);

    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    const ariaElements = await page.locator('[aria-label], [role]').count();

    log('Has headings', headings > 0, `${headings} headings`);
    log('Has ARIA attributes', ariaElements > 0, `${ariaElements} aria elements`);

    // ====================================================================
    // TEST SUITE 6: RESPONSIVE DESIGN
    // ====================================================================
    console.log('\n[6/7] RESPONSIVE DESIGN\n');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    let visible = await page.locator('body').isVisible();
    log('Mobile (375x667)', visible);

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    visible = await page.locator('body').isVisible();
    log('Tablet (768x1024)', visible);

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    visible = await page.locator('body').isVisible();
    log('Desktop (1920x1080)', visible);

    // ====================================================================
    // TEST SUITE 7: CONSOLE HEALTH
    // ====================================================================
    console.log('\n[7/7] CONSOLE HEALTH\n');

    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const criticalErrors = errors.filter(
      e => !e.includes('ResizeObserver') &&
           !e.includes('Non-Error') &&
           !e.includes('Warning')
    );

    log('No critical console errors', criticalErrors.length === 0, `${criticalErrors.length} errors`);

    // ====================================================================
    // SUMMARY
    // ====================================================================
    await page.close();

    console.log('\n' + '='.repeat(70));
    console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
    console.log('='.repeat(70) + '\n');

    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test suite error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();
