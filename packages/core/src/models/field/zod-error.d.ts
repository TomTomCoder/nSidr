import { type IFieldAIConfig } from './ai-config';
import { FieldType } from './constant';
import type { IFieldMetaVo, IFieldOptionsRo } from './field-unions.schema';
import { type ILookupOptionsRo } from './lookup-options-base.schema';
interface IFieldValidateData {
    message: string;
    path?: string[];
    i18nKey: string;
    context?: Record<string, string>;
}
interface IValidateFieldOptionProps {
    type: FieldType;
    isLookup?: boolean;
    isConditionalLookup?: boolean;
    options?: IFieldOptionsRo | null;
    aiConfig?: IFieldAIConfig | null;
    lookupOptions?: ILookupOptionsRo;
    meta?: IFieldMetaVo;
}
export declare const validateFieldOptions: (data: IValidateFieldOptionProps) => IFieldValidateData[];
export {};
