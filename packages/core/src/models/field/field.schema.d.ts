import { z } from '../../zod';
import { CellValueType, DbFieldType, FieldType } from './constant';
export declare const fieldVoSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<typeof FieldType>;
    description: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodString>>;
    options: z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodObject<{
        expression: z.ZodEnum<{
            "countall({values})": "countall({values})";
            "counta({values})": "counta({values})";
            "count({values})": "count({values})";
            "sum({values})": "sum({values})";
            "average({values})": "average({values})";
            "max({values})": "max({values})";
            "min({values})": "min({values})";
            "and({values})": "and({values})";
            "or({values})": "or({values})";
            "xor({values})": "xor({values})";
            "array_join({values})": "array_join({values})";
            "array_unique({values})": "array_unique({values})";
            "array_compact({values})": "array_compact({values})";
            "concatenate({values})": "concatenate({values})";
        }>;
        timeZone: z.ZodOptional<z.ZodString>;
        formatting: z.ZodOptional<z.ZodAny>;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
    }, z.core.$strict>, z.ZodObject<{
        expression: z.ZodEnum<{
            "countall({values})": "countall({values})";
            "counta({values})": "counta({values})";
            "count({values})": "count({values})";
            "sum({values})": "sum({values})";
            "average({values})": "average({values})";
            "max({values})": "max({values})";
            "min({values})": "min({values})";
            "and({values})": "and({values})";
            "or({values})": "or({values})";
            "xor({values})": "xor({values})";
            "array_join({values})": "array_join({values})";
            "array_unique({values})": "array_unique({values})";
            "array_compact({values})": "array_compact({values})";
            "concatenate({values})": "concatenate({values})";
        }>;
        timeZone: z.ZodOptional<z.ZodString>;
        formatting: z.ZodOptional<z.ZodAny>;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
        baseId: z.ZodOptional<z.ZodString>;
        foreignTableId: z.ZodOptional<z.ZodString>;
        lookupFieldId: z.ZodOptional<z.ZodString>;
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
        sort: z.ZodOptional<z.ZodObject<{
            fieldId: z.ZodString;
            order: z.ZodEnum<typeof import("@teable/core").SortFunc>;
        }, z.core.$strip>>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        expression: z.ZodString;
        timeZone: z.ZodOptional<z.ZodString>;
        formatting: z.ZodOptional<z.ZodAny>;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
    }, z.core.$strict>, z.ZodObject<{
        baseId: z.ZodOptional<z.ZodString>;
        relationship: z.ZodEnum<typeof import("./constant").Relationship>;
        foreignTableId: z.ZodString;
        lookupFieldId: z.ZodString;
        isOneWay: z.ZodOptional<z.ZodBoolean>;
        fkHostTableName: z.ZodString;
        selfKeyName: z.ZodString;
        foreignKeyName: z.ZodString;
        symmetricFieldId: z.ZodOptional<z.ZodString>;
        filterByViewId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        visibleFieldIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
    }, z.core.$strict>, z.ZodObject<{
        formatting: z.ZodObject<{
            date: z.ZodString;
            time: z.ZodEnum<typeof import("@teable/core").TimeFormatting>;
            timeZone: z.ZodString;
        }, z.core.$strip>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
            now: "now";
        }>>>;
    }, z.core.$strict>, z.ZodObject<{
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strict>, z.ZodObject<{
        showAs: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strip>>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>>;
    }, z.core.$strict>, z.ZodObject<{
        icon: z.ZodEnum<typeof import("./derivate/rating-option.schema").RatingIcon>;
        color: z.ZodEnum<{
            redBright: import("@teable/core").Colors.RedBright;
            tealBright: import("@teable/core").Colors.TealBright;
            yellowBright: import("@teable/core").Colors.YellowBright;
        }>;
        max: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        isMultiple: z.ZodOptional<z.ZodBoolean>;
        shouldNotify: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodUnion<[z.ZodString, z.ZodEnum<{
            me: "me";
        }>]>, z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodEnum<{
            me: "me";
        }>]>>]>>>;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strict>, z.ZodObject<{
        trackedFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>, z.ZodObject<{
        label: z.ZodString;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        maxCount: z.ZodOptional<z.ZodNumber>;
        resetCount: z.ZodOptional<z.ZodBoolean>;
        workflow: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            isActive: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        confirm: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            confirmText: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strict>, z.ZodObject<{
        prompt: z.ZodOptional<z.ZodString>;
        sourceFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>]>, z.ZodObject<{
        expression: z.ZodEnum<{
            "countall({values})": "countall({values})";
            "counta({values})": "counta({values})";
            "count({values})": "count({values})";
            "sum({values})": "sum({values})";
            "average({values})": "average({values})";
            "max({values})": "max({values})";
            "min({values})": "min({values})";
            "and({values})": "and({values})";
            "or({values})": "or({values})";
            "xor({values})": "xor({values})";
            "array_join({values})": "array_join({values})";
            "array_unique({values})": "array_unique({values})";
            "array_compact({values})": "array_compact({values})";
            "concatenate({values})": "concatenate({values})";
        }>;
        timeZone: z.ZodOptional<z.ZodString>;
        formatting: z.ZodOptional<z.ZodAny>;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
        baseId: z.ZodOptional<z.ZodString>;
        foreignTableId: z.ZodOptional<z.ZodString>;
        lookupFieldId: z.ZodOptional<z.ZodString>;
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
        sort: z.ZodOptional<z.ZodObject<{
            fieldId: z.ZodString;
            order: z.ZodEnum<typeof import("@teable/core").SortFunc>;
        }, z.core.$strip>>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        baseId: z.ZodOptional<z.ZodString>;
        relationship: z.ZodEnum<typeof import("./constant").Relationship>;
        foreignTableId: z.ZodString;
        lookupFieldId: z.ZodString;
        isOneWay: z.ZodOptional<z.ZodBoolean>;
        fkHostTableName: z.ZodString;
        selfKeyName: z.ZodString;
        foreignKeyName: z.ZodString;
        symmetricFieldId: z.ZodOptional<z.ZodString>;
        filterByViewId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        visibleFieldIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
    }, z.core.$strict>, z.ZodObject<{
        choices: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            color: z.ZodString;
        }, z.core.$strip>>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>>;
        preventAutoNewOptions: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>, z.ZodObject<{
        formatting: z.ZodDiscriminatedUnion<[z.ZodObject<{
            precision: z.ZodNumber;
            type: z.ZodLiteral<import("@teable/core").NumberFormattingType.Decimal>;
        }, z.core.$strict>, z.ZodObject<{
            precision: z.ZodNumber;
            type: z.ZodLiteral<import("@teable/core").NumberFormattingType.Percent>;
        }, z.core.$strict>, z.ZodObject<{
            precision: z.ZodNumber;
            type: z.ZodLiteral<import("@teable/core").NumberFormattingType.Currency>;
            symbol: z.ZodString;
        }, z.core.$strict>], "type">;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    }, z.core.$strict>, z.ZodObject<{
        expression: z.ZodLiteral<"AUTO_NUMBER()">;
    }, z.core.$strict>, z.ZodObject<{
        expression: z.ZodLiteral<"CREATED_TIME()">;
        formatting: z.ZodObject<{
            date: z.ZodString;
            time: z.ZodEnum<typeof import("@teable/core").TimeFormatting>;
            timeZone: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodObject<{
        expression: z.ZodDefault<z.ZodLiteral<"LAST_MODIFIED_TIME()">>;
        formatting: z.ZodOptional<z.ZodObject<{
            date: z.ZodString;
            time: z.ZodEnum<typeof import("@teable/core").TimeFormatting>;
            timeZone: z.ZodString;
        }, z.core.$strip>>;
        trackedFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$loose>]>;
    meta: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        persistedAsGeneratedColumn: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strip>, z.ZodObject<{
        hasOrderColumn: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strip>]>>>>;
    aiConfig: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Extraction>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Summary>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Translation>;
        sourceFieldId: z.ZodString;
        targetLanguage: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Improvement>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Classification>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
        onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Tag>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
        onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        n: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodString>;
        quality: z.ZodOptional<z.ZodEnum<typeof import("./ai-config").ImageQuality>>;
        aspectRatio: z.ZodOptional<z.ZodString>;
        resolution: z.ZodOptional<z.ZodEnum<{
            "1K": "1K";
            "2K": "2K";
            "4K": "4K";
        }>>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.ImageGeneration>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        n: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodString>;
        quality: z.ZodOptional<z.ZodEnum<typeof import("./ai-config").ImageQuality>>;
        aspectRatio: z.ZodOptional<z.ZodString>;
        resolution: z.ZodOptional<z.ZodEnum<{
            "1K": "1K";
            "2K": "2K";
            "4K": "4K";
        }>>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.ImageCustomization>;
        prompt: z.ZodString;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Rating>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Extraction>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
    }, z.core.$strip>], "type">]>>>;
    isLookup: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    isConditionalLookup: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    lookupOptions: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        baseId: z.ZodOptional<z.ZodString>;
        relationship: z.ZodEnum<typeof import("./constant").Relationship>;
        foreignTableId: z.ZodString;
        lookupFieldId: z.ZodString;
        fkHostTableName: z.ZodString;
        selfKeyName: z.ZodString;
        foreignKeyName: z.ZodString;
        filterByViewId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        visibleFieldIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        isOneWay: z.ZodOptional<z.ZodBoolean>;
        symmetricFieldId: z.ZodOptional<z.ZodString>;
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
        linkFieldId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        baseId: z.ZodOptional<z.ZodString>;
        foreignTableId: z.ZodString;
        lookupFieldId: z.ZodString;
        filter: z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>;
        sort: z.ZodOptional<z.ZodObject<{
            fieldId: z.ZodString;
            order: z.ZodEnum<typeof import("@teable/core").SortFunc>;
        }, z.core.$strip>>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>]>>>;
    notNull: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    unique: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    isPrimary: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    isComputed: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    isPending: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    hasError: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    cellValueType: z.ZodEnum<typeof CellValueType>;
    isMultipleCellValue: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    dbFieldType: z.ZodEnum<typeof DbFieldType>;
    dbFieldName: z.ZodString;
    recordRead: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    recordCreate: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type IFieldVo = z.infer<typeof fieldVoSchema>;
export type IFieldPropertyKey = keyof Omit<IFieldVo, 'id'>;
export declare const FIELD_RO_PROPERTIES: readonly ["type", "name", "dbFieldName", "isLookup", "isConditionalLookup", "description", "lookupOptions", "options"];
export declare const FIELD_VO_PROPERTIES: readonly ["type", "description", "options", "meta", "aiConfig", "name", "isLookup", "isConditionalLookup", "lookupOptions", "notNull", "unique", "isPrimary", "isComputed", "isPending", "hasError", "cellValueType", "isMultipleCellValue", "dbFieldType", "dbFieldName", "recordRead", "recordCreate"];
export declare const getOptionsSchema: (type: FieldType) => z.ZodObject<{}, z.core.$strict>;
export declare const convertFieldRoSchema: z.ZodObject<{
    dbFieldName: z.ZodOptional<z.ZodString>;
    type: z.ZodNonOptional<z.ZodOptional<z.ZodEnum<typeof FieldType>>>;
    isLookup: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>>;
    isConditionalLookup: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>>;
    notNull: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>>;
    unique: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodString>>>>;
    lookupOptions: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodUnion<readonly [z.ZodObject<{
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
        foreignTableId: z.ZodString;
        lookupFieldId: z.ZodString;
        linkFieldId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        baseId: z.ZodOptional<z.ZodString>;
        foreignTableId: z.ZodString;
        lookupFieldId: z.ZodString;
        filter: z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>;
        sort: z.ZodOptional<z.ZodObject<{
            fieldId: z.ZodString;
            order: z.ZodEnum<typeof import("@teable/core").SortFunc>;
        }, z.core.$strip>>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>]>>>;
    aiConfig: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Extraction>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Summary>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Translation>;
        sourceFieldId: z.ZodString;
        targetLanguage: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Improvement>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Classification>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
        onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Tag>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
        onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        n: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodString>;
        quality: z.ZodOptional<z.ZodEnum<typeof import("./ai-config").ImageQuality>>;
        aspectRatio: z.ZodOptional<z.ZodString>;
        resolution: z.ZodOptional<z.ZodEnum<{
            "1K": "1K";
            "2K": "2K";
            "4K": "4K";
        }>>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.ImageGeneration>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        n: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodString>;
        quality: z.ZodOptional<z.ZodEnum<typeof import("./ai-config").ImageQuality>>;
        aspectRatio: z.ZodOptional<z.ZodString>;
        resolution: z.ZodOptional<z.ZodEnum<{
            "1K": "1K";
            "2K": "2K";
            "4K": "4K";
        }>>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.ImageCustomization>;
        prompt: z.ZodString;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Rating>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Extraction>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
    }, z.core.$strip>], "type">]>>>;
    options: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodObject<{
        expression: z.ZodEnum<{
            "countall({values})": "countall({values})";
            "counta({values})": "counta({values})";
            "count({values})": "count({values})";
            "sum({values})": "sum({values})";
            "average({values})": "average({values})";
            "max({values})": "max({values})";
            "min({values})": "min({values})";
            "and({values})": "and({values})";
            "or({values})": "or({values})";
            "xor({values})": "xor({values})";
            "array_join({values})": "array_join({values})";
            "array_unique({values})": "array_unique({values})";
            "array_compact({values})": "array_compact({values})";
            "concatenate({values})": "concatenate({values})";
        }>;
        timeZone: z.ZodOptional<z.ZodString>;
        formatting: z.ZodOptional<z.ZodAny>;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
    }, z.core.$strict>, z.ZodObject<{
        expression: z.ZodEnum<{
            "countall({values})": "countall({values})";
            "counta({values})": "counta({values})";
            "count({values})": "count({values})";
            "sum({values})": "sum({values})";
            "average({values})": "average({values})";
            "max({values})": "max({values})";
            "min({values})": "min({values})";
            "and({values})": "and({values})";
            "or({values})": "or({values})";
            "xor({values})": "xor({values})";
            "array_join({values})": "array_join({values})";
            "array_unique({values})": "array_unique({values})";
            "array_compact({values})": "array_compact({values})";
            "concatenate({values})": "concatenate({values})";
        }>;
        timeZone: z.ZodOptional<z.ZodString>;
        formatting: z.ZodOptional<z.ZodAny>;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
        baseId: z.ZodOptional<z.ZodString>;
        foreignTableId: z.ZodOptional<z.ZodString>;
        lookupFieldId: z.ZodOptional<z.ZodString>;
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
        sort: z.ZodOptional<z.ZodObject<{
            fieldId: z.ZodString;
            order: z.ZodEnum<typeof import("@teable/core").SortFunc>;
        }, z.core.$strip>>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        expression: z.ZodString;
        timeZone: z.ZodOptional<z.ZodString>;
        formatting: z.ZodOptional<z.ZodAny>;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
    }, z.core.$strict>, z.ZodObject<{
        baseId: z.ZodOptional<z.ZodString>;
        relationship: z.ZodEnum<typeof import("./constant").Relationship>;
        foreignTableId: z.ZodString;
        lookupFieldId: z.ZodString;
        isOneWay: z.ZodOptional<z.ZodBoolean>;
        fkHostTableName: z.ZodString;
        selfKeyName: z.ZodString;
        foreignKeyName: z.ZodString;
        symmetricFieldId: z.ZodOptional<z.ZodString>;
        filterByViewId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        visibleFieldIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
    }, z.core.$strict>, z.ZodObject<{
        formatting: z.ZodObject<{
            date: z.ZodString;
            time: z.ZodEnum<typeof import("@teable/core").TimeFormatting>;
            timeZone: z.ZodString;
        }, z.core.$strip>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
            now: "now";
        }>>>;
    }, z.core.$strict>, z.ZodObject<{
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strict>, z.ZodObject<{
        showAs: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strip>>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>>;
    }, z.core.$strict>, z.ZodObject<{
        icon: z.ZodEnum<typeof import("./derivate/rating-option.schema").RatingIcon>;
        color: z.ZodEnum<{
            redBright: import("@teable/core").Colors.RedBright;
            tealBright: import("@teable/core").Colors.TealBright;
            yellowBright: import("@teable/core").Colors.YellowBright;
        }>;
        max: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        isMultiple: z.ZodOptional<z.ZodBoolean>;
        shouldNotify: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodUnion<[z.ZodString, z.ZodEnum<{
            me: "me";
        }>]>, z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodEnum<{
            me: "me";
        }>]>>]>>>;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strict>, z.ZodObject<{
        trackedFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>, z.ZodObject<{
        label: z.ZodString;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        maxCount: z.ZodOptional<z.ZodNumber>;
        resetCount: z.ZodOptional<z.ZodBoolean>;
        workflow: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            isActive: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        confirm: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            confirmText: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strict>, z.ZodObject<{
        prompt: z.ZodOptional<z.ZodString>;
        sourceFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>]>, z.ZodObject<{
        expression: z.ZodEnum<{
            "countall({values})": "countall({values})";
            "counta({values})": "counta({values})";
            "count({values})": "count({values})";
            "sum({values})": "sum({values})";
            "average({values})": "average({values})";
            "max({values})": "max({values})";
            "min({values})": "min({values})";
            "and({values})": "and({values})";
            "or({values})": "or({values})";
            "xor({values})": "xor({values})";
            "array_join({values})": "array_join({values})";
            "array_unique({values})": "array_unique({values})";
            "array_compact({values})": "array_compact({values})";
            "concatenate({values})": "concatenate({values})";
        }>;
        timeZone: z.ZodOptional<z.ZodString>;
        formatting: z.ZodOptional<z.ZodAny>;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
        baseId: z.ZodOptional<z.ZodString>;
        foreignTableId: z.ZodOptional<z.ZodString>;
        lookupFieldId: z.ZodOptional<z.ZodString>;
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
        sort: z.ZodOptional<z.ZodObject<{
            fieldId: z.ZodString;
            order: z.ZodEnum<typeof import("@teable/core").SortFunc>;
        }, z.core.$strip>>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
        baseId: z.ZodOptional<z.ZodString>;
        foreignTableId: z.ZodString;
        relationship: z.ZodEnum<typeof import("./constant").Relationship>;
        isOneWay: z.ZodOptional<z.ZodBoolean>;
        filterByViewId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        visibleFieldIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        lookupFieldId: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        choices: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>>;
        preventAutoNewOptions: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>, z.ZodObject<{
        formatting: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            precision: z.ZodNumber;
            type: z.ZodLiteral<import("@teable/core").NumberFormattingType.Decimal>;
        }, z.core.$strict>, z.ZodObject<{
            precision: z.ZodNumber;
            type: z.ZodLiteral<import("@teable/core").NumberFormattingType.Percent>;
        }, z.core.$strict>, z.ZodObject<{
            precision: z.ZodNumber;
            type: z.ZodLiteral<import("@teable/core").NumberFormattingType.Currency>;
            symbol: z.ZodString;
        }, z.core.$strict>], "type">>;
        showAs: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>>>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strict>, z.ZodObject<{
        formatting: z.ZodObject<{
            date: z.ZodString;
            time: z.ZodEnum<typeof import("@teable/core").TimeFormatting>;
            timeZone: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodObject<{
        expression: z.ZodDefault<z.ZodLiteral<"LAST_MODIFIED_TIME()">>;
        formatting: z.ZodOptional<z.ZodObject<{
            date: z.ZodString;
            time: z.ZodEnum<typeof import("@teable/core").TimeFormatting>;
            timeZone: z.ZodString;
        }, z.core.$strip>>;
        trackedFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$loose>, z.ZodObject<{
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
        formatting: z.ZodOptional<z.ZodAny>;
    }, z.core.$strict>]>>>>;
}, z.core.$strip>;
export declare const createFieldRoSchema: z.ZodObject<{
    dbFieldName: z.ZodOptional<z.ZodString>;
    type: z.ZodNonOptional<z.ZodOptional<z.ZodEnum<typeof FieldType>>>;
    isLookup: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>>;
    isConditionalLookup: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>>;
    notNull: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>>;
    unique: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodString>>>>;
    lookupOptions: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodUnion<readonly [z.ZodObject<{
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
        foreignTableId: z.ZodString;
        lookupFieldId: z.ZodString;
        linkFieldId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        baseId: z.ZodOptional<z.ZodString>;
        foreignTableId: z.ZodString;
        lookupFieldId: z.ZodString;
        filter: z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>;
        sort: z.ZodOptional<z.ZodObject<{
            fieldId: z.ZodString;
            order: z.ZodEnum<typeof import("@teable/core").SortFunc>;
        }, z.core.$strip>>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>]>>>;
    options: z.ZodOptional<z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodObject<{
        expression: z.ZodEnum<{
            "countall({values})": "countall({values})";
            "counta({values})": "counta({values})";
            "count({values})": "count({values})";
            "sum({values})": "sum({values})";
            "average({values})": "average({values})";
            "max({values})": "max({values})";
            "min({values})": "min({values})";
            "and({values})": "and({values})";
            "or({values})": "or({values})";
            "xor({values})": "xor({values})";
            "array_join({values})": "array_join({values})";
            "array_unique({values})": "array_unique({values})";
            "array_compact({values})": "array_compact({values})";
            "concatenate({values})": "concatenate({values})";
        }>;
        timeZone: z.ZodOptional<z.ZodString>;
        formatting: z.ZodOptional<z.ZodAny>;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
    }, z.core.$strict>, z.ZodObject<{
        expression: z.ZodEnum<{
            "countall({values})": "countall({values})";
            "counta({values})": "counta({values})";
            "count({values})": "count({values})";
            "sum({values})": "sum({values})";
            "average({values})": "average({values})";
            "max({values})": "max({values})";
            "min({values})": "min({values})";
            "and({values})": "and({values})";
            "or({values})": "or({values})";
            "xor({values})": "xor({values})";
            "array_join({values})": "array_join({values})";
            "array_unique({values})": "array_unique({values})";
            "array_compact({values})": "array_compact({values})";
            "concatenate({values})": "concatenate({values})";
        }>;
        timeZone: z.ZodOptional<z.ZodString>;
        formatting: z.ZodOptional<z.ZodAny>;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
        baseId: z.ZodOptional<z.ZodString>;
        foreignTableId: z.ZodOptional<z.ZodString>;
        lookupFieldId: z.ZodOptional<z.ZodString>;
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
        sort: z.ZodOptional<z.ZodObject<{
            fieldId: z.ZodString;
            order: z.ZodEnum<typeof import("@teable/core").SortFunc>;
        }, z.core.$strip>>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        expression: z.ZodString;
        timeZone: z.ZodOptional<z.ZodString>;
        formatting: z.ZodOptional<z.ZodAny>;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
    }, z.core.$strict>, z.ZodObject<{
        baseId: z.ZodOptional<z.ZodString>;
        relationship: z.ZodEnum<typeof import("./constant").Relationship>;
        foreignTableId: z.ZodString;
        lookupFieldId: z.ZodString;
        isOneWay: z.ZodOptional<z.ZodBoolean>;
        fkHostTableName: z.ZodString;
        selfKeyName: z.ZodString;
        foreignKeyName: z.ZodString;
        symmetricFieldId: z.ZodOptional<z.ZodString>;
        filterByViewId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        visibleFieldIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
    }, z.core.$strict>, z.ZodObject<{
        formatting: z.ZodObject<{
            date: z.ZodString;
            time: z.ZodEnum<typeof import("@teable/core").TimeFormatting>;
            timeZone: z.ZodString;
        }, z.core.$strip>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
            now: "now";
        }>>>;
    }, z.core.$strict>, z.ZodObject<{
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strict>, z.ZodObject<{
        showAs: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strip>>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>>;
    }, z.core.$strict>, z.ZodObject<{
        icon: z.ZodEnum<typeof import("./derivate/rating-option.schema").RatingIcon>;
        color: z.ZodEnum<{
            redBright: import("@teable/core").Colors.RedBright;
            tealBright: import("@teable/core").Colors.TealBright;
            yellowBright: import("@teable/core").Colors.YellowBright;
        }>;
        max: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        isMultiple: z.ZodOptional<z.ZodBoolean>;
        shouldNotify: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodUnion<[z.ZodString, z.ZodEnum<{
            me: "me";
        }>]>, z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodEnum<{
            me: "me";
        }>]>>]>>>;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strict>, z.ZodObject<{
        trackedFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>, z.ZodObject<{
        label: z.ZodString;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        maxCount: z.ZodOptional<z.ZodNumber>;
        resetCount: z.ZodOptional<z.ZodBoolean>;
        workflow: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            isActive: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        confirm: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            confirmText: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strict>, z.ZodObject<{
        prompt: z.ZodOptional<z.ZodString>;
        sourceFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>]>, z.ZodObject<{
        expression: z.ZodEnum<{
            "countall({values})": "countall({values})";
            "counta({values})": "counta({values})";
            "count({values})": "count({values})";
            "sum({values})": "sum({values})";
            "average({values})": "average({values})";
            "max({values})": "max({values})";
            "min({values})": "min({values})";
            "and({values})": "and({values})";
            "or({values})": "or({values})";
            "xor({values})": "xor({values})";
            "array_join({values})": "array_join({values})";
            "array_unique({values})": "array_unique({values})";
            "array_compact({values})": "array_compact({values})";
            "concatenate({values})": "concatenate({values})";
        }>;
        timeZone: z.ZodOptional<z.ZodString>;
        formatting: z.ZodOptional<z.ZodAny>;
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
        baseId: z.ZodOptional<z.ZodString>;
        foreignTableId: z.ZodOptional<z.ZodString>;
        lookupFieldId: z.ZodOptional<z.ZodString>;
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
        sort: z.ZodOptional<z.ZodObject<{
            fieldId: z.ZodString;
            order: z.ZodEnum<typeof import("@teable/core").SortFunc>;
        }, z.core.$strip>>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("@teable/core").IFilterSet, unknown, z.core.$ZodTypeInternals<import("@teable/core").IFilterSet, unknown>>>>;
        baseId: z.ZodOptional<z.ZodString>;
        foreignTableId: z.ZodString;
        relationship: z.ZodEnum<typeof import("./constant").Relationship>;
        isOneWay: z.ZodOptional<z.ZodBoolean>;
        filterByViewId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        visibleFieldIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        lookupFieldId: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        choices: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>>;
        preventAutoNewOptions: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>, z.ZodObject<{
        formatting: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            precision: z.ZodNumber;
            type: z.ZodLiteral<import("@teable/core").NumberFormattingType.Decimal>;
        }, z.core.$strict>, z.ZodObject<{
            precision: z.ZodNumber;
            type: z.ZodLiteral<import("@teable/core").NumberFormattingType.Percent>;
        }, z.core.$strict>, z.ZodObject<{
            precision: z.ZodNumber;
            type: z.ZodLiteral<import("@teable/core").NumberFormattingType.Currency>;
            symbol: z.ZodString;
        }, z.core.$strict>], "type">>;
        showAs: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>>>;
        defaultValue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strict>, z.ZodObject<{
        formatting: z.ZodObject<{
            date: z.ZodString;
            time: z.ZodEnum<typeof import("@teable/core").TimeFormatting>;
            timeZone: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodObject<{
        expression: z.ZodDefault<z.ZodLiteral<"LAST_MODIFIED_TIME()">>;
        formatting: z.ZodOptional<z.ZodObject<{
            date: z.ZodString;
            time: z.ZodEnum<typeof import("@teable/core").TimeFormatting>;
            timeZone: z.ZodString;
        }, z.core.$strip>>;
        trackedFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$loose>, z.ZodObject<{
        showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
        }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
            showValue: z.ZodBoolean;
            maxValue: z.ZodNumber;
        }, z.core.$strict>, z.ZodObject<{
            type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
            color: z.ZodEnum<typeof import("@teable/core").Colors>;
        }, z.core.$strict>]>]>>;
        formatting: z.ZodOptional<z.ZodAny>;
    }, z.core.$strict>]>>;
    aiConfig: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Extraction>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Summary>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Translation>;
        sourceFieldId: z.ZodString;
        targetLanguage: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Improvement>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Classification>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
        onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Tag>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
        onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        n: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodString>;
        quality: z.ZodOptional<z.ZodEnum<typeof import("./ai-config").ImageQuality>>;
        aspectRatio: z.ZodOptional<z.ZodString>;
        resolution: z.ZodOptional<z.ZodEnum<{
            "1K": "1K";
            "2K": "2K";
            "4K": "4K";
        }>>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.ImageGeneration>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        n: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodString>;
        quality: z.ZodOptional<z.ZodEnum<typeof import("./ai-config").ImageQuality>>;
        aspectRatio: z.ZodOptional<z.ZodString>;
        resolution: z.ZodOptional<z.ZodEnum<{
            "1K": "1K";
            "2K": "2K";
            "4K": "4K";
        }>>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.ImageCustomization>;
        prompt: z.ZodString;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Rating>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
    }, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Extraction>;
        sourceFieldId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        modelKey: z.ZodString;
        isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        attachPrompt: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<import("./ai-config").FieldAIActionType.Customization>;
        prompt: z.ZodString;
    }, z.core.$strip>], "type">]>>>;
    id: z.ZodOptional<z.ZodString>;
    viewId: z.ZodOptional<z.ZodString>;
    order: z.ZodOptional<z.ZodObject<{
        viewId: z.ZodString;
        orderIndex: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const updateFieldRoSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodString>>>>;
    dbFieldName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type IFieldRo = z.infer<typeof createFieldRoSchema>;
export type IConvertFieldRo = z.infer<typeof convertFieldRoSchema>;
export type IUpdateFieldRo = z.infer<typeof updateFieldRoSchema>;
export declare const getFieldsQuerySchema: z.ZodObject<{
    viewId: z.ZodOptional<z.ZodString>;
    filterHidden: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    projection: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type IGetFieldsQuery = z.infer<typeof getFieldsQuerySchema>;
