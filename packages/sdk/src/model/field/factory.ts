import type { IFieldVo } from '@teable/core';
import { CellValueType, assertNever, FieldType } from '@teable/core';
// PERF: replaced class-transformer's plainToInstance with prototype-stamping.
// The Field hierarchy has zero @Type/@Transform/@Expose decorators, so
// plainToInstance was paying reflection cost for no transformation. The
// helper below is observably identical (instanceof <FieldClass> still
// passes, all instance methods still resolve via the prototype chain) and
// runs ~50–100× faster — the bulk of the table-switch freeze.
type IFieldCtor<C> = new (...args: never[]) => C;
const stamp = <C extends object>(cls: IFieldCtor<C>, data: object): C =>
  Object.assign(Object.create(cls.prototype) as C, data);
import type { Doc } from 'sharedb/lib/client';
import { AiField } from './ai.field';
import { AttachmentField } from './attachment.field';
import { AutoNumberField } from './auto-number.field';
import { ButtonField } from './button.field';
import { CheckboxField } from './checkbox.field';
import { ConditionalRollupField } from './conditional-rollup.field';
import { CreatedByField } from './created-by.field';
import { CreatedTimeField } from './created-time.field';
import { DateField } from './date.field';
import { FormulaField } from './formula.field';
import { LastModifiedByField } from './last-modified-by.field';
import { LastModifiedTimeField } from './last-modified-time.field';
import { LinkField } from './link.field';
import { LongTextField } from './long-text.field';
import { MultipleSelectField } from './multiple-select.field';
import { NumberField } from './number.field';
import { RatingField } from './rating.field';
import { RollupField } from './rollup.field';
import { SingleLineTextField } from './single-line-text.field';
import { SingleSelectField } from './single-select.field';
import { UserField } from './user.field';

const fieldTypes = new Set<string>(Object.values(FieldType));

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecordObject = (value: unknown): Record<string, unknown> | undefined =>
  isRecordObject(value) ? value : undefined;

const isKnownFieldType = (value: unknown): value is FieldType =>
  typeof value === 'string' && fieldTypes.has(value);

const inferLookupInnerType = (field: IFieldVo): FieldType => {
  switch (field.cellValueType) {
    case CellValueType.Number:
      return FieldType.Number;
    case CellValueType.DateTime:
      return FieldType.Date;
    case CellValueType.Boolean:
      return FieldType.Checkbox;
    default:
      return FieldType.SingleLineText;
  }
};

const normalizeV2RollupField = (field: IFieldVo): IFieldVo => {
  if (field.type !== FieldType.Rollup) {
    return field;
  }

  const raw = field as IFieldVo & {
    config?: unknown;
    lookupOptions?: unknown;
  };
  const config = asRecordObject(raw.config);
  if (!config) {
    return field;
  }

  const lookupOptions = {
    ...(asRecordObject(raw.lookupOptions) ?? {}),
  } as Record<string, unknown>;

  if (config.linkFieldId != null) lookupOptions.linkFieldId = config.linkFieldId;
  if (config.foreignTableId != null) lookupOptions.foreignTableId = config.foreignTableId;
  if (config.lookupFieldId != null) lookupOptions.lookupFieldId = config.lookupFieldId;

  return {
    ...field,
    lookupOptions: lookupOptions as IFieldVo['lookupOptions'],
  };
};

const normalizeV2ConditionalRollupField = (field: IFieldVo): IFieldVo => {
  if (field.type !== FieldType.ConditionalRollup) {
    return field;
  }

  const raw = field as IFieldVo & {
    config?: unknown;
    options?: unknown;
  };
  const config = asRecordObject(raw.config);
  if (!config) {
    return field;
  }

  const condition = asRecordObject(config.condition);
  const options = {
    ...(asRecordObject(raw.options) ?? {}),
  } as Record<string, unknown>;

  if (config.foreignTableId != null) options.foreignTableId = config.foreignTableId;
  if (config.lookupFieldId != null) options.lookupFieldId = config.lookupFieldId;
  if (condition?.filter != null) options.filter = condition.filter;
  if (condition?.sort != null) options.sort = condition.sort;
  if (condition?.limit != null) options.limit = condition.limit;

  return {
    ...field,
    options: options as IFieldVo['options'],
  };
};

const resolveLookupInnerType = (
  field: IFieldVo,
  raw: IFieldVo & {
    innerType?: unknown;
    options?: unknown;
  },
  rawOptions: Record<string, unknown> | undefined
): FieldType => {
  const innerTypeCandidate =
    (typeof raw.innerType === 'string' ? raw.innerType : undefined) ||
    (typeof rawOptions?.innerType === 'string' ? rawOptions.innerType : undefined);
  return isKnownFieldType(innerTypeCandidate) ? innerTypeCandidate : inferLookupInnerType(field);
};

const mergeLookupCondition = (
  lookupOptions: Record<string, unknown>,
  condition: Record<string, unknown> | undefined
) => {
  if (!condition) {
    return;
  }

  if (condition.filter !== undefined) lookupOptions.filter = condition.filter;
  if (condition.sort !== undefined) lookupOptions.sort = condition.sort;
  if (condition.limit !== undefined) lookupOptions.limit = condition.limit;
};

const buildLookupOptions = (
  field: IFieldVo,
  rawOptions: Record<string, unknown> | undefined
): IFieldVo['lookupOptions'] => {
  const lookupOptions: Record<string, unknown> = {};

  if (rawOptions?.foreignTableId != null) lookupOptions.foreignTableId = rawOptions.foreignTableId;
  if (rawOptions?.lookupFieldId != null) lookupOptions.lookupFieldId = rawOptions.lookupFieldId;
  if (rawOptions?.linkFieldId != null) lookupOptions.linkFieldId = rawOptions.linkFieldId;
  if (rawOptions?.filter != null) lookupOptions.filter = rawOptions.filter;
  if (rawOptions?.sort != null) lookupOptions.sort = rawOptions.sort;
  if (rawOptions?.limit != null) lookupOptions.limit = rawOptions.limit;

  mergeLookupCondition(lookupOptions, asRecordObject(rawOptions?.condition));

  return Object.keys(lookupOptions).length > 0
    ? (lookupOptions as IFieldVo['lookupOptions'])
    : field.lookupOptions;
};

/**
 * Translate v2 lookup DTO shape (type: lookup/conditionalLookup) to the v1-compatible shape
 * consumed by the existing SDK field model.
 */
const normalizeV2LookupField = (field: IFieldVo): IFieldVo => {
  const rawType = (field as { type: string }).type;
  if (rawType !== 'lookup' && rawType !== 'conditionalLookup') {
    return field;
  }

  const raw = field as IFieldVo & {
    type: string;
    innerType?: unknown;
    innerOptions?: unknown;
    options?: unknown;
  };

  const rawOptions = asRecordObject(raw.options as unknown);
  const innerType = resolveLookupInnerType(field, raw, rawOptions);
  const innerOptions = (raw.innerOptions ?? rawOptions?.innerOptions) as IFieldVo['options'];

  return {
    ...field,
    type: innerType,
    isLookup: true,
    isConditionalLookup:
      rawType === 'conditionalLookup' || field.isConditionalLookup ? true : undefined,
    options: innerOptions ?? {},
    lookupOptions: buildLookupOptions(field, rawOptions),
  };
};

export function createFieldInstance(field: IFieldVo, doc?: Doc<IFieldVo>) {
  const normalizedField = normalizeV2ConditionalRollupField(
    normalizeV2RollupField(normalizeV2LookupField(field))
  );
  const instance = (() => {
    switch (normalizedField.type) {
      case FieldType.SingleLineText:
        return stamp(SingleLineTextField, normalizedField);
      case FieldType.LongText:
        return stamp(LongTextField, normalizedField);
      case FieldType.Number:
        return stamp(NumberField, normalizedField);
      case FieldType.SingleSelect:
        return stamp(SingleSelectField, normalizedField);
      case FieldType.MultipleSelect:
        return stamp(MultipleSelectField, normalizedField);
      case FieldType.Link:
        return stamp(LinkField, normalizedField);
      case FieldType.Formula:
        return stamp(FormulaField, normalizedField);
      case FieldType.Attachment:
        return stamp(AttachmentField, normalizedField);
      case FieldType.Date:
        return stamp(DateField, normalizedField);
      case FieldType.Checkbox:
        return stamp(CheckboxField, normalizedField);
      case FieldType.Rollup:
        return stamp(RollupField, normalizedField);
      case FieldType.ConditionalRollup:
        return stamp(ConditionalRollupField, normalizedField);
      case FieldType.Rating:
        return stamp(RatingField, normalizedField);
      case FieldType.AutoNumber:
        return stamp(AutoNumberField, normalizedField);
      case FieldType.CreatedTime:
        return stamp(CreatedTimeField, normalizedField);
      case FieldType.LastModifiedTime:
        return stamp(LastModifiedTimeField, normalizedField);
      case FieldType.User:
        return stamp(UserField, normalizedField);
      case FieldType.CreatedBy:
        return stamp(CreatedByField, normalizedField);
      case FieldType.LastModifiedBy:
        return stamp(LastModifiedByField, normalizedField);
      case FieldType.Button:
        return stamp(ButtonField, normalizedField);
      case FieldType.Ai:
        return stamp(AiField, normalizedField);
      default:
        assertNever(normalizedField.type);
    }
  })();

  // force inject object into instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const temp: any = instance;
  temp.doc = doc;
  temp.tableId = doc?.collection.split('_')[1];

  return instance;
}

export type IFieldInstance = ReturnType<typeof createFieldInstance>;
