import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuardrailService } from './agent-guardrail.service';

// Minimal mock of IFieldInstance matching what GuardrailService needs
function makeFieldMock(
  id: string,
  name: string,
  validateResult: { success: boolean; error?: { errors: { message: string }[] } } | undefined
) {
  return {
    id,
    name,
    validateCellValueWithNotNull: vi.fn().mockReturnValue(validateResult),
  };
}

function makeFieldServiceMock(fields: ReturnType<typeof makeFieldMock>[]) {
  return {
    getFieldInstances: vi.fn().mockResolvedValue(fields),
  };
}

describe('GuardrailService', () => {
  let svc: GuardrailService;
  const tableId = 'tbl_test';

  describe('Test 1: valid number value passes', () => {
    beforeEach(() => {
      const field = makeFieldMock('fldA', 'Score', { success: true });
      svc = new GuardrailService(makeFieldServiceMock([field]) as never);
    });

    it('returns { valid: true, errors: [] } when value is a valid number', async () => {
      const result = await svc.validateWrite(tableId, { fldA: 42 });
      expect(result).toEqual({ valid: true, errors: [] });
    });
  });

  describe('Test 2: invalid type returns structured error', () => {
    beforeEach(() => {
      const field = makeFieldMock('fldA', 'Score', {
        success: false,
        error: { errors: [{ message: 'Expected number, received string' }] },
      });
      svc = new GuardrailService(makeFieldServiceMock([field]) as never);
    });

    it('returns { valid: false, errors: [...] } with field name and zod message', async () => {
      const result = await svc.validateWrite(tableId, { fldA: 'not-a-number' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Score');
      expect(result.errors[0]).toContain('Expected number, received string');
    });
  });

  describe('Test 3: null value on notNull field returns error', () => {
    beforeEach(() => {
      const field = makeFieldMock('fldA', 'Required Field', {
        success: false,
        error: { errors: [{ message: 'Value cannot be null' }] },
      });
      svc = new GuardrailService(makeFieldServiceMock([field]) as never);
    });

    it('returns { valid: false, errors: [...] } when value is null on notNull field', async () => {
      const result = await svc.validateWrite(tableId, { fldA: null });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Required Field');
    });
  });

  describe('Test 4: unknown fieldId is silently ignored', () => {
    beforeEach(() => {
      // No fields returned — simulate unknown fieldId
      svc = new GuardrailService(makeFieldServiceMock([]) as never);
    });

    it('returns { valid: true, errors: [] } for unknown fieldId', async () => {
      const result = await svc.validateWrite(tableId, { fldUnknown: 'any value' });
      expect(result).toEqual({ valid: true, errors: [] });
    });
  });

  describe('Test 5: empty payload passes', () => {
    beforeEach(() => {
      svc = new GuardrailService(makeFieldServiceMock([]) as never);
    });

    it('returns { valid: true, errors: [] } for empty fields', async () => {
      const result = await svc.validateWrite(tableId, {});
      expect(result).toEqual({ valid: true, errors: [] });
    });
  });
});
