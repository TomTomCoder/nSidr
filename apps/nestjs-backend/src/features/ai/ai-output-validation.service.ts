import { Injectable, Logger } from '@nestjs/common';
import { FieldType, getAiOutputSchema } from '@teable/core';

/**
 * AI output validation service (per D-16-01).
 *
 * Pure utility (no IO, no DI dependencies). Validates raw LLM output against
 * the per-FieldType OUTPUT Zod schema. Provides helpers for retry-prompt
 * augmentation and per-type example hints.
 *
 * Used by AiService.generateForField as the GREEN-path validator after a
 * generateText() call. When the configured provider supports structured output
 * (generateObject), validation is enforced at sampling time and this service
 * is bypassed.
 */
@Injectable()
export class AiOutputValidationService {
  private readonly logger = new Logger(AiOutputValidationService.name);

  /**
   * Validate (and lightly repair) raw LLM text against the field's OUTPUT schema.
   * - Strips ```json / ``` code-fence wrappers, trims whitespace.
   * - JSON.parses when the schema expects an object / array.
   * - Coerces numeric strings to numbers for Rating fields.
   * - Coerces ISO/epoch-numeric strings for Date fields.
   */
  validateAndRepair(
    field: { type: FieldType; options?: { choices?: { name: string }[]; max?: number } | null },
    rawText: string
  ): { ok: true; value: unknown } | { ok: false; error: string } {
    const schema = getAiOutputSchema(field);
    const coerced = this.coerce(rawText, field);
    const parsed = schema.safeParse(coerced);
    if (parsed.success) {
      return { ok: true, value: parsed.data };
    }
    return { ok: false, error: parsed.error.message };
  }

  /**
   * Build an augmented retry prompt that quotes the original prompt with a
   * leading instruction containing the prior validation error + a concrete
   * example of valid output for the field type.
   */
  buildRetryPrompt(
    originalPrompt: string,
    field: { type: FieldType; options?: { choices?: { name: string }[]; max?: number } | null },
    zodErrorMsg: string
  ): string {
    const example = this.exampleFor(field);
    return (
      `Previous output failed validation: ${zodErrorMsg}. ` +
      `Output must match the schema exactly. Example valid output: ${example}.\n\n` +
      originalPrompt
    );
  }

  /**
   * Hand-coded valid example per FieldType — embedded in the retry prompt so
   * the LLM has a concrete target shape.
   */
  exampleFor(field: {
    type: FieldType;
    options?: { choices?: { name: string }[]; max?: number } | null;
  }): string {
    switch (field.type) {
      case FieldType.SingleSelect: {
        const first = field.options?.choices?.[0]?.name;
        return first ? JSON.stringify(first) : '"category-name"';
      }
      case FieldType.MultipleSelect: {
        const first = field.options?.choices?.[0]?.name;
        return first ? JSON.stringify([first]) : '["category-a","category-b"]';
      }
      case FieldType.Rating: {
        const max = field.options?.max ?? 5;
        return String(Math.min(3, max));
      }
      case FieldType.Date:
        return '"2026-01-01T00:00:00Z"';
      case FieldType.Attachment:
        return '[]';
      default:
        return '"a plain text string"';
    }
  }

  /**
   * Lightweight repair before Zod parse:
   * - strip Markdown code fences
   * - trim whitespace
   * - JSON.parse when schema expects array/object
   * - coerce numeric strings for Rating
   * - coerce epoch-ms numeric strings for Date when applicable
   *
   * Repair is intentionally CONSERVATIVE — anything ambiguous is left for the
   * schema to reject so the retry path can augment the prompt.
   */
  private coerce(
    rawText: string,
    field: { type: FieldType; options?: { choices?: { name: string }[]; max?: number } | null }
  ): unknown {
    const stripped = this.stripFences(rawText).trim();

    switch (field.type) {
      case FieldType.MultipleSelect:
      case FieldType.Attachment:
        return this.tryJsonParse(stripped);
      case FieldType.Rating: {
        const n = Number(stripped);
        if (Number.isFinite(n)) return n;
        return stripped;
      }
      case FieldType.Date: {
        // Try epoch-ms numeric first; fall through to ISO string parse.
        if (/^\d+$/.test(stripped)) {
          const n = Number(stripped);
          if (Number.isFinite(n)) return n;
        }
        return stripped;
      }
      case FieldType.SingleSelect:
      default:
        return stripped;
    }
  }

  /** Public — reused by other generateText-fallback call sites (e.g. WorkflowAiService) that
   * need the same "model wrapped its JSON in a markdown fence" tolerance without going through
   * the FieldType-specific `coerce`/`validateAndRepair` pipeline above. */
  stripFences(text: string): string {
    // Match optional ```json (or ```) ... ``` wrapper and strip the wrapper.
    const fence = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/m;
    const m = text.trim().match(fence);
    return m ? m[1] : text;
  }

  /** Public for the same reason as stripFences above. */
  tryJsonParse(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
