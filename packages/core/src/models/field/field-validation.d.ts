import type { FieldType } from './constant';
export declare const checkFieldValidationEnabled: (fieldType: FieldType, isLookup: boolean | null | undefined) => boolean;
export declare const checkFieldUniqueValidationEnabled: (fieldType: FieldType, isLookup: boolean | null | undefined) => boolean;
export declare const checkFieldNotNullValidationEnabled: (fieldType: FieldType, isLookup: boolean | null | undefined) => boolean;
