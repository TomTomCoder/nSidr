import { describe, it, expect } from 'vitest';
import { ganttViewOptionSchema, ganttTimeScaleSchema } from '../gantt-view-option.schema';

describe('ganttViewOptionSchema', () => {
  it('accepts valid options with only required fields and applies defaults', () => {
    const result = ganttViewOptionSchema.safeParse({
      startField: 'fld_start',
      endField: 'fld_end',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.milestoneThreshold).toBe(0);
      expect(result.data.showCriticalPath).toBe(false);
      expect(result.data.showWeekends).toBe(true);
      expect(result.data.timeScale).toBe('week');
    }
  });

  it('accepts valid options with all optional fields', () => {
    const result = ganttViewOptionSchema.safeParse({
      startField: 'fld_start',
      endField: 'fld_end',
      titleField: 'fld_title',
      dependencyField: 'fld_dep',
      colorField: 'fld_color',
      milestoneThreshold: 2,
      showCriticalPath: true,
      showWeekends: false,
      timeScale: 'day',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing startField', () => {
    const result = ganttViewOptionSchema.safeParse({
      endField: 'fld_end',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing endField', () => {
    const result = ganttViewOptionSchema.safeParse({
      startField: 'fld_start',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty string startField', () => {
    const result = ganttViewOptionSchema.safeParse({
      startField: '',
      endField: 'fld_end',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty string endField', () => {
    const result = ganttViewOptionSchema.safeParse({
      startField: 'fld_start',
      endField: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid timeScale value', () => {
    const result = ganttViewOptionSchema.safeParse({
      startField: 'fld_start',
      endField: 'fld_end',
      timeScale: 'year',
    });
    expect(result.success).toBe(false);
  });

  it('allows undefined optional fields', () => {
    const result = ganttViewOptionSchema.safeParse({
      startField: 'fld_start',
      endField: 'fld_end',
      titleField: undefined,
      dependencyField: undefined,
      colorField: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid timeScale values', () => {
    for (const scale of ['day', 'week', 'month', 'quarter']) {
      const result = ganttViewOptionSchema.safeParse({
        startField: 'fld_start',
        endField: 'fld_end',
        timeScale: scale,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('ganttTimeScaleSchema', () => {
  it.each(['day', 'week', 'month', 'quarter'])('accepts "%s"', (scale) => {
    expect(ganttTimeScaleSchema.safeParse(scale).success).toBe(true);
  });

  it('rejects invalid scale "year"', () => {
    expect(ganttTimeScaleSchema.safeParse('year').success).toBe(false);
  });

  it('rejects invalid scale "hour"', () => {
    expect(ganttTimeScaleSchema.safeParse('hour').success).toBe(false);
  });
});
