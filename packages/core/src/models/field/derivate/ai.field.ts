import { z } from 'zod';
import type { FieldType } from '../constant';
import { CellValueType } from '../constant';
import type { IFieldVisitor } from '../field-visitor.interface';
import { FieldCore } from '../field';

export const aiFieldOptionsSchema = z.object({
  prompt: z.string().optional(),
  sourceFieldIds: z.array(z.string()).optional(),
});

export type IAiFieldOptions = z.infer<typeof aiFieldOptionsSchema>;

export class AiFieldCore extends FieldCore {
  type!: FieldType.Ai;

  options!: IAiFieldOptions;

  meta?: undefined;

  cellValueType!: CellValueType.String;

  cellValue2String(value: unknown): string {
    return value == null ? '' : String(value);
  }

  item2String(value: unknown): string {
    return this.cellValue2String(value);
  }

  convertStringToCellValue(value: string): string | null {
    return value == null ? null : value;
  }

  repair(value: unknown) {
    if (typeof value === 'string') return value;
    return null;
  }

  validateOptions() {
    return aiFieldOptionsSchema.safeParse(this.options);
  }

  validateCellValue(value: unknown) {
    return z.string().nullable().optional().safeParse(value);
  }

  accept<T>(visitor: IFieldVisitor<T>): T {
    return visitor.visitAiField(this);
  }
}
