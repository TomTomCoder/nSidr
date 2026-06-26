import type { FormulaFunc } from './functions/common';
import { TypedValue } from './typed-value';
export declare class TypedValueConverter {
    transformMultipleValue(typedValue: TypedValue, func: FormulaFunc): TypedValue;
    convertTypedValue(typedValue: TypedValue, func: FormulaFunc): TypedValue;
    private convertUnsupportedValue;
    private convertDatetimeValue;
    private convertBooleanValue;
    private convertNumberValue;
    private convertStringValue;
}
