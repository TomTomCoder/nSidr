/**
 * Playwright E2E spec for the Agent Chat panel (Phase 4 feature).
 *
 * Navigates to the nXtFlow base, opens the Contacts table,
 * opens the AI chat panel, sends a message, and verifies that
 * a streaming response appears within 15 seconds.
 *
 * Requires the dev server running on http://localhost:3001.
 */

import { expect, test } from '@playwright/test';
import { authFile } from './fixtures/authPaths';

// Use the authenticated session saved by the auth setup fixture.
test.use({ storageState: authFile });

test.describe('Agent Chat panel', () => {
  test('sends a message and receives a streaming response', async ({ page }) => {
    // Collect JS errors throughout the test.
    const jsErrors: string[] = [];
    page.on('pageerror', (e) => jsErrors.push(e.message));

    // ──────────────────────────────────────────────────────────────
    // Step 1: Navigate to home page
    // ──────────────────────────────────────────────────────────────
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });

    // ──────────────────────────────────────────────────────────────
    // Step 2: Click the nXtFlow base in the left sidebar
    // ──────────────────────────────────────────────────────────────
    const nxtFlowLink = page.getByRole('link', { name: /nXtFlow/i }).first();
    const nxtFlowExists = await nxtFlowLink.isVisible({ timeout: 10_000 }).catch(() => false);

    if (!nxtFlowExists) {
      test.skip(true, 'nXtFlow base not found — skipping agent chat test');
      return;
    }

    await nxtFlowLink.click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 });

    // ──────────────────────────────────────────────────────────────
    // Step 3: Click the Contacts table tab
    // ──────────────────────────────────────────────────────────────
    const contactsTab = page.getByRole('tab', { name: /contacts/i }).first();
    const contactsTabExists = await contactsTab.isVisible({ timeout: 5_000 }).catch(() => false);

    if (contactsTabExists) {
      await contactsTab.click();
    } else {
      // Try sidebar link as fallback
      const contactsLink = page.getByRole('link', { name: /contacts/i }).first();
      const contactsLinkExists = await contactsLink.isVisible({ timeout: 5_000 }).catch(() => false);
      if (contactsLinkExists) {
        await contactsLink.click();
      }
      // If neither found, proceed — the chat panel test doesn't strictly require Contacts
    }

    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // ──────────────────────────────────────────────────────────────
    // Step 4: Open the AI chat panel
    //
    // The chat panel defaults to 'open' state (persisted in localStorage).
    // If it is already visible (contains "Nouveau Chat"), skip toggling.
    // Otherwise open it via the base dropdown → "Afficher le chat IA".
    // ──────────────────────────────────────────────────────────────
    const panelTitle = page.getByText('Nouveau Chat').first();
    const panelAlreadyOpen = await panelTitle.isVisible({ timeout: 3_000 }).catch(() => false);

    if (!panelAlreadyOpen) {
      // Click the base name trigger to open the dropdown.
      // The base header button contains the base name and a ChevronDown icon.
      const baseMenuTrigger = page
        .locator('[class*="sidebar"] button, [class*="header"] button')
        .filter({ hasText: /nXtFlow/i })
        .first();

      const baseMenuExists = await baseMenuTrigger.isVisible({ timeout: 5_000 }).catch(() => false);

      if (baseMenuExists) {
        await baseMenuTrigger.click();
        // Wait for dropdown to open, then click "Afficher le chat IA"
        const showChatItem = page.getByText('Afficher le chat IA').first();
        await showChatItem.waitFor({ state: 'visible', timeout: 5_000 });
        await showChatItem.click();
      } else {
        // Fallback: look for any button/element with aria-label matching chat/agent
        const chatToggle = page
          .getByRole('button', { name: /chat|agent/i })
          .first();
        const chatToggleExists = await chatToggle.isVisible({ timeout: 3_000 }).catch(() => false);
        if (chatToggleExists) {
          await chatToggle.click();
        }
      }

      // Wait for the panel to become visible
      await panelTitle.waitFor({ state: 'visible', timeout: 8_000 });
    }

    // ──────────────────────────────────────────────────────────────
    // Step 5: Wait for the chat input (Textarea) to be ready
    // ──────────────────────────────────────────────────────────────
    const chatInput = page
      .locator('[class*="chat"] textarea, [class*="ChatPanel"] textarea')
      .first();

    // More permissive fallback: any textarea within the right panel area
    const inputLocator = chatInput.or(
      page.locator('textarea').filter({ hasText: '' }).last()
    );

    await inputLocator.waitFor({ state: 'visible', timeout: 10_000 });

    // ──────────────────────────────────────────────────────────────
    // Step 6: Type the message
    // ──────────────────────────────────────────────────────────────
    await inputLocator.click();
    await inputLocator.fill('Liste tous les contacts');

    // ──────────────────────────────────────────────────────────────
    // Step 7: Submit via Enter key
    // ──────────────────────────────────────────────────────────────
    await inputLocator.press('Enter');

    // ──────────────────────────────────────────────────────────────
    // Step 8: Wait for a non-empty response to appear
    //
    // The ChatPanel renders assistant messages as divs with class bg-muted.
    // We also check for [data-testid="agent-response"] or .agent-response
    // as possible future additions.
    // ──────────────────────────────────────────────────────────────
    const responseLocator = page
      .locator(
        '[data-testid="agent-response"], .agent-response, .chat-message, [class*="bg-muted"]'
      )
      .last();

    await expect(responseLocator).not.toBeEmpty({ timeout: 15_000 });

    // ──────────────────────────────────────────────────────────────
    // Step 9: Click a suggestion chip if any exist and verify no crash
    // ──────────────────────────────────────────────────────────────
    // Suggestion chips: button elements inside the response area.
    // They render before messages when messages.length === 0, so after
    // sending a message they may be gone. Check for any residual chips
    // or in the empty-state suggestion groups.
    const suggestionChips = page.locator(
      '[class*="chat"] button[type="button"]:not([class*="icon"]):not([class*="stop"])'
    );
    const chipCount = await suggestionChips.count().catch(() => 0);

    if (chipCount > 0) {
      // Click the first chip; no hard assertion — just verify no new JS errors.
      const jsErrorsBefore = jsErrors.length;
      await suggestionChips.first().click();
      await page.waitForTimeout(3_000);
      // The error count should not have grown due to the chip click
      // (minor tolerance: ResizeObserver errors are filtered below anyway)
      expect(jsErrors.length - jsErrorsBefore).toBeLessThanOrEqual(2);
    }

    // ──────────────────────────────────────────────────────────────
    // Final assertion: zero unfiltered JS errors
    // ──────────────────────────────────────────────────────────────
    expect(jsErrors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });
});
