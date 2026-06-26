import { FieldType } from './constant';
export declare function safeParseOptions(fieldType: FieldType, value: unknown): import("zod").ZodSafeParseSuccess<{
    prompt?: string | undefined;
    sourceFieldIds?: string[] | undefined;
}> | import("zod").ZodSafeParseError<{
    prompt?: string | undefined;
    sourceFieldIds?: string[] | undefined;
}> | import("zod").ZodSafeParseSuccess<Record<string, never>> | import("zod").ZodSafeParseError<Record<string, never>> | import("zod").ZodSafeParseSuccess<{
    defaultValue?: boolean | null | undefined;
}> | import("zod").ZodSafeParseError<{
    defaultValue?: boolean | null | undefined;
}> | import("zod").ZodSafeParseSuccess<{
    showAs?: {
        type: import("@teable/core").SingleLineTextDisplayType;
    } | undefined;
    defaultValue?: string | null | undefined;
}> | import("zod").ZodSafeParseError<{
    showAs?: {
        type: import("@teable/core").SingleLineTextDisplayType;
    } | undefined;
    defaultValue?: string | null | undefined;
}> | import("zod").ZodSafeParseSuccess<{
    label: string;
    color: import("@teable/core").Colors;
    maxCount?: number | undefined;
    resetCount?: boolean | undefined;
    workflow?: {
        id?: string | undefined;
        name?: string | undefined;
        isActive?: boolean | undefined;
    } | null | undefined;
    confirm?: {
        title?: string | undefined;
        description?: string | undefined;
        confirmText?: string | undefined;
    } | null | undefined;
}> | import("zod").ZodSafeParseError<{
    label: string;
    color: import("@teable/core").Colors;
    maxCount?: number | undefined;
    resetCount?: boolean | undefined;
    workflow?: {
        id?: string | undefined;
        name?: string | undefined;
        isActive?: boolean | undefined;
    } | null | undefined;
    confirm?: {
        title?: string | undefined;
        description?: string | undefined;
        confirmText?: string | undefined;
    } | null | undefined;
}> | import("zod").ZodSafeParseSuccess<{
    trackedFieldIds?: string[] | undefined;
}> | import("zod").ZodSafeParseError<{
    trackedFieldIds?: string[] | undefined;
}> | import("zod").ZodSafeParseSuccess<{
    relationship: import("./constant").Relationship;
    foreignTableId: string;
    lookupFieldId: string;
    fkHostTableName: string;
    selfKeyName: string;
    foreignKeyName: string;
    baseId?: string | undefined;
    isOneWay?: boolean | undefined;
    symmetricFieldId?: string | undefined;
    filterByViewId?: string | null | undefined;
    visibleFieldIds?: string[] | null | undefined;
    filter?: import("@teable/core").IFilterSet | null | undefined;
}> | import("zod").ZodSafeParseError<{
    relationship: import("./constant").Relationship;
    foreignTableId: string;
    lookupFieldId: string;
    fkHostTableName: string;
    selfKeyName: string;
    foreignKeyName: string;
    baseId?: string | undefined;
    isOneWay?: boolean | undefined;
    symmetricFieldId?: string | undefined;
    filterByViewId?: string | null | undefined;
    visibleFieldIds?: string[] | null | undefined;
    filter?: import("@teable/core").IFilterSet | null | undefined;
}> | import("zod").ZodSafeParseSuccess<{
    showAs?: {
        type: "markdown";
    } | null | undefined;
    defaultValue?: string | null | undefined;
}> | import("zod").ZodSafeParseError<{
    showAs?: {
        type: "markdown";
    } | null | undefined;
    defaultValue?: string | null | undefined;
}> | import("zod").ZodSafeParseSuccess<{
    icon: import("./derivate/rating-option.schema").RatingIcon;
    color: import("@teable/core").Colors.RedBright | import("@teable/core").Colors.TealBright | import("@teable/core").Colors.YellowBright;
    max: number;
}> | import("zod").ZodSafeParseError<{
    icon: import("./derivate/rating-option.schema").RatingIcon;
    color: import("@teable/core").Colors.RedBright | import("@teable/core").Colors.TealBright | import("@teable/core").Colors.YellowBright;
    max: number;
}> | import("zod").ZodSafeParseSuccess<{
    isMultiple?: boolean | undefined;
    shouldNotify?: boolean | undefined;
    defaultValue?: string | string[] | null | undefined;
}> | import("zod").ZodSafeParseError<{
    isMultiple?: boolean | undefined;
    shouldNotify?: boolean | undefined;
    defaultValue?: string | string[] | null | undefined;
}> | import("zod").ZodSafeParseSuccess<{
    formatting: {
        date: string;
        time: import("@teable/core").TimeFormatting;
        timeZone: string;
    };
    defaultValue?: "now" | null | undefined;
}> | import("zod").ZodSafeParseError<{
    formatting: {
        date: string;
        time: import("@teable/core").TimeFormatting;
        timeZone: string;
    };
    defaultValue?: "now" | null | undefined;
}> | import("zod").ZodSafeParseSuccess<{
    formatting: {
        precision: number;
        type: import("@teable/core").NumberFormattingType.Decimal;
    } | {
        precision: number;
        type: import("@teable/core").NumberFormattingType.Percent;
    } | {
        precision: number;
        type: import("@teable/core").NumberFormattingType.Currency;
        symbol: string;
    };
    showAs?: {
        type: import("@teable/core").SingleNumberDisplayType;
        color: import("@teable/core").Colors;
        showValue: boolean;
        maxValue: number;
    } | {
        type: import("@teable/core").MultiNumberDisplayType;
        color: import("@teable/core").Colors;
    } | undefined;
    defaultValue?: number | null | undefined;
}> | import("zod").ZodSafeParseError<{
    formatting: {
        precision: number;
        type: import("@teable/core").NumberFormattingType.Decimal;
    } | {
        precision: number;
        type: import("@teable/core").NumberFormattingType.Percent;
    } | {
        precision: number;
        type: import("@teable/core").NumberFormattingType.Currency;
        symbol: string;
    };
    showAs?: {
        type: import("@teable/core").SingleNumberDisplayType;
        color: import("@teable/core").Colors;
        showValue: boolean;
        maxValue: number;
    } | {
        type: import("@teable/core").MultiNumberDisplayType;
        color: import("@teable/core").Colors;
    } | undefined;
    defaultValue?: number | null | undefined;
}> | import("zod").ZodSafeParseSuccess<{
    choices: {
        id: string;
        name: string;
        color: string;
    }[];
    defaultValue?: string | string[] | null | undefined;
    preventAutoNewOptions?: boolean | undefined;
}> | import("zod").ZodSafeParseError<{
    choices: {
        id: string;
        name: string;
        color: string;
    }[];
    defaultValue?: string | string[] | null | undefined;
    preventAutoNewOptions?: boolean | undefined;
}> | import("zod").ZodSafeParseSuccess<{
    expression: string;
    timeZone?: string | undefined;
    formatting?: any;
    showAs?: {
        type: import("@teable/core").SingleLineTextDisplayType;
    } | {
        type: import("@teable/core").SingleNumberDisplayType;
        color: import("@teable/core").Colors;
        showValue: boolean;
        maxValue: number;
    } | {
        type: import("@teable/core").MultiNumberDisplayType;
        color: import("@teable/core").Colors;
    } | undefined;
}> | import("zod").ZodSafeParseError<{
    expression: string;
    timeZone?: string | undefined;
    formatting?: any;
    showAs?: {
        type: import("@teable/core").SingleLineTextDisplayType;
    } | {
        type: import("@teable/core").SingleNumberDisplayType;
        color: import("@teable/core").Colors;
        showValue: boolean;
        maxValue: number;
    } | {
        type: import("@teable/core").MultiNumberDisplayType;
        color: import("@teable/core").Colors;
    } | undefined;
}> | import("zod").ZodSafeParseSuccess<{
    expression: "AUTO_NUMBER()";
}> | import("zod").ZodSafeParseError<{
    expression: "AUTO_NUMBER()";
}> | import("zod").ZodSafeParseSuccess<{
    expression: "CREATED_TIME()";
    formatting: {
        date: string;
        time: import("@teable/core").TimeFormatting;
        timeZone: string;
    };
}> | import("zod").ZodSafeParseError<{
    expression: "CREATED_TIME()";
    formatting: {
        date: string;
        time: import("@teable/core").TimeFormatting;
        timeZone: string;
    };
}>;
