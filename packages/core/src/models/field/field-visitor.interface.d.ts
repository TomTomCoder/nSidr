import type { AiFieldCore } from './derivate/ai.field';
import type { AttachmentFieldCore } from './derivate/attachment.field';
import type { AutoNumberFieldCore } from './derivate/auto-number.field';
import type { ButtonFieldCore } from './derivate/button.field';
import type { CheckboxFieldCore } from './derivate/checkbox.field';
import type { ConditionalRollupFieldCore } from './derivate/conditional-rollup.field';
import type { CreatedByFieldCore } from './derivate/created-by.field';
import type { CreatedTimeFieldCore } from './derivate/created-time.field';
import type { DateFieldCore } from './derivate/date.field';
import type { FormulaFieldCore } from './derivate/formula.field';
import type { LastModifiedByFieldCore } from './derivate/last-modified-by.field';
import type { LastModifiedTimeFieldCore } from './derivate/last-modified-time.field';
import type { LinkFieldCore } from './derivate/link.field';
import type { LongTextFieldCore } from './derivate/long-text.field';
import type { MultipleSelectFieldCore } from './derivate/multiple-select.field';
import type { NumberFieldCore } from './derivate/number.field';
import type { RatingFieldCore } from './derivate/rating.field';
import type { RollupFieldCore } from './derivate/rollup.field';
import type { SingleLineTextFieldCore } from './derivate/single-line-text.field';
import type { SingleSelectFieldCore } from './derivate/single-select.field';
import type { UserFieldCore } from './derivate/user.field';
/**
 * Visitor interface for field types using the Visitor pattern.
 * This interface defines methods for visiting all concrete field types.
 *
 */
export interface IFieldVisitor<T = unknown> {
    visitNumberField(field: NumberFieldCore): T;
    visitSingleLineTextField(field: SingleLineTextFieldCore): T;
    visitLongTextField(field: LongTextFieldCore): T;
    visitAttachmentField(field: AttachmentFieldCore): T;
    visitCheckboxField(field: CheckboxFieldCore): T;
    visitDateField(field: DateFieldCore): T;
    visitRatingField(field: RatingFieldCore): T;
    visitAutoNumberField(field: AutoNumberFieldCore): T;
    visitLinkField(field: LinkFieldCore): T;
    visitRollupField(field: RollupFieldCore): T;
    visitConditionalRollupField(field: ConditionalRollupFieldCore): T;
    visitSingleSelectField(field: SingleSelectFieldCore): T;
    visitMultipleSelectField(field: MultipleSelectFieldCore): T;
    visitFormulaField(field: FormulaFieldCore): T;
    visitCreatedTimeField(field: CreatedTimeFieldCore): T;
    visitLastModifiedTimeField(field: LastModifiedTimeFieldCore): T;
    visitUserField(field: UserFieldCore): T;
    visitCreatedByField(field: CreatedByFieldCore): T;
    visitLastModifiedByField(field: LastModifiedByFieldCore): T;
    visitButtonField(field: ButtonFieldCore): T;
    visitAiField(field: AiFieldCore): T;
}
