import { z } from '../../../zod';

export const ganttTimeScaleSchema = z.enum(['day', 'week', 'month', 'quarter']);
export type IGanttTimeScale = z.infer<typeof ganttTimeScaleSchema>;

export const ganttViewOptionSchema = z.object({
  startField: z.string().optional(),
  endField: z.string().optional(),
  titleField: z.string().optional(),
  dependencyField: z.string().optional(),
  colorField: z.string().optional(),
  milestoneThreshold: z.number().default(0),
  showCriticalPath: z.boolean().default(false),
  showWeekends: z.boolean().default(true),
  timeScale: ganttTimeScaleSchema.default('week'),
});

export type IGanttViewOptions = z.infer<typeof ganttViewOptionSchema>;
