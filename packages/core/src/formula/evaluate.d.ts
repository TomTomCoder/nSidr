import type { FieldCore } from '../models/field/field';
import type { IRecord } from '../models/record';
import type { TypedValue } from './typed-value';
export declare const evaluate: (input: string, dependFieldMap: {
    [fieldId: string]: FieldCore;
}, record?: IRecord, timeZone?: string) => TypedValue;
