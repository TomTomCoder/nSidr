import { Injectable, Logger } from '@nestjs/common';
import { FieldService } from '../field/field.service';

@Injectable()
export class GuardrailService {
  private readonly logger = new Logger(GuardrailService.name);

  constructor(private readonly fieldService: FieldService) {}

  /**
   * Validate field values against the authoritative field schema before writing to the DB.
   * Returns { valid: true, errors: [] } when all provided field values pass validation.
   * Returns { valid: false, errors: [...] } with structured messages when any field fails.
   * Unknown fieldIds in the payload are silently skipped (the record API rejects them separately).
   * This method NEVER throws — all errors are surfaced via the return value.
   */
  async validateWrite(
    tableId: string,
    fields: Record<string, unknown>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (Object.keys(fields).length === 0) {
      return { valid: true, errors: [] };
    }

    let fieldInstances: Awaited<ReturnType<FieldService['getFieldInstances']>>;
    try {
      fieldInstances = await this.fieldService.getFieldInstances(tableId, {});
    } catch (e) {
      this.logger.warn(
        `GuardrailService: failed to load fields for table ${tableId}: ${(e as Error).message}`
      );
      // If we can't load fields, let the write pass through — the record API will validate
      return { valid: true, errors: [] };
    }

    const fieldMap = new Map(fieldInstances.map((f) => [f.id, f]));

    for (const [fieldId, value] of Object.entries(fields)) {
      const field = fieldMap.get(fieldId);
      if (!field) {
        // Unknown fieldId — silently skip (record API handles this)
        continue;
      }

      let result: ReturnType<typeof field.validateCellValueWithNotNull>;
      try {
        result = field.validateCellValueWithNotNull(value);
      } catch (e) {
        this.logger.warn(
          `GuardrailService: validation threw for field ${fieldId}: ${(e as Error).message}`
        );
        continue;
      }

      if (result && !result.success) {
        const zodMessage = result.error?.issues?.[0]?.message ?? 'Invalid value';
        errors.push(`Field '${field.name}' (${field.id}): ${zodMessage}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
