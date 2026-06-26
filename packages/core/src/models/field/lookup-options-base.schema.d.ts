import { z } from '../../zod';
import { SortFunc } from '../view/sort';
import { Relationship } from './constant';
declare const lookupLinkOptionsVoSchema: z.ZodObject<{
    baseId: z.ZodOptional<z.ZodString>;
    relationship: z.ZodEnum<typeof Relationship>;
    foreignTableId: z.ZodString;
    lookupFieldId: z.ZodString;
    fkHostTableName: z.ZodString;
    selfKeyName: z.ZodString;
    foreignKeyName: z.ZodString;
    filterByViewId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    visibleFieldIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    isOneWay: z.ZodOptional<z.ZodBoolean>;
    symmetricFieldId: z.ZodOptional<z.ZodString>;
    filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("../view/filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("../view/filter").IFilterSet, unknown>>>>;
    linkFieldId: z.ZodString;
}, z.core.$strip>;
declare const lookupLinkOptionsRoSchema: z.ZodObject<{
    filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("../view/filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("../view/filter").IFilterSet, unknown>>>>;
    foreignTableId: z.ZodString;
    lookupFieldId: z.ZodString;
    linkFieldId: z.ZodString;
}, z.core.$strip>;
declare const lookupConditionalOptionsVoSchema: z.ZodObject<{
    baseId: z.ZodOptional<z.ZodString>;
    foreignTableId: z.ZodString;
    lookupFieldId: z.ZodString;
    filter: z.ZodNullable<z.ZodType<import("../view/filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("../view/filter").IFilterSet, unknown>>>;
    sort: z.ZodOptional<z.ZodObject<{
        fieldId: z.ZodString;
        order: z.ZodEnum<typeof SortFunc>;
    }, z.core.$strip>>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
declare const lookupConditionalOptionsRoSchema: z.ZodObject<{
    baseId: z.ZodOptional<z.ZodString>;
    foreignTableId: z.ZodString;
    lookupFieldId: z.ZodString;
    filter: z.ZodNullable<z.ZodType<import("../view/filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("../view/filter").IFilterSet, unknown>>>;
    sort: z.ZodOptional<z.ZodObject<{
        fieldId: z.ZodString;
        order: z.ZodEnum<typeof SortFunc>;
    }, z.core.$strip>>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const lookupOptionsVoSchema: z.ZodUnion<readonly [z.ZodObject<{
    baseId: z.ZodOptional<z.ZodString>;
    relationship: z.ZodEnum<typeof Relationship>;
    foreignTableId: z.ZodString;
    lookupFieldId: z.ZodString;
    fkHostTableName: z.ZodString;
    selfKeyName: z.ZodString;
    foreignKeyName: z.ZodString;
    filterByViewId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    visibleFieldIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    isOneWay: z.ZodOptional<z.ZodBoolean>;
    symmetricFieldId: z.ZodOptional<z.ZodString>;
    filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("../view/filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("../view/filter").IFilterSet, unknown>>>>;
    linkFieldId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    baseId: z.ZodOptional<z.ZodString>;
    foreignTableId: z.ZodString;
    lookupFieldId: z.ZodString;
    filter: z.ZodNullable<z.ZodType<import("../view/filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("../view/filter").IFilterSet, unknown>>>;
    sort: z.ZodOptional<z.ZodObject<{
        fieldId: z.ZodString;
        order: z.ZodEnum<typeof SortFunc>;
    }, z.core.$strip>>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>]>;
export declare const lookupOptionsRoSchema: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodUnion<readonly [z.ZodObject<{
    filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("../view/filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("../view/filter").IFilterSet, unknown>>>>;
    foreignTableId: z.ZodString;
    lookupFieldId: z.ZodString;
    linkFieldId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    baseId: z.ZodOptional<z.ZodString>;
    foreignTableId: z.ZodString;
    lookupFieldId: z.ZodString;
    filter: z.ZodNullable<z.ZodType<import("../view/filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("../view/filter").IFilterSet, unknown>>>;
    sort: z.ZodOptional<z.ZodObject<{
        fieldId: z.ZodString;
        order: z.ZodEnum<typeof SortFunc>;
    }, z.core.$strip>>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>]>>;
export type ILookupOptionsVo = z.infer<typeof lookupOptionsVoSchema>;
export type ILookupOptionsRo = z.infer<typeof lookupOptionsRoSchema>;
export type ILookupLinkOptions = z.infer<typeof lookupLinkOptionsRoSchema>;
export type ILookupConditionalOptions = z.infer<typeof lookupConditionalOptionsRoSchema>;
export type IConditionalLookupOptions = ILookupConditionalOptions;
export type ILookupLinkOptionsVo = z.infer<typeof lookupLinkOptionsVoSchema>;
export type ILookupConditionalOptionsVo = z.infer<typeof lookupConditionalOptionsVoSchema>;
export declare const isLinkLookupOptions: <T extends {
    relationship: Relationship;
    foreignTableId: string;
    lookupFieldId: string;
    fkHostTableName: string;
    selfKeyName: string;
    foreignKeyName: string;
    linkFieldId: string;
    baseId?: string | undefined;
    filterByViewId?: string | null | undefined;
    visibleFieldIds?: string[] | null | undefined;
    isOneWay?: boolean | undefined;
    symmetricFieldId?: string | undefined;
    filter?: import("../view/filter").IFilterSet | null | undefined;
} | {
    foreignTableId: string;
    lookupFieldId: string;
    filter: import("../view/filter").IFilterSet | null;
    baseId?: string | undefined;
    sort?: {
        fieldId: string;
        order: SortFunc;
    } | undefined;
    limit?: number | undefined;
} | {
    foreignTableId: string;
    lookupFieldId: string;
    linkFieldId: string;
    filter?: import("../view/filter").IFilterSet | null | undefined;
} | undefined>(options: T) => options is Extract<T, {
    relationship: Relationship;
    foreignTableId: string;
    lookupFieldId: string;
    fkHostTableName: string;
    selfKeyName: string;
    foreignKeyName: string;
    linkFieldId: string;
    baseId?: string | undefined;
    filterByViewId?: string | null | undefined;
    visibleFieldIds?: string[] | null | undefined;
    isOneWay?: boolean | undefined;
    symmetricFieldId?: string | undefined;
    filter?: import("../view/filter").IFilterSet | null | undefined;
} | {
    foreignTableId: string;
    lookupFieldId: string;
    linkFieldId: string;
    filter?: import("../view/filter").IFilterSet | null | undefined;
}>;
export declare const isConditionalLookupOptions: (options: ILookupOptionsRo | ILookupOptionsVo | undefined) => options is {
    foreignTableId: string;
    lookupFieldId: string;
    filter: import("../view/filter").IFilterSet | null;
    baseId?: string | undefined;
    sort?: {
        fieldId: string;
        order: SortFunc;
    } | undefined;
    limit?: number | undefined;
};
export {};
