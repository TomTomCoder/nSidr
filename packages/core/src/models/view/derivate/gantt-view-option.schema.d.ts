import { z } from '../../../zod';
export declare const ganttTimeScaleSchema: z.ZodEnum<{
    day: "day";
    month: "month";
    week: "week";
    quarter: "quarter";
}>;
export type IGanttTimeScale = z.infer<typeof ganttTimeScaleSchema>;
export declare const ganttViewOptionSchema: z.ZodObject<{
    startField: z.ZodString;
    endField: z.ZodString;
    titleField: z.ZodOptional<z.ZodString>;
    dependencyField: z.ZodOptional<z.ZodString>;
    colorField: z.ZodOptional<z.ZodString>;
    milestoneThreshold: z.ZodDefault<z.ZodNumber>;
    showCriticalPath: z.ZodDefault<z.ZodBoolean>;
    showWeekends: z.ZodDefault<z.ZodBoolean>;
    timeScale: z.ZodDefault<z.ZodEnum<{
        day: "day";
        month: "month";
        week: "week";
        quarter: "quarter";
    }>>;
}, z.core.$strip>;
export type IGanttViewOptions = z.infer<typeof ganttViewOptionSchema>;
