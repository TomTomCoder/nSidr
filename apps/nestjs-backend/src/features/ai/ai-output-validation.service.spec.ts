import { FieldType } from '@teable/core';
import { describe, expect, it } from 'vitest';
import { AiOutputValidationService } from './ai-output-validation.service';

// IFieldInstance-shaped fixtures (minimal): only .type + .options are read by
// getAiOutputSchema. Binding fixtures to literal types directly (NOT `as any`)
// so future shape changes to getAiOutputSchema break these tests at compile time
// — see Phase 17.1 mock-shape-drift lesson.
const textField = { type: FieldType.SingleLineText } as const;
const singleSelectField = {
  type: FieldType.SingleSelect,
  options: { choices: [{ name: 'red' }, { name: 'green' }, { name: 'blue' }] },
} as const;
const ratingField = {
  type: FieldType.Rating,
  options: { max: 5 },
} as const;
const dateField = { type: FieldType.Date } as const;
const attachmentField = { type: FieldType.Attachment } as const;
const multiSelectField = {
  type: FieldType.MultipleSelect,
  options: { choices: [{ name: 'a' }, { name: 'b' }] },
} as const;

describe('AiOutputValidationService', () => {
  const svc = new AiOutputValidationService();

  describe('validateAndRepair', () => {
    it('text: valid passes', () => {
      const r = svc.validateAndRepair(textField, 'hello world');
      expect(r.ok).toBe(true);
    });

    it('single-select: valid choice passes', () => {
      const r = svc.validateAndRepair(singleSelectField, 'red');
      expect(r.ok).toBe(true);
    });

    it('single-select: invalid choice surfaces a Zod enum error', () => {
      const r = svc.validateAndRepair(singleSelectField, 'purple');
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.toLowerCase()).toMatch(/enum|invalid/);
      }
    });

    it('rating: 3 in 1..5 passes (coerced from string)', () => {
      const r = svc.validateAndRepair(ratingField, '3');
      expect(r.ok).toBe(true);
    });

    it('rating: 6 in 1..5 fails', () => {
      const r = svc.validateAndRepair(ratingField, '6');
      expect(r.ok).toBe(false);
    });

    it('date: ISO-8601 string passes', () => {
      const r = svc.validateAndRepair(dateField, '2026-06-06T00:00:00Z');
      expect(r.ok).toBe(true);
    });

    it('date: epoch-ms string is coerced to number and passes', () => {
      const r = svc.validateAndRepair(dateField, '1700000000000');
      expect(r.ok).toBe(true);
    });

    it('attachment: empty array (as JSON string) passes', () => {
      const r = svc.validateAndRepair(attachmentField, '[]');
      expect(r.ok).toBe(true);
    });

    it('multi-select: code-fenced JSON array is stripped + parsed + validated', () => {
      const r = svc.validateAndRepair(multiSelectField, '```json\n["a","b"]\n```');
      expect(r.ok).toBe(true);
    });

    it('multi-select: array with invalid member fails', () => {
      const r = svc.validateAndRepair(multiSelectField, '["a","zzz"]');
      expect(r.ok).toBe(false);
    });
  });

  describe('buildRetryPrompt', () => {
    it('includes the prior validation error and the example hint', () => {
      const out = svc.buildRetryPrompt(
        'Classify the document into one of the colors.',
        singleSelectField,
        'Invalid enum value'
      );
      expect(out).toContain('Previous output failed validation');
      expect(out).toContain('Invalid enum value');
      // example for single-select is the first choice ("red")
      expect(out).toContain('"red"');
      // original prompt preserved
      expect(out).toContain('Classify the document into one of the colors.');
    });

    it('rating example is a number within [1..max]', () => {
      const out = svc.buildRetryPrompt('p', ratingField, 'too big');
      expect(out).toMatch(/Example valid output: [1-5]\./);
    });

    it('date example is a valid ISO-8601 string', () => {
      const out = svc.buildRetryPrompt('p', dateField, 'bad date');
      expect(out).toContain('2026-01-01T00:00:00Z');
    });
  });

  describe('exampleFor', () => {
    it('attachment example is an empty array literal', () => {
      expect(svc.exampleFor(attachmentField)).toBe('[]');
    });

    it('multi-select with choices uses the first choice', () => {
      expect(svc.exampleFor(multiSelectField)).toBe('["a"]');
    });

    it('defaults to a plain text string when type unknown / text', () => {
      expect(svc.exampleFor(textField)).toContain('plain text');
    });
  });
});
