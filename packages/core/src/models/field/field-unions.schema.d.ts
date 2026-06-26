import { z } from '../../zod';
export declare const unionFieldOptions: z.ZodUnion<readonly [z.ZodObject<{
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
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
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
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
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
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
    }, z.core.$strict>]>]>>;
}, z.core.$strict>, z.ZodObject<{
    baseId: z.ZodOptional<z.ZodString>;
    relationship: z.ZodEnum<typeof import("@teable/core").Relationship>;
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
        time: z.ZodEnum<typeof import("./formatting").TimeFormatting>;
        timeZone: z.ZodString;
    }, z.core.$strip>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        now: "now";
    }>>>;
}, z.core.$strict>, z.ZodObject<{
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strict>, z.ZodObject<{}, z.core.$strict>, z.ZodObject<{
    showAs: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
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
}, z.core.$strict>]>;
export declare const commonOptionsSchema: z.ZodObject<{
    showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
    }, z.core.$strict>]>]>>;
    formatting: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>;
export declare const unionFieldOptionsVoSchema: z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodObject<{
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
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
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
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
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
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
    }, z.core.$strict>]>]>>;
}, z.core.$strict>, z.ZodObject<{
    baseId: z.ZodOptional<z.ZodString>;
    relationship: z.ZodEnum<typeof import("@teable/core").Relationship>;
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
        time: z.ZodEnum<typeof import("./formatting").TimeFormatting>;
        timeZone: z.ZodString;
    }, z.core.$strip>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        now: "now";
    }>>>;
}, z.core.$strict>, z.ZodObject<{
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strict>, z.ZodObject<{}, z.core.$strict>, z.ZodObject<{
    showAs: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
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
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
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
    relationship: z.ZodEnum<typeof import("@teable/core").Relationship>;
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
        type: z.ZodLiteral<import("./formatting").NumberFormattingType.Decimal>;
    }, z.core.$strict>, z.ZodObject<{
        precision: z.ZodNumber;
        type: z.ZodLiteral<import("./formatting").NumberFormattingType.Percent>;
    }, z.core.$strict>, z.ZodObject<{
        precision: z.ZodNumber;
        type: z.ZodLiteral<import("./formatting").NumberFormattingType.Currency>;
        symbol: z.ZodString;
    }, z.core.$strict>], "type">;
    showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
    }, z.core.$strict>]>>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strict>, z.ZodObject<{
    expression: z.ZodLiteral<"AUTO_NUMBER()">;
}, z.core.$strict>, z.ZodObject<{
    expression: z.ZodLiteral<"CREATED_TIME()">;
    formatting: z.ZodObject<{
        date: z.ZodString;
        time: z.ZodEnum<typeof import("./formatting").TimeFormatting>;
        timeZone: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strict>, z.ZodObject<{
    expression: z.ZodDefault<z.ZodLiteral<"LAST_MODIFIED_TIME()">>;
    formatting: z.ZodOptional<z.ZodObject<{
        date: z.ZodString;
        time: z.ZodEnum<typeof import("./formatting").TimeFormatting>;
        timeZone: z.ZodString;
    }, z.core.$strip>>;
    trackedFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$loose>]>;
export declare const unionFieldOptionsRoSchema: z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodObject<{
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
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
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
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
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
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
    }, z.core.$strict>]>]>>;
}, z.core.$strict>, z.ZodObject<{
    baseId: z.ZodOptional<z.ZodString>;
    relationship: z.ZodEnum<typeof import("@teable/core").Relationship>;
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
        time: z.ZodEnum<typeof import("./formatting").TimeFormatting>;
        timeZone: z.ZodString;
    }, z.core.$strip>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        now: "now";
    }>>>;
}, z.core.$strict>, z.ZodObject<{
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strict>, z.ZodObject<{}, z.core.$strict>, z.ZodObject<{
    showAs: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
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
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
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
    relationship: z.ZodEnum<typeof import("@teable/core").Relationship>;
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
        type: z.ZodLiteral<import("./formatting").NumberFormattingType.Decimal>;
    }, z.core.$strict>, z.ZodObject<{
        precision: z.ZodNumber;
        type: z.ZodLiteral<import("./formatting").NumberFormattingType.Percent>;
    }, z.core.$strict>, z.ZodObject<{
        precision: z.ZodNumber;
        type: z.ZodLiteral<import("./formatting").NumberFormattingType.Currency>;
        symbol: z.ZodString;
    }, z.core.$strict>], "type">>;
    showAs: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
    }, z.core.$strict>]>>>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strict>, z.ZodObject<{}, z.core.$strict>, z.ZodObject<{
    formatting: z.ZodObject<{
        date: z.ZodString;
        time: z.ZodEnum<typeof import("./formatting").TimeFormatting>;
        timeZone: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strict>, z.ZodObject<{
    expression: z.ZodDefault<z.ZodLiteral<"LAST_MODIFIED_TIME()">>;
    formatting: z.ZodOptional<z.ZodObject<{
        date: z.ZodString;
        time: z.ZodEnum<typeof import("./formatting").TimeFormatting>;
        timeZone: z.ZodString;
    }, z.core.$strip>>;
    trackedFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$loose>, z.ZodObject<{
    showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("./show-as").MultiNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
    }, z.core.$strict>]>]>>;
    formatting: z.ZodOptional<z.ZodAny>;
}, z.core.$strict>]>;
export declare const unionFieldMetaVoSchema: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
    persistedAsGeneratedColumn: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>, z.ZodObject<{
    hasOrderColumn: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>]>>;
export type IFieldOptionsRo = z.infer<typeof unionFieldOptionsRoSchema>;
export type IFieldOptionsVo = z.infer<typeof unionFieldOptionsVoSchema>;
export type IFieldMetaVo = z.infer<typeof unionFieldMetaVoSchema>;
