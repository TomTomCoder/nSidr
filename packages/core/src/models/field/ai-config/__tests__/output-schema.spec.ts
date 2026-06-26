import { describe, expect, it } from 'vitest';
import { FieldType } from '../../constant';
import {
  attachmentFieldOutputSchema,
  buildMultipleSelectFieldOutputSchema,
  buildRatingFieldOutputSchema,
  buildSingleSelectFieldOutputSchema,
  dateFieldOutputSchema,
  getAiOutputSchema,
  textFieldOutputSchema,
} from '../index';

describe('AI OUTPUT schemas (per D-16-01)', () => {
  describe('textFieldOutputSchema', () => {
    it('accepts any string', () => {
      expect(textFieldOutputSchema.safeParse('hello').success).toBe(true);
      expect(textFieldOutputSchema.safeParse('').success).toBe(true);
    });

    it('rejects non-string', () => {
      expect(textFieldOutputSchema.safeParse(42).success).toBe(false);
    });

    it('edge: long string accepted', () => {
      expect(textFieldOutputSchema.safeParse('x'.repeat(10_000)).success).toBe(true);
    });
  });

  describe('buildSingleSelectFieldOutputSchema', () => {
    const choices = [{ name: 'red' }, { name: 'green' }, { name: 'blue' }];
    const schema = buildSingleSelectFieldOutputSchema(choices);

    it('accepts a value in choices', () => {
      expect(schema.safeParse('red').success).toBe(true);
    });

    it('rejects a value not in choices', () => {
      const r = schema.safeParse('purple');
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(JSON.stringify(r.error)).toMatch(/enum|invalid/i);
      }
    });

    it('edge: empty choices degrades to z.string()', () => {
      const degraded = buildSingleSelectFieldOutputSchema([]);
      expect(degraded.safeParse('anything').success).toBe(true);
    });

    it('edge: undefined choices degrades to z.string()', () => {
      const degraded = buildSingleSelectFieldOutputSchema(undefined);
      expect(degraded.safeParse('anything').success).toBe(true);
    });
  });

  describe('buildMultipleSelectFieldOutputSchema', () => {
    const choices = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    const schema = buildMultipleSelectFieldOutputSchema(choices);

    it('accepts an array of valid choice names', () => {
      expect(schema.safeParse(['a', 'b']).success).toBe(true);
    });

    it('rejects array containing invalid choice', () => {
      expect(schema.safeParse(['a', 'zzz']).success).toBe(false);
    });

    it('edge: empty array is valid', () => {
      expect(schema.safeParse([]).success).toBe(true);
    });
  });

  describe('buildRatingFieldOutputSchema', () => {
    it('accepts int in range with default max=5', () => {
      const schema = buildRatingFieldOutputSchema();
      expect(schema.safeParse(3).success).toBe(true);
      expect(schema.safeParse(1).success).toBe(true);
      expect(schema.safeParse(5).success).toBe(true);
    });

    it('rejects out-of-range and non-integer values', () => {
      const schema = buildRatingFieldOutputSchema(5);
      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(6).success).toBe(false);
      expect(schema.safeParse(2.5).success).toBe(false);
    });

    it('edge: max=10 accepts 10 and rejects 11', () => {
      const schema = buildRatingFieldOutputSchema(10);
      expect(schema.safeParse(10).success).toBe(true);
      expect(schema.safeParse(11).success).toBe(false);
    });
  });

  describe('dateFieldOutputSchema', () => {
    it('accepts ISO-8601 string with offset', () => {
      expect(dateFieldOutputSchema.safeParse('2026-01-01T00:00:00Z').success).toBe(true);
      expect(dateFieldOutputSchema.safeParse('2026-06-06T12:30:00+02:00').success).toBe(true);
    });

    it('rejects bare date strings', () => {
      expect(dateFieldOutputSchema.safeParse('2026-01-01').success).toBe(false);
      expect(dateFieldOutputSchema.safeParse('not-a-date').success).toBe(false);
    });

    it('edge: epoch-ms integer is accepted', () => {
      expect(dateFieldOutputSchema.safeParse(1_700_000_000_000).success).toBe(true);
    });

    it('rejects negative epoch', () => {
      expect(dateFieldOutputSchema.safeParse(-1).success).toBe(false);
    });
  });

  describe('attachmentFieldOutputSchema', () => {
    it('accepts empty array', () => {
      expect(attachmentFieldOutputSchema.safeParse([]).success).toBe(true);
    });

    it('rejects non-array', () => {
      expect(attachmentFieldOutputSchema.safeParse('not an array').success).toBe(false);
    });

    it('edge: rejects array containing wrong-shape item', () => {
      expect(attachmentFieldOutputSchema.safeParse([{ random: 'object' }]).success).toBe(false);
    });
  });

  describe('getAiOutputSchema dispatch', () => {
    it('dispatches SingleSelect to choice-aware schema', () => {
      const schema = getAiOutputSchema({
        type: FieldType.SingleSelect,
        options: { choices: [{ name: 'foo' }] },
      });
      expect(schema.safeParse('foo').success).toBe(true);
      expect(schema.safeParse('bar').success).toBe(false);
    });

    it('dispatches MultipleSelect to array-of-choices', () => {
      const schema = getAiOutputSchema({
        type: FieldType.MultipleSelect,
        options: { choices: [{ name: 'a' }] },
      });
      expect(schema.safeParse(['a']).success).toBe(true);
      expect(schema.safeParse(['x']).success).toBe(false);
    });

    it('dispatches Rating with default max=5 when options.max missing', () => {
      const schema = getAiOutputSchema({ type: FieldType.Rating, options: {} });
      expect(schema.safeParse(5).success).toBe(true);
      expect(schema.safeParse(6).success).toBe(false);
    });

    it('dispatches Date', () => {
      const schema = getAiOutputSchema({ type: FieldType.Date });
      expect(schema.safeParse('2026-01-01T00:00:00Z').success).toBe(true);
    });

    it('dispatches Attachment', () => {
      const schema = getAiOutputSchema({ type: FieldType.Attachment });
      expect(schema.safeParse([]).success).toBe(true);
    });

    it('default branch (text-like) for SingleLineText/LongText', () => {
      expect(getAiOutputSchema({ type: FieldType.SingleLineText }).safeParse('hello').success).toBe(
        true
      );
      expect(getAiOutputSchema({ type: FieldType.LongText }).safeParse('hello').success).toBe(true);
    });
  });
});
