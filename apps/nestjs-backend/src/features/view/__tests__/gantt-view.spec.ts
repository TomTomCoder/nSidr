import { BadRequestException } from '@nestjs/common';
import { FieldType } from '@teable/core';
import type { IGanttViewOptions } from '@teable/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateGanttViewOptions } from '../model/view-option-validate';

// Mock PrismaService with a txClient that returns findMany
function makePrisma(fields: { id: string; type: string }[]) {
  return {
    txClient: () => ({
      field: {
        findMany: vi.fn().mockResolvedValue(fields),
      },
    }),
  } as unknown as import('@teable/db-main-prisma').PrismaService;
}

const TABLE_ID = 'tbl_test';

const validOptions: IGanttViewOptions = {
  startField: 'fld_start',
  endField: 'fld_end',
  milestoneThreshold: 0,
  showCriticalPath: false,
  showWeekends: true,
  timeScale: 'week',
};

describe('validateGanttViewOptions', () => {
  describe('Test 1: valid date fields — no exception thrown', () => {
    it('should resolve without throwing when startField and endField are date fields', async () => {
      const prisma = makePrisma([
        { id: 'fld_start', type: FieldType.Date },
        { id: 'fld_end', type: FieldType.Date },
      ]);

      await expect(
        validateGanttViewOptions(TABLE_ID, validOptions, prisma)
      ).resolves.toBeUndefined();
    });

    it('should accept default options (milestoneThreshold=0, timeScale=week)', async () => {
      const prisma = makePrisma([
        { id: 'fld_start', type: FieldType.Date },
        { id: 'fld_end', type: FieldType.Date },
      ]);

      const optionsWithDefaults: IGanttViewOptions = {
        ...validOptions,
        milestoneThreshold: 0,
        showCriticalPath: false,
        showWeekends: true,
        timeScale: 'week',
      };

      await expect(
        validateGanttViewOptions(TABLE_ID, optionsWithDefaults, prisma)
      ).resolves.toBeUndefined();
    });
  });

  describe('Test 2: non-date startField — throws BadRequestException', () => {
    it('should throw BadRequestException when startField is singleLineText', async () => {
      const prisma = makePrisma([
        { id: 'fld_start', type: FieldType.SingleLineText },
        { id: 'fld_end', type: FieldType.Date },
      ]);

      await expect(
        validateGanttViewOptions(TABLE_ID, validOptions, prisma)
      ).rejects.toThrow(BadRequestException);

      await expect(
        validateGanttViewOptions(TABLE_ID, validOptions, prisma)
      ).rejects.toThrow('startField');
    });
  });

  describe('Test 3: missing endField — throws BadRequestException', () => {
    it('should throw BadRequestException when endField does not exist in the table', async () => {
      const prisma = makePrisma([
        { id: 'fld_start', type: FieldType.Date },
        // fld_end is NOT in the list
      ]);

      await expect(
        validateGanttViewOptions(TABLE_ID, validOptions, prisma)
      ).rejects.toThrow(BadRequestException);

      await expect(
        validateGanttViewOptions(TABLE_ID, validOptions, prisma)
      ).rejects.toThrow('endField');
    });
  });

  describe('Test 4: default options stored as-is', () => {
    it('should not strip or mutate options — defaults are preserved', async () => {
      const prisma = makePrisma([
        { id: 'fld_start', type: FieldType.Date },
        { id: 'fld_end', type: FieldType.Date },
      ]);

      const opts: IGanttViewOptions = {
        startField: 'fld_start',
        endField: 'fld_end',
        milestoneThreshold: 0,
        showCriticalPath: false,
        showWeekends: true,
        timeScale: 'week',
      };

      // validateGanttViewOptions must not throw and must not mutate opts
      const optsBefore = { ...opts };
      await validateGanttViewOptions(TABLE_ID, opts, prisma);
      expect(opts).toEqual(optsBefore);
    });
  });
});
