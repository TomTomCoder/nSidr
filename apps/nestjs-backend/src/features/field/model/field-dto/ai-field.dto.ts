import { AiFieldCore } from '@teable/core';
import type { FieldBase } from '../field-base';

export class AiFieldDto extends AiFieldCore implements FieldBase {
  get isStructuredCellValue(): boolean {
    return false;
  }

  convertCellValue2DBValue(value: unknown): unknown {
    return value == null ? null : String(value);
  }

  convertDBValue2CellValue(value: unknown): unknown {
    return value == null ? null : String(value);
  }
}
