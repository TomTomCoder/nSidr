import { z } from 'zod';
import type { IFieldVo } from './field.schema';
export declare const validateCellValue: (field: IFieldVo, cellValue: unknown) => z.ZodSafeParseSuccess<unknown> | z.ZodSafeParseError<unknown>;
export declare const validateDateFieldValueLoose: (cellValue: unknown, isMultipleCellValue?: boolean) => z.ZodSafeParseResult<string[] | null> | z.ZodSafeParseResult<string | null>;
