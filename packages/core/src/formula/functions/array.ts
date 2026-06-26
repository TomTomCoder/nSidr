import { isNumber, isString } from 'lodash';
import { CellValueType } from '../../models/field/constant';
import type { TypedValue } from '../typed-value';
import { FormulaFunc, FormulaFuncType, FunctionName } from './common';
import { convertValueToString } from './text';

abstract class ArrayFunc extends FormulaFunc {
  readonly type = FormulaFuncType.Array;
}

type IUnionType = string | number | boolean | null | IUnionType[];

const countCalculator = (
  params: TypedValue<IUnionType>[],
  calcFn: (v: IUnionType) => boolean
): number => {
  return params.reduce((result, param) => {
    if (param.isMultiple) {
      if (!Array.isArray(param.value) || param.value === null) {
        return calcFn(param.value) ? result + 1 : result;
      }
      result += param.value.reduce((pre: number, v: IUnionType) => {
        if (!Array.isArray(v)) {
          return calcFn(v) ? pre + 1 : pre;
        }
        pre += v.filter(calcFn).length;
        return pre;
      }, 0);
      return result;
    }

    return calcFn(param.value) ? result + 1 : result;
  }, 0);
};

const flatten = (arr: IUnionType[]) => {
  let result: IUnionType[] = [];

  for (const item of arr) {
    if (item !== null) {
      if (Array.isArray(item)) {
        result = result.concat(flatten(item));
      } else {
        result.push(item);
      }
    }
  }
  return result;
};

const flattenParams = (params: TypedValue<IUnionType>[]) => {
  return params.reduce((prev: IUnionType[], item) => {
    const value = item.value;
    if (value == null) return prev;
    return prev.concat(Array.isArray(value) ? flatten(value) : value);
  }, []);
};

const getUnionReturnType = (params: TypedValue[]) => {
  if (!params?.length) return { type: CellValueType.String, isMultiple: true };

  const firstCellValueType = params[0].type;
  const isAllSameType = params.every((param) => param.type === firstCellValueType);

  return {
    type: isAllSameType ? firstCellValueType : CellValueType.String,
    isMultiple: true,
  };
};

export class CountAll extends ArrayFunc {
  name = FunctionName.CountAll;

  acceptValueType = new Set([
    CellValueType.Boolean,
    CellValueType.DateTime,
    CellValueType.Number,
    CellValueType.String,
  ]);

  acceptMultipleValue = true;

  validateParams(params: TypedValue[]) {
    if (params.length !== 1) {
      throw new Error(`${FunctionName.CountAll} needs 1 param`);
    }
  }

  getReturnType(params: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<IUnionType>[]): number {
    if (params[0].value == null) {
      return 0;
    }
    if (Array.isArray(params[0].value)) {
      return params[0].value.length;
    }
    return 1;
  }
}

export class CountA extends ArrayFunc {
  name = FunctionName.CountA;

  acceptValueType = new Set([
    CellValueType.Boolean,
    CellValueType.DateTime,
    CellValueType.Number,
    CellValueType.String,
  ]);

  acceptMultipleValue = true;

  validateParams(params: TypedValue[]) {
    if (params.length < 1) {
      throw new Error(`${FunctionName.CountA} needs at least 1 param`);
    }
  }

  getReturnType(params: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<IUnionType>[]): number {
    return countCalculator(params, (v) => isNumber(v) || (isString(v) && v !== ''));
  }
}

export class Count extends ArrayFunc {
  name = FunctionName.Count;

  acceptValueType = new Set([
    CellValueType.Boolean,
    CellValueType.DateTime,
    CellValueType.Number,
    CellValueType.String,
  ]);

  acceptMultipleValue = true;

  validateParams(params: TypedValue[]) {
    if (params.length < 1) {
      throw new Error(`${FunctionName.Count} needs at least 1 param`);
    }
  }

  getReturnType(params: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<IUnionType>[]): number {
    return countCalculator(params, isNumber);
  }
}

export class ArrayJoin extends ArrayFunc {
  name = FunctionName.ArrayJoin;

  acceptValueType = new Set([CellValueType.String]);

  acceptMultipleValue = true;

  validateParams(params: TypedValue[]) {
    if (params.length < 1) {
      throw new Error(`${FunctionName.ArrayJoin} needs at least 1 param`);
    }
  }

  getReturnType(params: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.String };
  }

  eval(params: TypedValue<string | null | (string | null)[]>[]): string | null {
    let separator = params[1]?.value;
    separator = isString(separator) ? separator : ', ';
    return convertValueToString(params[0], separator);
  }
}

export class ArrayUnique extends ArrayFunc {
  name = FunctionName.ArrayUnique;

  acceptValueType = new Set([
    CellValueType.Boolean,
    CellValueType.DateTime,
    CellValueType.Number,
    CellValueType.String,
  ]);

  acceptMultipleValue = true;

  validateParams(params: TypedValue[]) {
    if (params.length < 1) {
      throw new Error(`${FunctionName.ArrayUnique} needs at least 1 param`);
    }
  }

  getReturnType(params: TypedValue[]) {
    params && this.validateParams(params);
    return getUnionReturnType(params);
  }

  eval(params: TypedValue<IUnionType>[]): IUnionType | null {
    const flattenArray = flattenParams(params);
    const uniqueArray = [...new Set(flattenArray)];
    return uniqueArray.length ? uniqueArray : null;
  }
}

export class ArrayFlatten extends ArrayFunc {
  name = FunctionName.ArrayFlatten;

  acceptValueType = new Set([
    CellValueType.Boolean,
    CellValueType.DateTime,
    CellValueType.Number,
    CellValueType.String,
  ]);

  acceptMultipleValue = true;

  validateParams(params: TypedValue[]) {
    if (params.length < 1) {
      throw new Error(`${FunctionName.ArrayFlatten} needs at least 1 param`);
    }
  }

  getReturnType(params: TypedValue[]) {
    params && this.validateParams(params);
    return getUnionReturnType(params);
  }

  eval(params: TypedValue<IUnionType>[]): IUnionType | null {
    const flattenArray = flattenParams(params);
    return flattenArray.length ? flattenArray : null;
  }
}

export class ArrayCompact extends ArrayFunc {
  name = FunctionName.ArrayCompact;

  acceptValueType = new Set([
    CellValueType.Boolean,
    CellValueType.DateTime,
    CellValueType.Number,
    CellValueType.String,
  ]);

  acceptMultipleValue = true;

  validateParams(params: TypedValue[]) {
    if (params.length < 1) {
      throw new Error(`${FunctionName.ArrayCompact} needs at least 1 param`);
    }
  }

  getReturnType(params: TypedValue[]) {
    params && this.validateParams(params);
    return getUnionReturnType(params);
  }

  eval(params: TypedValue<IUnionType>[]): IUnionType | null {
    const flattenArray = flattenParams(params);
    const filteredArray = flattenArray.filter((v) => v !== '');
    return filteredArray.length ? filteredArray : null;
  }
}

abstract class ArrayExtFunc extends FormulaFunc {
  readonly type = FormulaFuncType.Array;
  acceptMultipleValue = true;
}

function flattenArrayParam(p: TypedValue): (string | number | boolean | null)[] {
  if (p.isMultiple && Array.isArray(p.value)) return p.value as (string | number | boolean | null)[];
  return p.value != null ? [p.value as string | number | boolean] : [];
}

export class ArraySum extends ArrayExtFunc {
  name = FunctionName.ArraySum;
  acceptValueType = new Set([CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.ArraySum} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue[]) { return flattenArrayParam(p[0]).reduce<number>((s, v) => s + (v != null ? Number(v) : 0), 0); }
}

export class ArrayAverage extends ArrayExtFunc {
  name = FunctionName.ArrayAverage;
  acceptValueType = new Set([CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.ArrayAverage} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue[]) {
    const nums = flattenArrayParam(p[0]).filter(v => v != null).map(Number);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  }
}

export class ArrayMax extends ArrayExtFunc {
  name = FunctionName.ArrayMax;
  acceptValueType = new Set([CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.ArrayMax} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue[]) {
    const nums = flattenArrayParam(p[0]).filter(v => v != null).map(Number);
    return nums.length ? Math.max(...nums) : null;
  }
}

export class ArrayMin extends ArrayExtFunc {
  name = FunctionName.ArrayMin;
  acceptValueType = new Set([CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.ArrayMin} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue[]) {
    const nums = flattenArrayParam(p[0]).filter(v => v != null).map(Number);
    return nums.length ? Math.min(...nums) : null;
  }
}

export class ArraySlice extends ArrayExtFunc {
  name = FunctionName.ArraySlice;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (p.length < 2) throw new Error(`${FunctionName.ArraySlice} needs 2+ params`); }
  getReturnType() { return { type: CellValueType.String, isMultiple: true }; }
  eval(p: TypedValue[]) {
    const arr = flattenArrayParam(p[0]);
    const start = Number(p[1].value ?? 0);
    const end = p[2]?.value != null ? Number(p[2].value) : undefined;
    return arr.slice(start, end);
  }
}

export class ArrayReverse extends ArrayExtFunc {
  name = FunctionName.ArrayReverse;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.ArrayReverse} needs 1 param`); }
  getReturnType() { return { type: CellValueType.String, isMultiple: true }; }
  eval(p: TypedValue[]) { return [...flattenArrayParam(p[0])].reverse(); }
}

export class ArrayIncludes extends ArrayExtFunc {
  name = FunctionName.ArrayIncludes;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (p.length < 2) throw new Error(`${FunctionName.ArrayIncludes} needs 2 params`); }
  getReturnType() { return { type: CellValueType.Boolean }; }
  eval(p: TypedValue[]) { return flattenArrayParam(p[0]).includes(p[1].value as string | number | null); }
}

export class ArrayCount extends ArrayExtFunc {
  name = FunctionName.ArrayCount;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (p.length < 2) throw new Error(`${FunctionName.ArrayCount} needs 2 params`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue[]) {
    const target = p[1].value;
    return flattenArrayParam(p[0]).filter(v => v === target).length;
  }
}

export class ArrayFirst extends ArrayExtFunc {
  name = FunctionName.ArrayFirst;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.ArrayFirst} needs 1 param`); }
  getReturnType() { return { type: CellValueType.String }; }
  eval(p: TypedValue[]) { const arr = flattenArrayParam(p[0]); return arr.length ? arr[0] : null; }
}

export class ArrayLast extends ArrayExtFunc {
  name = FunctionName.ArrayLast;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.ArrayLast} needs 1 param`); }
  getReturnType() { return { type: CellValueType.String }; }
  eval(p: TypedValue[]) { const arr = flattenArrayParam(p[0]); return arr.length ? arr[arr.length - 1] : null; }
}

export class ArraySort extends ArrayExtFunc {
  name = FunctionName.ArraySort;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.ArraySort} needs 1 param`); }
  getReturnType() { return { type: CellValueType.String, isMultiple: true }; }
  eval(p: TypedValue[]) {
    const arr = [...flattenArrayParam(p[0])];
    const asc = p[1]?.value !== false && p[1]?.value !== 'desc';
    return arr.sort((a, b) => {
      if (a == null) return asc ? 1 : -1;
      if (b == null) return asc ? -1 : 1;
      return asc ? (a < b ? -1 : a > b ? 1 : 0) : (a > b ? -1 : a < b ? 1 : 0);
    });
  }
}

export class ArrayIndexOf extends ArrayExtFunc {
  name = FunctionName.ArrayIndexOf;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (p.length < 2) throw new Error(`${FunctionName.ArrayIndexOf} needs 2 params`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue[]) { return flattenArrayParam(p[0]).indexOf(p[1].value as string | number | null); }
}

export class ArrayDiff extends ArrayExtFunc {
  name = FunctionName.ArrayDiff;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (p.length < 2) throw new Error(`${FunctionName.ArrayDiff} needs 2 params`); }
  getReturnType() { return { type: CellValueType.String, isMultiple: true }; }
  eval(p: TypedValue[]) {
    const a = flattenArrayParam(p[0]), b = new Set(flattenArrayParam(p[1]).map(String));
    return a.filter(v => !b.has(String(v)));
  }
}

export class ArrayLength extends ArrayExtFunc {
  name = FunctionName.ArrayLength;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.ArrayLength} needs 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue[]) { return flattenArrayParam(p[0]).length; }
}

export class ArrayHead extends ArrayExtFunc {
  name = FunctionName.ArrayHead;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.ArrayHead} needs 1 param`); }
  getReturnType() { return { type: CellValueType.String, isMultiple: true }; }
  eval(p: TypedValue[]) {
    const arr = flattenArrayParam(p[0]), n = Number(p[1]?.value ?? 1);
    return arr.slice(0, n);
  }
}

export class ArrayTail extends ArrayExtFunc {
  name = FunctionName.ArrayTail;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.ArrayTail} needs 1 param`); }
  getReturnType() { return { type: CellValueType.String, isMultiple: true }; }
  eval(p: TypedValue[]) {
    const arr = flattenArrayParam(p[0]), n = Number(p[1]?.value ?? 1);
    return arr.slice(-n);
  }
}

export class ArrayIntersect extends ArrayExtFunc {
  name = FunctionName.ArrayIntersect;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (p.length < 2) throw new Error(`${FunctionName.ArrayIntersect} needs 2 params`); }
  getReturnType() { return { type: CellValueType.String, isMultiple: true }; }
  eval(p: TypedValue[]) {
    const a = flattenArrayParam(p[0]), b = new Set(flattenArrayParam(p[1]).map(String));
    return a.filter(v => b.has(String(v)));
  }
}

export class ArrayUnion extends ArrayExtFunc {
  name = FunctionName.ArrayUnion;
  acceptValueType = new Set([CellValueType.String, CellValueType.Number]);
  validateParams(p: TypedValue[]) { if (p.length < 2) throw new Error(`${FunctionName.ArrayUnion} needs 2 params`); }
  getReturnType() { return { type: CellValueType.String, isMultiple: true }; }
  eval(p: TypedValue[]) {
    const seen = new Set<string>();
    return [...flattenArrayParam(p[0]), ...flattenArrayParam(p[1])].filter(v => {
      const k = String(v); if (seen.has(k)) return false; seen.add(k); return true;
    });
  }
}
