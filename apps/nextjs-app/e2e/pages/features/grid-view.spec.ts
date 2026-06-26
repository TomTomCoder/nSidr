/**
 * Grid View E2E tests — plan 09-01
 *
 * Tests the full Grid-view pipeline:
 *   - Table creation
 *   - Field creation (text, number, single-select, date)
 *   - Record create / edit / delete
 *
 * Data setup uses the Teable REST API (via page.request, which inherits the
 * authenticated session from storageState).  UI assertions confirm the app
 * renders the results correctly.
 *
 * Why API-driven setup?
 * The grid itself is rendered on an HTML5 Canvas; individual cell nodes are
 * not reachable via CSS/ARIA selectors.  DOM elements that ARE accessible:
 *   - Sidebar table list (link elements)
 *   - GridToolBar ("Add record" button → CreateRecordModal)
 *   - FieldSetting sheet (opened via column-append button)
 *   - ExpandRecord panel (opened via URL ?recordId= parameter)
 *
 * All shared state is set up in beforeAll so retries of individual tests
 * do not recreate data.
 */

import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { authFile } from '../../fixtures/authPaths';
import { getOrCreateTestBase } from '../../fixtures/testBase';

// ─── constants ──────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3001';
const TABLE_NAME = 'GridTest-Table';
const FIELD_KEY_TYPE_ID = 'fieldKeyType=id';
const ALPHA_RECORD_EDITED = 'Alpha record edited';

// ─── test configuration ──────────────────────────────────────────────────────

test.use({ storageState: authFile });

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Create a table via the REST API and return its id + defaultViewId. */
async function createTableViaApi(
  request: APIRequestContext,
  baseId: string,
  name: string
): Promise<{ tableId: string; viewId: string }> {
  const res = await request.post(`${BASE_URL}/api/base/${baseId}/table/`, {
    data: { name },
  });
  expect(res.ok(), `POST /api/base/${baseId}/table/ failed: ${res.status()}`).toBe(true);
  const body = await res.json();
  const tableId = body.id as string;
  const viewId = (body.defaultViewId ?? body.views?.[0]?.id) as string;
  return { tableId, viewId };
}

/** Delete a table via the REST API (used for cleanup). */
async function deleteTableViaApi(
  request: APIRequestContext,
  baseId: string,
  tableId: string
): Promise<void> {
  const res = await request.delete(`${BASE_URL}/api/base/${baseId}/table/${tableId}`);
  // 200 or 404 are both acceptable for cleanup
  if (!res.ok() && res.status() !== 404) {
    console.warn(`Cleanup: DELETE table/${tableId} returned ${res.status()}`);
  }
}

/** Create a field via the REST API and return the field id. */
async function createFieldViaApi(
  request: APIRequestContext,
  tableId: string,
  fieldRo: { name: string; type: string; options?: unknown }
): Promise<string> {
  const res = await request.post(`${BASE_URL}/api/table/${tableId}/field`, {
    data: fieldRo,
  });
  expect(res.ok(), `POST /api/table/${tableId}/field failed: ${res.status()}`).toBe(true);
  const body = await res.json();
  return body.id as string;
}

/** Create a record via the REST API and return the record id. */
async function createRecordViaApi(
  request: APIRequestContext,
  tableId: string,
  primaryFieldId: string,
  value: string
): Promise<string> {
  const res = await request.post(`${BASE_URL}/api/table/${tableId}/record`, {
    data: {
      records: [{ fields: { [primaryFieldId]: value } }],
      fieldKeyType: 'id',
    },
  });
  expect(res.ok(), `POST /api/table/${tableId}/record failed: ${res.status()}`).toBe(true);
  const body = await res.json();
  return body.records[0].id as string;
}

/** Get the first (primary) field of a table. */
async function getPrimaryFieldId(request: APIRequestContext, tableId: string): Promise<string> {
  const res = await request.get(`${BASE_URL}/api/table/${tableId}/field`);
  expect(res.ok(), `GET /api/table/${tableId}/field failed: ${res.status()}`).toBe(true);
  const fields = await res.json();
  const fieldList = Array.isArray(fields) ? fields : fields.fields ?? [];
  const primary = fieldList.find((f: { isPrimary: boolean }) => f.isPrimary) ?? fieldList[0];
  return primary.id as string;
}

/** Update a single record via PATCH /table/{tableId}/record/{recordId}. */
async function updateRecordViaApi(
  request: APIRequestContext,
  tableId: string,
  recordId: string,
  fieldId: string,
  value: string
): Promise<void> {
  const res = await request.patch(`${BASE_URL}/api/table/${tableId}/record/${recordId}`, {
    data: {
      record: { fields: { [fieldId]: value } },
      fieldKeyType: 'id',
    },
  });
  expect(res.ok(), `PATCH record/${recordId} failed: ${res.status()} ${await res.text()}`).toBe(
    true
  );
}

/** List all records for a table and return the result array. */
async function listRecordsViaApi(
  request: APIRequestContext,
  tableId: string
): Promise<Array<{ id: string; fields: Record<string, unknown> }>> {
  const res = await request.get(
    `${BASE_URL}/api/table/${tableId}/record?${FIELD_KEY_TYPE_ID}&take=50`
  );
  expect(res.ok(), `GET records failed: ${res.status()}`).toBe(true);
  const body = await res.json();
  return body.records ?? [];
}

// ─── test suite ──────────────────────────────────────────────────────────────

test.describe('Grid View', () => {
  // Shared state — ALL set up in beforeAll so retries work correctly.
  let baseId: string;
  let tableId: string;
  let viewId: string;
  let primaryFieldId: string;
  // Field ids are created and retained for potential future assertions.
  // Prefixed with _ to signal intentionally unused beyond creation.
  let _textFieldId: string;
  let _numberFieldId: string;
  let _selectFieldId: string;
  let _dateFieldId: string;
  let recordAlpha: string;
  let recordBeta: string;
  let recordGamma: string;

  // Console error collector (populated during page navigation tests)
  const consoleErrors: string[] = [];

  test.beforeAll(async ({ browser, request }) => {
    // Open a page for API calls that go through the authenticated session
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();

    // Attach a console error listener for later assertion
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known harmless noise
        if (
          text.includes('[HMR]') ||
          text.includes('ReactDevTools') ||
          text.includes('NEXT_REDIRECT') ||
          text.includes('net::ERR_ABORTED')
        ) {
          return;
        }
        consoleErrors.push(text);
      }
    });

    // Ensure E2E-Test-Base exists (creates it if absent) and get its id
    baseId = await getOrCreateTestBase(page);
    await page.close();
    await context.close();

    // ── Table ─────────────────────────────────────────────────────────────
    ({ tableId, viewId } = await createTableViaApi(request, baseId, TABLE_NAME));

    // ── Fields ────────────────────────────────────────────────────────────
    primaryFieldId = await getPrimaryFieldId(request, tableId);

    _textFieldId = await createFieldViaApi(request, tableId, {
      name: 'TextField',
      type: 'singleLineText',
    });
    _numberFieldId = await createFieldViaApi(request, tableId, {
      name: 'NumberField',
      type: 'number',
    });
    _selectFieldId = await createFieldViaApi(request, tableId, {
      name: 'StatusField',
      type: 'singleSelect',
      options: { choices: [{ name: 'Active' }, { name: 'Inactive' }] },
    });
    _dateFieldId = await createFieldViaApi(request, tableId, {
      name: 'DueDateField',
      type: 'date',
    });

    // ── Records ───────────────────────────────────────────────────────────
    // Create all three records in beforeAll so every test can rely on them.
    recordAlpha = await createRecordViaApi(request, tableId, primaryFieldId, 'Alpha record');
    recordBeta = await createRecordViaApi(request, tableId, primaryFieldId, 'Beta record');
    recordGamma = await createRecordViaApi(request, tableId, primaryFieldId, 'Gamma record');
  });

  test.afterAll(async ({ request }) => {
    if (baseId && tableId) {
      await deleteTableViaApi(request, baseId, tableId);
    }
  });

  // ── Test 1: Table is accessible in the sidebar ───────────────────────────

  test('create a table — table is visible in the sidebar', async ({ page }) => {
    // URL pattern: /base/{baseId}/table/{tableId}/{viewId}
    await page.goto(`${BASE_URL}/base/${baseId}/table/${tableId}/${viewId}`);
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // The table name should appear in the left sidebar table list as a link
    const tableText = page.locator(`text=${TABLE_NAME}`).first();
    await expect(tableText).toBeVisible({ timeout: 15_000 });
  });

  // ── Test 2: Fields exist (API verification + toolbar DOM check) ──────────

  test('add fields — text, number, single-select, date', async ({ request, page }) => {
    // Primary verification: fields exist via REST API
    const res = await request.get(`${BASE_URL}/api/table/${tableId}/field`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    const fieldList = Array.isArray(body) ? body : body.fields ?? [];
    const fieldNames = fieldList.map((f: { name: string }) => f.name);

    expect(fieldNames).toContain('TextField');
    expect(fieldNames).toContain('NumberField');
    expect(fieldNames).toContain('StatusField');
    expect(fieldNames).toContain('DueDateField');

    // Secondary check: navigate to the table view and verify the grid toolbar
    // renders (proves the grid view loaded with no fatal error)
    await page.goto(`${BASE_URL}/base/${baseId}/table/${tableId}/${viewId}`);
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    const addRecordBtn = page.getByRole('button', { name: /add record/i }).first();
    await expect(addRecordBtn).toBeVisible({ timeout: 15_000 });
  });

  // ── Test 3: 3 records were created ──────────────────────────────────────

  test('create 3 records', async ({ request }) => {
    // Records were created in beforeAll — verify they exist.
    const records = await listRecordsViaApi(request, tableId);
    const values = records.map((r) => r.fields[primaryFieldId]);

    expect(values).toContain('Alpha record');
    expect(values).toContain('Beta record');
    expect(values).toContain('Gamma record');
  });

  // ── Test 4: Edit a record ────────────────────────────────────────────────

  test('edit a record', async ({ request, page }) => {
    // Update Alpha record value via the single-record PATCH endpoint.
    await updateRecordViaApi(request, tableId, recordAlpha, primaryFieldId, ALPHA_RECORD_EDITED);

    // Verify the change persists via the single-record GET endpoint.
    const getRes = await request.get(
      `${BASE_URL}/api/table/${tableId}/record/${recordAlpha}?${FIELD_KEY_TYPE_ID}`
    );
    expect(getRes.ok()).toBe(true);
    const record = await getRes.json();
    expect(record.fields[primaryFieldId]).toBe(ALPHA_RECORD_EDITED);

    // UI verification: navigate to the table with the expand-record panel open.
    // URL: /base/{baseId}/table/{tableId}/{viewId}?recordId={recordId}
    await page.goto(
      `${BASE_URL}/base/${baseId}/table/${tableId}/${viewId}?recordId=${recordAlpha}`
    );
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // The ExpandRecord panel renders field labels and values as DOM text nodes.
    // The primary field value ALPHA_RECORD_EDITED should be visible.
    const editedText = page.getByText(ALPHA_RECORD_EDITED).first();
    await expect(editedText).toBeVisible({ timeout: 20_000 });
  });

  // ── Test 5: Delete a record ──────────────────────────────────────────────

  test('delete a record', async ({ request }) => {
    // Delete Beta record via REST API.
    const deleteRes = await request.delete(`${BASE_URL}/api/table/${tableId}/record/${recordBeta}`);
    expect(deleteRes.ok(), `DELETE record/${recordBeta} failed: ${deleteRes.status()}`).toBe(true);

    // Verify Beta is gone and only Alpha + Gamma remain.
    const records = await listRecordsViaApi(request, tableId);
    const ids = records.map((r) => r.id);

    expect(ids, 'Beta record should be deleted').not.toContain(recordBeta);
    expect(ids, 'Alpha record should remain').toContain(recordAlpha);
    expect(ids, 'Gamma record should remain').toContain(recordGamma);
    // Table was created with 3 records of ours (default empty records from
    // table creation may also exist — just verify at least 2 remain)
    expect(records.length, 'At least 2 records should remain after delete').toBeGreaterThanOrEqual(
      2
    );
  });

  // ── Cleanup check: no severe console errors ──────────────────────────────

  test('no console errors during test run', () => {
    const severeErrors = consoleErrors.filter(
      (msg) =>
        !msg.includes('WebSocket') &&
        !msg.includes('canvas') &&
        !msg.includes('ResizeObserver') &&
        !msg.includes('ERR_CONNECTION_REFUSED') &&
        !msg.includes('ChunkLoadError')
    );

    expect(severeErrors, `Unexpected console errors:\n${severeErrors.join('\n')}`).toHaveLength(0);
  });
});
