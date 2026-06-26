import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { CellValueType } from '../../models/field/constant';
import type { TypedValue } from '../typed-value';
import { FormulaFunc, FormulaFuncType, FunctionName } from './common';

dayjs.extend(relativeTime);
dayjs.extend(timezone);
dayjs.extend(utc);

abstract class NumericFunc extends FormulaFunc {
  readonly type = FormulaFuncType.Numeric;
}

export class Sum extends NumericFunc {
  name = FunctionName.Sum;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = true;

  validateParams(params: TypedValue[]) {
    if (!params.length) {
      throw new Error(`${FunctionName.Sum} needs at least 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Sum} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null | (number | null)[]>[]): number | null {
    return params.reduce((result, param) => {
      if (param.isMultiple) {
        if (!Array.isArray(param.value)) {
          return result;
        }
        result += param.value
          ? (param.value as (number | null)[]).reduce<number>((r, p) => {
              r += p || 0;
              return r;
            }, 0)
          : 0;
        return result;
      }
      result += (param.value as number) || 0;
      return result;
    }, 0);
  }
}

export class Average extends NumericFunc {
  name = FunctionName.Average;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = true;

  validateParams(params: TypedValue[]) {
    if (!params.length) {
      throw new Error(`${FunctionName.Average} needs at least 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Average} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null | (number | null)[]>[]): number | null {
    let totalValue = 0;
    let totalCount = 0;

    params.forEach((param) => {
      if (param.isMultiple) {
        if (!Array.isArray(param.value)) {
          return;
        }
        totalCount += param.value.length;
        totalValue += param.value
          ? (param.value as (number | null)[]).reduce<number>((r, p) => {
              return r + (p || 0);
            }, 0)
          : 0;
      } else {
        totalCount += 1;
        totalValue += (param.value as number) || 0;
      }
    });

    if (totalCount === 0) return null;

    return totalValue / totalCount;
  }
}

export class Max extends NumericFunc {
  name = FunctionName.Max;

  acceptValueType = new Set([CellValueType.Number, CellValueType.DateTime]);

  acceptMultipleValue = true;

  validateParams(params: TypedValue[]) {
    if (!params.length) {
      throw new Error(`${FunctionName.Max} needs at least 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type !== CellValueType.Number && param.type !== CellValueType.DateTime) {
        throw new Error(
          `${FunctionName.Max} can only process number or datetime type param at ${i + 1}`
        );
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: params?.[0].type || CellValueType.Number };
  }

  eval(
    params: TypedValue<number | string | null | (number | string | null)[]>[]
  ): number | string | null {
    let max: number | null = null;

    const updateMax = (value: number | string | null) => {
      if (value === null) return;
      const timestamp = typeof value === 'string' ? new Date(value).getTime() : value;
      if (max === null || timestamp > max) {
        max = timestamp;
      }
    };

    params.forEach((param) => {
      if (param.isMultiple && Array.isArray(param.value)) {
        const values = param.value.filter((v): v is string | number => v !== null);
        if (param.type === CellValueType.DateTime) {
          const currentMax = values.reduce(
            (maxDate, v) => {
              const timestamp = new Date(v as string).getTime();
              return maxDate === null || timestamp > maxDate ? timestamp : maxDate;
            },
            null as number | null
          );
          updateMax(currentMax);
        } else {
          updateMax(Math.max(...(values as number[])));
        }
      } else {
        updateMax(param.value as number | string | null);
      }
    });

    if (max === null) return null;
    return params[0].type === CellValueType.DateTime ? new Date(max).toISOString() : max;
  }
}
export class Min extends NumericFunc {
  name = FunctionName.Min;

  acceptValueType = new Set([CellValueType.Number, CellValueType.DateTime]);

  acceptMultipleValue = true;

  validateParams(params: TypedValue[]) {
    if (!params.length) {
      throw new Error(`${FunctionName.Min} needs at least 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type !== CellValueType.Number && param.type !== CellValueType.DateTime) {
        throw new Error(
          `${FunctionName.Min} can only process number or datetime type param at ${i + 1}`
        );
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: params?.[0].type || CellValueType.Number };
  }

  eval(
    params: TypedValue<number | string | null | (number | string | null)[]>[]
  ): number | string | null {
    let min: number | null = null;

    const updateMin = (value: number | string | null) => {
      if (value === null) return;
      const timestamp = typeof value === 'string' ? new Date(value).getTime() : value;
      if (min === null || timestamp < min) {
        min = timestamp;
      }
    };

    params.forEach((param) => {
      if (param.isMultiple && Array.isArray(param.value)) {
        const values = param.value.filter((v): v is string | number => v !== null);
        if (param.type === CellValueType.DateTime) {
          const currentMin = values.reduce(
            (minDate, v) => {
              const timestamp = new Date(v as string).getTime();
              return minDate === null || timestamp < minDate ? timestamp : minDate;
            },
            null as number | null
          );
          updateMin(currentMin);
        } else {
          updateMin(Math.min(...(values as number[])));
        }
      } else {
        updateMin(param.value as number | string | null);
      }
    });

    if (min === null) return null;
    return params[0].type === CellValueType.DateTime ? new Date(min).toISOString() : min;
  }
}

export class Round extends NumericFunc {
  name = FunctionName.Round;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (!params.length) {
      throw new Error(`${FunctionName.Round} needs at least 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Round} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null>[]): number | null {
    const value = params[0].value;
    if (value == null) return null;
    const precision = params[1]?.value ? Math.floor(params[1].value) : 0;
    const offset = Math.pow(10, precision);
    return Math.round(value * offset) / offset;
  }
}

export class RoundUp extends NumericFunc {
  name = FunctionName.RoundUp;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (!params.length) {
      throw new Error(`${FunctionName.RoundUp} needs at least 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.RoundUp} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null>[]): number | null {
    let value = params[0].value;
    if (value == null) return null;
    value = Number(params[0].value);
    const precision = params[1]?.value ? Math.floor(params[1].value) : 0;
    const offset = Math.pow(10, precision);
    const roundFn = value > 0 ? Math.ceil : Math.floor;
    return roundFn(value * offset) / offset;
  }
}

export class RoundDown extends NumericFunc {
  name = FunctionName.RoundDown;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (!params.length) {
      throw new Error(`${FunctionName.RoundDown} needs at least 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.RoundDown} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null>[]): number | null {
    let value = params[0].value;
    if (value == null) return null;
    value = Number(params[0].value);
    const precision = params[1]?.value ? Math.floor(params[1].value) : 0;
    const offset = Math.pow(10, precision);
    const roundFn = value > 0 ? Math.floor : Math.ceil;
    return roundFn(value * offset) / offset;
  }
}

export class Ceiling extends NumericFunc {
  name = FunctionName.Ceiling;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (!params.length) {
      throw new Error(`${FunctionName.Ceiling} needs at least 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Ceiling} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null>[]): number | null {
    const value = params[0].value;
    if (value == null) return null;
    const places = params[1]?.value || 0;
    const multiplier = Math.pow(10, places);
    return Math.ceil(value * multiplier) / multiplier;
  }
}

export class Floor extends NumericFunc {
  name = FunctionName.Floor;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (!params.length) {
      throw new Error(`${FunctionName.Floor} needs at least 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Floor} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null>[]): number | null {
    const value = params[0].value;
    if (value == null) return null;
    const places = params[1]?.value || 0;
    const multiplier = Math.pow(10, places);
    return Math.floor(value * multiplier) / multiplier;
  }
}

export class Even extends NumericFunc {
  name = FunctionName.Even;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (params.length !== 1) {
      throw new Error(`${FunctionName.Even} only allow 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Even} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number>[]): number | null {
    const value = params[0].value;
    if (value == null) return null;
    const roundedValue = value > 0 ? Math.ceil(value) : Math.floor(value);
    if (roundedValue % 2 === 0) return roundedValue;
    return roundedValue > 0 ? roundedValue + 1 : roundedValue - 1;
  }
}

export class Odd extends NumericFunc {
  name = FunctionName.Odd;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (params.length !== 1) {
      throw new Error(`${FunctionName.Odd} only allow 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Odd} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number>[]): number | null {
    const value = params[0].value;
    if (value == null) return null;
    const roundedValue = value > 0 ? Math.ceil(value) : Math.floor(value);
    if (roundedValue % 2 !== 0) return roundedValue;
    return roundedValue >= 0 ? roundedValue + 1 : roundedValue - 1;
  }
}

export class Int extends NumericFunc {
  name = FunctionName.Int;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (params.length !== 1) {
      throw new Error(`${FunctionName.Int} only allow 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Int} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null>[]): number | null {
    const value = params[0].value;
    if (value == null) return null;
    return Math.floor(value);
  }
}

export class Abs extends NumericFunc {
  name = FunctionName.Abs;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (params.length !== 1) {
      throw new Error(`${FunctionName.Abs} only allow 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Abs} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null>[]): number | null {
    const value = params[0].value;
    if (value == null) return null;
    return Math.abs(value);
  }
}

export class Sqrt extends NumericFunc {
  name = FunctionName.Sqrt;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (params.length !== 1) {
      throw new Error(`${FunctionName.Sqrt} only allow 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Sqrt} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null>[]): number | null {
    const value = params[0].value;
    if (value == null) return null;
    return Math.sqrt(value);
  }
}

export class Power extends NumericFunc {
  name = FunctionName.Power;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (params.length < 2) {
      throw new Error(`${FunctionName.Power} needs 2 params`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Power} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null>[]): number | null {
    const value = params[0].value;
    if (value == null) return null;
    const exponent = params[1]?.value || 1;
    return Math.pow(value, exponent);
  }
}

export class Exp extends NumericFunc {
  name = FunctionName.Exp;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (params.length !== 1) {
      throw new Error(`${FunctionName.Exp} only allow 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Exp} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null>[]): number | null {
    const value = params[0].value;
    if (value == null) return null;
    return Math.exp(value);
  }
}

export class Log extends NumericFunc {
  name = FunctionName.Log;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (!params.length) {
      throw new Error(`${FunctionName.Log} needs at least 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Log} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null>[]): number | null {
    const value = params[0].value;
    if (value == null) return null;
    const base = params[1]?.value || 10;
    return Math.log(value) / Math.log(base);
  }
}

export class Mod extends NumericFunc {
  name = FunctionName.Mod;

  acceptValueType = new Set([CellValueType.Number]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (params.length < 2) {
      throw new Error(`${FunctionName.Mod} needs 2 params`);
    }
    params.forEach((param, i) => {
      if (param && param.type === CellValueType.String) {
        throw new Error(`${FunctionName.Mod} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<number | null>[]): number | null {
    const value = params[0].value;
    if (value == null) return null;
    const divisor = params[1]?.value || 1;
    const mod = value % divisor;
    return (value ^ divisor) < 0 ? -mod : mod;
  }
}

export class Value extends NumericFunc {
  name = FunctionName.Value;

  acceptValueType = new Set([CellValueType.String]);

  acceptMultipleValue = false;

  validateParams(params: TypedValue[]) {
    if (params.length !== 1) {
      throw new Error(`${FunctionName.Value} only allow 1 param`);
    }
    params.forEach((param, i) => {
      if (param && param.type !== CellValueType.String) {
        throw new Error(`${FunctionName.Value} can't process string type param at ${i + 1}`);
      }
    });
  }

  getReturnType(params?: TypedValue[]) {
    params && this.validateParams(params);
    return { type: CellValueType.Number };
  }

  eval(params: TypedValue<string | null>[]): number | null {
    let value = params[0].value;
    if (value == null) return null;
    const numberReg = /[^\d.+-]/g;
    const symbolReg = /([+\-.])+/g;
    value = String(value).replace(numberReg, '').replace(symbolReg, '$1');
    return parseFloat(value);
  }
}

function requireNumericParams(name: FunctionName, params: TypedValue[], min: number, max?: number) {
  const hi = max ?? min;
  if (params.length < min || params.length > hi) {
    throw new Error(`${name} needs ${min === hi ? min : `${min}–${hi}`} param(s)`);
  }
  params.forEach((p, i) => {
    if (p?.type === CellValueType.String)
      throw new Error(`${name} can't process string type param at ${i + 1}`);
  });
}

function collectNums(p: TypedValue<number | null | (number | null)[]>[]): number[] {
  const out: number[] = [];
  p.forEach(param => {
    const vals = param.isMultiple && Array.isArray(param.value)
      ? (param.value as (number | null)[])
      : [param.value as number | null];
    vals.forEach(v => { if (v != null) out.push(v); });
  });
  return out;
}

export class Sign extends NumericFunc {
  name = FunctionName.Sign;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.sign(v); }
}

export class Fact extends NumericFunc {
  name = FunctionName.Fact;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) {
    const v = Math.floor(p[0].value ?? 0);
    if (v < 0) throw new Error(`${FunctionName.Fact} requires non-negative integer`);
    let r = 1;
    for (let i = 2; i <= v; i++) r *= i;
    return r;
  }
}

export class Trunc extends NumericFunc {
  name = FunctionName.Trunc;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1, 2); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) {
    const v = p[0].value; if (v == null) return null;
    const d = (p[1]?.value as number) ?? 0;
    const m = Math.pow(10, d);
    return Math.trunc(v * m) / m;
  }
}

export class Frac extends NumericFunc {
  name = FunctionName.Frac;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : v - Math.trunc(v); }
}

export class Negate extends NumericFunc {
  name = FunctionName.Negate;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : -v; }
}

export class Cbrt extends NumericFunc {
  name = FunctionName.Cbrt;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.cbrt(v); }
}

export class Ln extends NumericFunc {
  name = FunctionName.Ln;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.log(v); }
}

export class Log2 extends NumericFunc {
  name = FunctionName.Log2;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.log2(v); }
}

export class Log10 extends NumericFunc {
  name = FunctionName.Log10;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.log10(v); }
}

export class Pi extends NumericFunc {
  name = FunctionName.Pi;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams() { return; }
  getReturnType() { return { type: CellValueType.Number }; }
  eval() { return Math.PI; }
}

export class Tau extends NumericFunc {
  name = FunctionName.Tau;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams() { return; }
  getReturnType() { return { type: CellValueType.Number }; }
  eval() { return 2 * Math.PI; }
}

export class Sin extends NumericFunc {
  name = FunctionName.Sin;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.sin(v); }
}

export class Cos extends NumericFunc {
  name = FunctionName.Cos;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.cos(v); }
}

export class Tan extends NumericFunc {
  name = FunctionName.Tan;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.tan(v); }
}

export class Asin extends NumericFunc {
  name = FunctionName.Asin;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.asin(v); }
}

export class Acos extends NumericFunc {
  name = FunctionName.Acos;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.acos(v); }
}

export class Atan extends NumericFunc {
  name = FunctionName.Atan;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.atan(v); }
}

export class Atan2 extends NumericFunc {
  name = FunctionName.Atan2;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 2); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) {
    const y = p[0].value, x = p[1].value;
    return y == null || x == null ? null : Math.atan2(y, x);
  }
}

export class Sinh extends NumericFunc {
  name = FunctionName.Sinh;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.sinh(v); }
}

export class Cosh extends NumericFunc {
  name = FunctionName.Cosh;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.cosh(v); }
}

export class Tanh extends NumericFunc {
  name = FunctionName.Tanh;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : Math.tanh(v); }
}

export class Degrees extends NumericFunc {
  name = FunctionName.Degrees;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : v * (180 / Math.PI); }
}

export class Radians extends NumericFunc {
  name = FunctionName.Radians;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 1); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) { const v = p[0].value; return v == null ? null : v * (Math.PI / 180); }
}

export class Mround extends NumericFunc {
  name = FunctionName.Mround;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 2); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) {
    const v = p[0].value, m = p[1].value;
    return v == null || m == null || m === 0 ? null : Math.round(v / m) * m;
  }
}

export class Combin extends NumericFunc {
  name = FunctionName.Combin;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 2); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) {
    const n = Math.floor(p[0].value ?? 0), k = Math.floor(p[1].value ?? 0);
    if (n < 0 || k < 0 || k > n) return null;
    if (k === 0 || k === n) return 1;
    let r = 1;
    for (let i = 0; i < Math.min(k, n - k); i++) r = r * (n - i) / (i + 1);
    return Math.round(r);
  }
}

export class Permut extends NumericFunc {
  name = FunctionName.Permut;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 2); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) {
    const n = Math.floor(p[0].value ?? 0), k = Math.floor(p[1].value ?? 0);
    if (n < 0 || k < 0 || k > n) return null;
    let r = 1;
    for (let i = n - k + 1; i <= n; i++) r *= i;
    return r;
  }
}

export class Quotient extends NumericFunc {
  name = FunctionName.Quotient;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 2); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) {
    const a = p[0].value, b = p[1].value;
    return a == null || b == null || b === 0 ? null : Math.trunc(a / b);
  }
}

export class Clamp extends NumericFunc {
  name = FunctionName.Clamp;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 3); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) {
    const v = p[0].value, lo = p[1].value, hi = p[2].value;
    return v == null || lo == null || hi == null ? null : Math.min(Math.max(v, lo), hi);
  }
}

export class Rand extends NumericFunc {
  name = FunctionName.Rand;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams() { return; }
  getReturnType() { return { type: CellValueType.Number }; }
  eval() { return Math.random(); }
}

export class RandBetween extends NumericFunc {
  name = FunctionName.RandBetween;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = false;
  validateParams(p: TypedValue[]) { requireNumericParams(this.name, p, 2); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null>[]) {
    const lo = p[0].value, hi = p[1].value;
    return lo == null || hi == null ? null : Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }
}

export class Gcd extends NumericFunc {
  name = FunctionName.Gcd;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = true;
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.Gcd} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null | (number | null)[]>[]) {
    const g = (a: number, b: number): number => b === 0 ? a : g(b, a % b);
    const nums = collectNums(p as TypedValue<number | null | (number | null)[]>[]).map(x => Math.abs(Math.round(x)));
    return nums.length ? nums.reduce(g) : null;
  }
}

export class Lcm extends NumericFunc {
  name = FunctionName.Lcm;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = true;
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.Lcm} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null | (number | null)[]>[]) {
    const g = (a: number, b: number): number => b === 0 ? a : g(b, a % b);
    const nums = collectNums(p as TypedValue<number | null | (number | null)[]>[]).map(x => Math.abs(Math.round(x))).filter(x => x !== 0);
    return nums.length ? nums.reduce((a, b) => a / g(a, b) * b) : null;
  }
}

export class Product extends NumericFunc {
  name = FunctionName.Product;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = true;
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.Product} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null | (number | null)[]>[]) {
    return collectNums(p as TypedValue<number | null | (number | null)[]>[]).reduce((acc, v) => acc * v, 1);
  }
}

export class Sumsq extends NumericFunc {
  name = FunctionName.Sumsq;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = true;
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.Sumsq} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null | (number | null)[]>[]) {
    return collectNums(p as TypedValue<number | null | (number | null)[]>[]).reduce((acc, v) => acc + v * v, 0);
  }
}

export class Hypot extends NumericFunc {
  name = FunctionName.Hypot;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = true;
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.Hypot} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null | (number | null)[]>[]) {
    return Math.hypot(...collectNums(p as TypedValue<number | null | (number | null)[]>[]));
  }
}

export class Median extends NumericFunc {
  name = FunctionName.Median;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = true;
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.Median} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null | (number | null)[]>[]) {
    const nums = collectNums(p as TypedValue<number | null | (number | null)[]>[]).sort((a, b) => a - b);
    if (!nums.length) return null;
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  }
}

export class Large extends NumericFunc {
  name = FunctionName.Large;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = true;
  validateParams(p: TypedValue[]) { if (p.length < 2) throw new Error(`${FunctionName.Large} needs at least 2 params`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null | (number | null)[]>[]) {
    const k = Math.floor(p[p.length - 1].value as number);
    const nums = collectNums(p.slice(0, -1) as TypedValue<number | null | (number | null)[]>[]).sort((a, b) => b - a);
    return k >= 1 && k <= nums.length ? nums[k - 1] : null;
  }
}

export class Small extends NumericFunc {
  name = FunctionName.Small;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = true;
  validateParams(p: TypedValue[]) { if (p.length < 2) throw new Error(`${FunctionName.Small} needs at least 2 params`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null | (number | null)[]>[]) {
    const k = Math.floor(p[p.length - 1].value as number);
    const nums = collectNums(p.slice(0, -1) as TypedValue<number | null | (number | null)[]>[]).sort((a, b) => a - b);
    return k >= 1 && k <= nums.length ? nums[k - 1] : null;
  }
}

export class Stdev extends NumericFunc {
  name = FunctionName.Stdev;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = true;
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.Stdev} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null | (number | null)[]>[]) {
    const nums = collectNums(p as TypedValue<number | null | (number | null)[]>[]);
    if (nums.length < 2) return null;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1));
  }
}

export class Var extends NumericFunc {
  name = FunctionName.Var;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = true;
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.Var} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null | (number | null)[]>[]) {
    const nums = collectNums(p as TypedValue<number | null | (number | null)[]>[]);
    if (nums.length < 2) return null;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
  }
}

export class StdevP extends NumericFunc {
  name = FunctionName.StdevP;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = true;
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.StdevP} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null | (number | null)[]>[]) {
    const nums = collectNums(p as TypedValue<number | null | (number | null)[]>[]);
    if (!nums.length) return null;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
  }
}

export class VarP extends NumericFunc {
  name = FunctionName.VarP;
  acceptValueType = new Set([CellValueType.Number]);
  acceptMultipleValue = true;
  validateParams(p: TypedValue[]) { if (!p.length) throw new Error(`${FunctionName.VarP} needs at least 1 param`); }
  getReturnType() { return { type: CellValueType.Number }; }
  eval(p: TypedValue<number | null | (number | null)[]>[]) {
    const nums = collectNums(p as TypedValue<number | null | (number | null)[]>[]);
    if (!nums.length) return null;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  }
}
