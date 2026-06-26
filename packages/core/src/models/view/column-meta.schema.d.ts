import { z } from '../../zod';
import { StatisticsFunc } from '../aggregation';
export declare const fieldsViewVisibleRoSchema: z.ZodObject<{
    viewFields: z.ZodArray<z.ZodObject<{
        fieldId: z.ZodString;
        hidden: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type IColumnMeta = z.infer<typeof columnMetaSchema>;
export type IGridColumnMeta = z.infer<typeof gridColumnMetaSchema>;
export type IKanbanColumnMeta = z.infer<typeof kanbanColumnMetaSchema>;
export type IGalleryColumnMeta = z.infer<typeof galleryColumnMetaSchema>;
export type ICalendarColumnMeta = z.infer<typeof calendarColumnMetaSchema>;
export type IFormColumnMeta = z.infer<typeof formColumnMetaSchema>;
export type IPluginColumnMeta = z.infer<typeof pluginColumnMetaSchema>;
export type IColumn = z.infer<typeof columnSchema>;
export type IGridColumn = z.infer<typeof gridColumnSchema>;
export type IKanbanColumn = z.infer<typeof kanbanColumnSchema>;
export type IFormColumn = z.infer<typeof formColumnSchema>;
export type IPluginColumn = z.infer<typeof pluginColumnSchema>;
export declare const columnSchemaBase: z.ZodObject<{
    order: z.ZodNumber;
}, z.core.$strip>;
export declare const gridColumnSchema: z.ZodObject<{
    order: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    statisticFunc: z.ZodOptional<z.ZodNullable<z.ZodEnum<typeof StatisticsFunc>>>;
}, z.core.$strip>;
export declare const kanbanColumnSchema: z.ZodObject<{
    order: z.ZodNumber;
    visible: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const galleryColumnSchema: z.ZodObject<{
    order: z.ZodNumber;
    visible: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const calendarColumnSchema: z.ZodObject<{
    order: z.ZodNumber;
    visible: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const formColumnSchema: z.ZodObject<{
    order: z.ZodNumber;
    visible: z.ZodOptional<z.ZodBoolean>;
    required: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const pluginColumnSchema: z.ZodObject<{
    order: z.ZodNumber;
    hidden: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const columnSchema: z.ZodUnion<readonly [z.ZodObject<{
    order: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    statisticFunc: z.ZodOptional<z.ZodNullable<z.ZodEnum<typeof StatisticsFunc>>>;
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
}, z.core.$strict>]>;
export declare const columnMetaSchema: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodObject<{
    order: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    statisticFunc: z.ZodOptional<z.ZodNullable<z.ZodEnum<typeof StatisticsFunc>>>;
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
export declare const gridColumnMetaSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    order: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    statisticFunc: z.ZodOptional<z.ZodNullable<z.ZodEnum<typeof StatisticsFunc>>>;
}, z.core.$strip>>;
export declare const kanbanColumnMetaSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    order: z.ZodNumber;
    visible: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>>;
export declare const galleryColumnMetaSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    order: z.ZodNumber;
    visible: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>>;
export declare const calendarColumnMetaSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    order: z.ZodNumber;
    visible: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>>;
export declare const formColumnMetaSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    order: z.ZodNumber;
    visible: z.ZodOptional<z.ZodBoolean>;
    required: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>>;
export declare const pluginColumnMetaSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    order: z.ZodNumber;
    hidden: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>>;
export declare const columnMetaRoSchema: z.ZodArray<z.ZodObject<{
    fieldId: z.ZodString;
    columnMeta: z.ZodUnion<readonly [z.ZodObject<{
        order: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        hidden: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
        statisticFunc: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodEnum<typeof StatisticsFunc>>>>;
    }, z.core.$strict>, z.ZodObject<{
        order: z.ZodOptional<z.ZodNumber>;
        visible: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strict>, z.ZodObject<{
        order: z.ZodOptional<z.ZodNumber>;
        visible: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
        required: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strict>, z.ZodObject<{
        order: z.ZodOptional<z.ZodNumber>;
        hidden: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strict>]>;
}, z.core.$strip>>;
export type IColumnMetaRo = z.infer<typeof columnMetaRoSchema>;
export type IFieldsViewVisibleRo = z.infer<typeof fieldsViewVisibleRoSchema>;
