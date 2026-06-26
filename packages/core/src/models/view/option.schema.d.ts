import { z } from '../../zod';
import { ViewType } from './constant';
export declare const viewOptionsSchema: z.ZodUnion<readonly [z.ZodObject<{
    rowHeight: z.ZodOptional<z.ZodEnum<typeof import("./constant").RowHeightLevel>>;
    fieldNameDisplayLines: z.ZodOptional<z.ZodNumber>;
    frozenColumnCount: z.ZodOptional<z.ZodNumber>;
    frozenFieldId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    stackFieldId: z.ZodOptional<z.ZodString>;
    coverFieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isCoverFit: z.ZodOptional<z.ZodBoolean>;
    isFieldNameHidden: z.ZodOptional<z.ZodBoolean>;
    isEmptyStackHidden: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>, z.ZodObject<{
    coverFieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isCoverFit: z.ZodOptional<z.ZodBoolean>;
    isFieldNameHidden: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>, z.ZodObject<{
    startDateFieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    endDateFieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    titleFieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    colorConfig: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<typeof import("./derivate/calendar-view-option.schema").ColorConfigType>;
        fieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        color: z.ZodNullable<z.ZodOptional<z.ZodEnum<typeof import("@teable/core").Colors>>>;
    }, z.core.$strip>>>;
}, z.core.$strict>, z.ZodObject<{
    coverUrl: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodOptional<z.ZodString>;
    submitLabel: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    pluginId: z.ZodString;
    pluginInstallId: z.ZodString;
    pluginLogo: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
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
}, z.core.$strip>]>;
export type IViewOptions = z.infer<typeof viewOptionsSchema>;
export declare const validateOptionsType: (type: ViewType, optionsString: IViewOptions) => string | void;
