/**
 * Spec for AiCellRegenerateService (Phase 16-03 — D-16-02 + D-16-03).
 *
 * The service was extracted from RecordOpenApiService at 2026-06-06 to break a
 * runtime circular value-import (record-open-api.service ↔ ai.service via
 * setting-open-api.service). The behaviour contract is unchanged from the
 * original RecordOpenApiService.regenerateAiCell spec.
 *
 * Assertions:
 *  (a) FieldType.Ai gate at the service boundary
 *  (b) gateway-validated write path
 *  (c) validation-fail surface (no cell write)
 *  (d) missing-table 404
 *  (e) URL parity: REGENERATE_AI_CELL openapi constant matches controller route
 *
 * All AiService.generateForField return values are typed against IRegenerateAiCellVo
 * (no `as any`) so future shape changes break tests at compile time — Phase 17.1
 * mock-shape-drift hedge.
 */
import { BadRequestException } from '@nestjs/common';
import { FieldType } from '@teable/core';
import type { IRegenerateAiCellVo } from '@teable/openapi';
import { REGENERATE_AI_CELL } from '@teable/openapi';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as factoryModule from '../field/model/factory';
import { AiCellRegenerateService } from './ai-cell-regenerate.service';

// Service uses createFieldInstanceByVo (getField returns a parsed VO, not a raw row).
const mockCreateFieldInstanceByVo = vi.spyOn(factoryModule, 'createFieldInstanceByVo');

const buildService = (overrides: {
  fieldVo?: Record<string, unknown>;
  fieldInstance?: { id: string; type: FieldType; aiConfig?: unknown; options?: unknown };
  tableMeta?: { baseId: string } | null;
  recordFields?: Record<string, unknown>;
  generateForFieldResult?: IRegenerateAiCellVo & { value: unknown };
  generateForFieldThrows?: Error;
  updateRecordSpy?: ReturnType<typeof vi.fn>;
}) => {
  const fieldServiceGetField = vi
    .fn()
    .mockResolvedValue(overrides.fieldVo ?? { id: 'fld1', type: FieldType.Ai });
  mockCreateFieldInstanceByVo.mockReturnValue(
    (overrides.fieldInstance ?? {
      id: 'fld1',
      type: FieldType.Ai,
      // Real FieldType.Ai fields carry config in `options`, NOT `aiConfig`.
      options: { prompt: 'Summarize {fldSrc}', sourceFieldIds: ['fldSrc'] },
    }) as never
  );

  const tableMetaFindFirst = vi
    .fn()
    .mockResolvedValue(
      overrides.tableMeta === undefined ? { baseId: 'bse1' } : overrides.tableMeta
    );
  const recordServiceGetRecord = vi.fn().mockResolvedValue({
    fields: overrides.recordFields ?? { fldSrc: 'hello world' },
  });

  const generateForField = overrides.generateForFieldThrows
    ? vi.fn().mockRejectedValue(overrides.generateForFieldThrows)
    : vi.fn<[], Promise<IRegenerateAiCellVo>>().mockResolvedValue(
        overrides.generateForFieldResult ?? {
          value: 'summary text',
          validated: true,
          attempts: 1,
        }
      );

  const updateRecord = overrides.updateRecordSpy ?? vi.fn().mockResolvedValue({});

  const service = new AiCellRegenerateService(
    {
      txClient: () => ({
        tableMeta: { findFirst: tableMetaFindFirst },
      }),
    } as never,
    { getRecord: recordServiceGetRecord } as never,
    { getField: fieldServiceGetField } as never,
    { generateForField } as never,
    { updateRecord } as never
  );

  return { service, generateForField, updateRecord };
};

describe('AiCellRegenerateService.regenerateAiCell (Phase 16-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: validated:true → updateRecord called once with the validated value', async () => {
    const fixture: IRegenerateAiCellVo = { value: 'foo', validated: true, attempts: 1 };
    const { service, generateForField, updateRecord } = buildService({
      generateForFieldResult: fixture,
    });

    const result = await service.regenerateAiCell('tbl1', 'rec1', 'fld1');

    expect(generateForField).toHaveBeenCalledTimes(1);
    expect(updateRecord).toHaveBeenCalledTimes(1);
    expect(updateRecord.mock.calls[0][0]).toBe('tbl1');
    expect(updateRecord.mock.calls[0][1]).toBe('rec1');
    expect(updateRecord.mock.calls[0][2]).toMatchObject({
      fieldKeyType: 'id',
      record: { fields: { fld1: 'foo' } },
    });
    expect(result).toEqual({ value: 'foo', validated: true, attempts: 1, error: undefined });
  });

  it('validation-fail: validated:false → updateRecord NOT called, error surfaced', async () => {
    const fixture: IRegenerateAiCellVo = {
      value: null,
      validated: false,
      attempts: 2,
      error: 'enum mismatch',
    };
    const { service, updateRecord } = buildService({ generateForFieldResult: fixture });

    const result = await service.regenerateAiCell('tbl1', 'rec1', 'fld1');

    expect(updateRecord).not.toHaveBeenCalled();
    expect(result.validated).toBe(false);
    expect(result.value).toBeNull();
    expect(result.attempts).toBe(2);
    expect(result.error).toBe('enum mismatch');
  });

  it('non-Ai field: throws BadRequestException; generateForField NOT called', async () => {
    const { service, generateForField } = buildService({
      fieldInstance: { id: 'fld1', type: FieldType.SingleLineText },
    });

    await expect(service.regenerateAiCell('tbl1', 'rec1', 'fld1')).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(generateForField).not.toHaveBeenCalled();
  });

  it('missing table: throws NOT_FOUND when tableMeta lookup fails', async () => {
    const { service } = buildService({ tableMeta: null });

    await expect(service.regenerateAiCell('tblMissing', 'rec1', 'fld1')).rejects.toThrowError(
      /Table tblMissing not found/
    );
  });

  it('URL parity: REGENERATE_AI_CELL openapi constant matches expected controller route shape', () => {
    expect(REGENERATE_AI_CELL).toBe('/table/{tableId}/record/{recordId}/{fieldId}/regenerate');
  });

  // --- P0-4: real FieldType.Ai fields configure via `options`, not `aiConfig` ---

  it('text AI field (options.prompt): {fldXXX} placeholders resolved from the row', async () => {
    const { service, generateForField } = buildService({
      fieldInstance: {
        id: 'fld1',
        type: FieldType.Ai,
        options: { prompt: 'Summarize {fldSrc}', sourceFieldIds: ['fldSrc'] },
      },
      recordFields: { fldSrc: 'hello world' },
    });

    await service.regenerateAiCell('tbl1', 'rec1', 'fld1');

    expect(generateForField).toHaveBeenCalledTimes(1);
    // args: (baseId, field, prompt)
    const prompt = generateForField.mock.calls[0][2] as string;
    expect(prompt).toContain('Summarize hello world');
    expect(prompt).not.toContain('{fldSrc}');
  });

  it('AI field with sourceFieldIds but no prompt: generic instruction with the source value', async () => {
    const { service, generateForField } = buildService({
      fieldInstance: {
        id: 'fld1',
        type: FieldType.Ai,
        options: { sourceFieldIds: ['fldSrc'] },
      },
      recordFields: { fldSrc: 'raw content' },
    });

    await service.regenerateAiCell('tbl1', 'rec1', 'fld1');

    const prompt = generateForField.mock.calls[0][2] as string;
    expect(prompt).toContain('Process the following content:');
    expect(prompt).toContain('raw content');
  });

  it('AI field prompt with unreferenced sourceFieldIds appends them as Context', async () => {
    const { service, generateForField } = buildService({
      fieldInstance: {
        id: 'fld1',
        type: FieldType.Ai,
        options: { prompt: 'Write a tagline', sourceFieldIds: ['fldA', 'fldB'] },
      },
      recordFields: { fldA: 'Acme', fldB: 'widgets' },
    });

    await service.regenerateAiCell('tbl1', 'rec1', 'fld1');

    const prompt = generateForField.mock.calls[0][2] as string;
    expect(prompt).toContain('Write a tagline');
    expect(prompt).toContain('Context:');
    expect(prompt).toContain('Acme');
    expect(prompt).toContain('widgets');
  });

  it('legacy aiConfig path (typed field + AI helper): summary prompt built from sourceFieldId', async () => {
    const { service, generateForField } = buildService({
      fieldInstance: {
        id: 'fld1',
        type: FieldType.Ai,
        aiConfig: { type: 'summary', sourceFieldId: 'fldSrc', modelKey: 'm' },
      },
      recordFields: { fldSrc: 'a long text' },
    });

    await service.regenerateAiCell('tbl1', 'rec1', 'fld1');

    const prompt = generateForField.mock.calls[0][2] as string;
    expect(prompt).toContain('Summarize the following content:');
    expect(prompt).toContain('a long text');
  });

  it('does NOT throw "has no aiConfig" for a real AI field (regression: P0-4)', async () => {
    const { service, updateRecord } = buildService({
      fieldInstance: {
        id: 'fld1',
        type: FieldType.Ai,
        options: { prompt: 'Do a thing', sourceFieldIds: [] },
      },
    });

    await expect(service.regenerateAiCell('tbl1', 'rec1', 'fld1')).resolves.toMatchObject({
      validated: true,
    });
    expect(updateRecord).toHaveBeenCalledTimes(1);
  });
});
