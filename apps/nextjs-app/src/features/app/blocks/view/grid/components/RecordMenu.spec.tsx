/**
 * RecordMenu spec (Phase 16-04) — focused on the Regenerate menu item gating logic.
 *
 * Full RTL of <RecordMenu/> requires mocking dozens of @teable/sdk hooks, table
 * domain providers, popover portals, command list, i18n + the store; the cost
 * is high and the assertion surface is brittle. Instead we exercise the EXACT
 * pure gating function (`buildRegenerateMenuItemsForTest` — exported test seam
 * over the private helper) which contains 100% of the visibility logic that
 * the plan calls out:
 *  - visible for cellField.type === FieldType.Ai
 *  - hidden for non-Ai field
 *  - hidden when cellField undefined
 *  - hidden when canUpdate=false
 *  - click invokes mutation with correct args
 *
 * Bound to the real RecordMenuState type via a type-only import (no `as any`)
 * so future store-shape changes break this spec at compile time — Phase 17.1
 * mock-shape-drift hedge.
 */
import { FieldType } from '@teable/core';
import type { IRecordMenu } from '@teable/sdk/components/grid-enhancements/store/type';
import { describe, expect, it, vi } from 'vitest';
import { buildRegenerateMenuItemsForTest } from './RecordMenu';

// Compile-time hedge: the fixture below is typed as Pick<IRecordMenu, ...>.
// If the store shape drifts (cellField removed/renamed), TS rejects the fixture
// and this spec fails to compile — making drift impossible to ignore.
type CellContextFixture = Pick<IRecordMenu, 'cellField' | 'cellRecordId'>;

const buildArgs = (overrides: {
  cellField?: CellContextFixture['cellField'];
  cellRecordId?: CellContextFixture['cellRecordId'];
  canUpdate?: boolean;
  tableId?: string | undefined;
}) => ({
  t: ((k: string) => k) as (k: string) => string,
  // Use `in` check so a caller passing `tableId: undefined` actually wins over
  // the default 'tbl1' (?? would coalesce undefined back to the default).
  tableId: 'tableId' in overrides ? overrides.tableId : 'tbl1',
  cellField: overrides.cellField,
  cellRecordId: overrides.cellRecordId,
  canUpdate: overrides.canUpdate ?? true,
  onRegenerate: vi.fn(),
});

describe('RecordMenu.buildRegenerateMenuItems (Phase 16-04)', () => {
  it('cellField.type === FieldType.Ai → returns one menu item with label "table:menu.regenerateCell"', () => {
    const args = buildArgs({
      cellField: { id: 'fldAi', type: FieldType.Ai },
      cellRecordId: 'rec1',
    });
    const items = buildRegenerateMenuItemsForTest(args);

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('table:menu.regenerateCell');
    expect(items[0].type).toBe('RegenerateCell');
  });

  it('cellField.type === SingleLineText → returns []', () => {
    const args = buildArgs({
      cellField: { id: 'fldTxt', type: FieldType.SingleLineText },
      cellRecordId: 'rec1',
    });
    expect(buildRegenerateMenuItemsForTest(args)).toEqual([]);
  });

  it('cellField undefined (multi-select / row-only) → returns []', () => {
    const args = buildArgs({ cellField: undefined, cellRecordId: 'rec1' });
    expect(buildRegenerateMenuItemsForTest(args)).toEqual([]);
  });

  it('cellRecordId undefined → returns []', () => {
    const args = buildArgs({
      cellField: { id: 'fldAi', type: FieldType.Ai },
      cellRecordId: undefined,
    });
    expect(buildRegenerateMenuItemsForTest(args)).toEqual([]);
  });

  it('canUpdate=false → returns [] even for Ai cell', () => {
    const args = buildArgs({
      cellField: { id: 'fldAi', type: FieldType.Ai },
      cellRecordId: 'rec1',
      canUpdate: false,
    });
    expect(buildRegenerateMenuItemsForTest(args)).toEqual([]);
  });

  it('click → onRegenerate called with {tableId, recordId, fieldId}', () => {
    const args = buildArgs({
      cellField: { id: 'fldAi', type: FieldType.Ai },
      cellRecordId: 'rec1',
    });
    const items = buildRegenerateMenuItemsForTest(args);

    items[0].onClick();

    expect(args.onRegenerate).toHaveBeenCalledTimes(1);
    expect(args.onRegenerate).toHaveBeenCalledWith({
      tableId: 'tbl1',
      recordId: 'rec1',
      fieldId: 'fldAi',
    });
  });

  it('missing tableId → returns []', () => {
    const args = buildArgs({
      cellField: { id: 'fldAi', type: FieldType.Ai },
      cellRecordId: 'rec1',
      tableId: undefined,
    });
    expect(buildRegenerateMenuItemsForTest(args)).toEqual([]);
  });
});
