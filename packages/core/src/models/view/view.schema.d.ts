import { z } from '../../zod';
import { ViewType } from './constant';
export declare const sharePasswordSchema: z.ZodString;
export declare const shareViewMetaSchema: z.ZodObject<{
    allowCopy: z.ZodOptional<z.ZodBoolean>;
    includeHiddenField: z.ZodOptional<z.ZodBoolean>;
    password: z.ZodOptional<z.ZodString>;
    includeRecords: z.ZodOptional<z.ZodBoolean>;
    submit: z.ZodOptional<z.ZodObject<{
        allow: z.ZodOptional<z.ZodBoolean>;
        requireLogin: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type IShareViewMeta = z.infer<typeof shareViewMetaSchema>;
export declare const viewVoSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<typeof ViewType>;
    description: z.ZodOptional<z.ZodString>;
    order: z.ZodOptional<z.ZodNumber>;
    options: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
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
    }, z.core.$strip>]>>;
    sort: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        sortObjs: z.ZodArray<z.ZodObject<{
            fieldId: z.ZodString;
            order: z.ZodEnum<typeof import("./sort").SortFunc>;
        }, z.core.$strip>>;
        manualSort: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("./filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("./filter").IFilterSet, unknown>>>>;
    group: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        fieldId: z.ZodString;
        order: z.ZodEnum<typeof import("./sort").SortFunc>;
    }, z.core.$strip>>>>;
    isLocked: z.ZodOptional<z.ZodBoolean>;
    shareId: z.ZodOptional<z.ZodString>;
    enableShare: z.ZodOptional<z.ZodBoolean>;
    shareMeta: z.ZodOptional<z.ZodObject<{
        allowCopy: z.ZodOptional<z.ZodBoolean>;
        includeHiddenField: z.ZodOptional<z.ZodBoolean>;
        password: z.ZodOptional<z.ZodString>;
        includeRecords: z.ZodOptional<z.ZodBoolean>;
        submit: z.ZodOptional<z.ZodObject<{
            allow: z.ZodOptional<z.ZodBoolean>;
            requireLogin: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    createdBy: z.ZodString;
    lastModifiedBy: z.ZodOptional<z.ZodString>;
    createdTime: z.ZodString;
    lastModifiedTime: z.ZodOptional<z.ZodString>;
    columnMeta: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodObject<{
        order: z.ZodNumber;
        width: z.ZodOptional<z.ZodNumber>;
        hidden: z.ZodOptional<z.ZodBoolean>;
        statisticFunc: z.ZodOptional<z.ZodNullable<z.ZodEnum<typeof import("@teable/core").StatisticsFunc>>>;
    }, z.core.$strict>, z.ZodObject<{
        order: z.ZodNumber;
        visible: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>, z.ZodObject<{
        order: z.ZodNumber;
        visible: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>, z.ZodObject<{
        order: z.ZodNumber;
        visible: z.ZodOptional<z.ZodBoolean>;
        required: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>, z.ZodObject<{
        order: z.ZodNumber;
        hidden: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>]>>;
    pluginId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type IViewVo = z.infer<typeof viewVoSchema>;
export declare const viewRoSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("./filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("./filter").IFilterSet, unknown>>>>;
    sort: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        sortObjs: z.ZodArray<z.ZodObject<{
            fieldId: z.ZodString;
            order: z.ZodEnum<typeof import("./sort").SortFunc>;
        }, z.core.$strip>>;
        manualSort: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<typeof ViewType>;
    order: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    options: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
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
    }, z.core.$strip>]>>;
    columnMeta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodObject<{
        order: z.ZodNumber;
        width: z.ZodOptional<z.ZodNumber>;
        hidden: z.ZodOptional<z.ZodBoolean>;
        statisticFunc: z.ZodOptional<z.ZodNullable<z.ZodEnum<typeof import("@teable/core").StatisticsFunc>>>;
    }, z.core.$strict>, z.ZodObject<{
        order: z.ZodNumber;
        visible: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>, z.ZodObject<{
        order: z.ZodNumber;
        visible: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>, z.ZodObject<{
        order: z.ZodNumber;
        visible: z.ZodOptional<z.ZodBoolean>;
        required: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>, z.ZodObject<{
        order: z.ZodNumber;
        hidden: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>]>>>;
    group: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        fieldId: z.ZodString;
        order: z.ZodEnum<typeof import("./sort").SortFunc>;
    }, z.core.$strip>>>>;
    isLocked: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    shareId: z.ZodOptional<z.ZodString>;
    enableShare: z.ZodOptional<z.ZodBoolean>;
    shareMeta: z.ZodOptional<z.ZodObject<{
        allowCopy: z.ZodOptional<z.ZodBoolean>;
        includeHiddenField: z.ZodOptional<z.ZodBoolean>;
        password: z.ZodOptional<z.ZodString>;
        includeRecords: z.ZodOptional<z.ZodBoolean>;
        submit: z.ZodOptional<z.ZodObject<{
            allow: z.ZodOptional<z.ZodBoolean>;
            requireLogin: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type IViewRo = z.infer<typeof viewRoSchema>;
export type IViewPropertyKeys = keyof IViewVo;
export declare const VIEW_JSON_KEYS: string[];
