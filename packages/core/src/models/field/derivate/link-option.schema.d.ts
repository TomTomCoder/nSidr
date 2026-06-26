import { z } from '../../../zod';
import { Relationship } from '../constant';
export declare const linkFieldOptionsSchema: z.ZodObject<{
    baseId: z.ZodOptional<z.ZodString>;
    relationship: z.ZodEnum<typeof Relationship>;
    foreignTableId: z.ZodString;
    lookupFieldId: z.ZodString;
    isOneWay: z.ZodOptional<z.ZodBoolean>;
    fkHostTableName: z.ZodString;
    selfKeyName: z.ZodString;
    foreignKeyName: z.ZodString;
    symmetricFieldId: z.ZodOptional<z.ZodString>;
    filterByViewId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    visibleFieldIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("../../view/filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("../../view/filter").IFilterSet, unknown>>>>;
}, z.core.$strip>;
export type ILinkFieldOptions = z.infer<typeof linkFieldOptionsSchema>;
export declare const linkFieldMetaSchema: z.ZodObject<{
    hasOrderColumn: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type ILinkFieldMeta = z.infer<typeof linkFieldMetaSchema>;
export declare const linkFieldOptionsRoSchema: z.ZodObject<{
    filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("../../view/filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("../../view/filter").IFilterSet, unknown>>>>;
    baseId: z.ZodOptional<z.ZodString>;
    foreignTableId: z.ZodString;
    relationship: z.ZodEnum<typeof Relationship>;
    isOneWay: z.ZodOptional<z.ZodBoolean>;
    filterByViewId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    visibleFieldIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    lookupFieldId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ILinkFieldOptionsRo = z.infer<typeof linkFieldOptionsRoSchema>;
