import { z } from 'zod';
import { Colors } from '../colors';
import type { CellValueType, FieldType } from '../constant';
import { FieldCore } from '../field';
import type { IFieldVisitor } from '../field-visitor.interface';
import type { IRatingFieldOptions } from './rating-option.schema';
import { RatingIcon } from './rating-option.schema';
export declare class RatingFieldCore extends FieldCore {
    type: FieldType.Rating;
    options: IRatingFieldOptions;
    meta?: undefined;
    cellValueType: CellValueType.Number;
    static defaultOptions(): IRatingFieldOptions;
    cellValue2String(cellValue?: unknown): string;
    item2String(value?: unknown): string;
    convertStringToCellValue(value: string): number | null;
    repair(value: unknown): number | null;
    validateOptions(): z.ZodSafeParseResult<{
        icon: RatingIcon;
        color: Colors.RedBright | Colors.TealBright | Colors.YellowBright;
        max: number;
    }>;
    validateCellValue(value: unknown): z.ZodSafeParseResult<number | null> | z.ZodSafeParseResult<number[] | null>;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
