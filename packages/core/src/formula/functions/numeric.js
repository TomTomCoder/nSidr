"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Value = exports.Mod = exports.Log = exports.Exp = exports.Power = exports.Sqrt = exports.Abs = exports.Int = exports.Odd = exports.Even = exports.Floor = exports.Ceiling = exports.RoundDown = exports.RoundUp = exports.Round = exports.Min = exports.Max = exports.Average = exports.Sum = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const relativeTime_1 = __importDefault(require("dayjs/plugin/relativeTime"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const constant_1 = require("../../models/field/constant");
const common_1 = require("./common");
dayjs_1.default.extend(relativeTime_1.default);
dayjs_1.default.extend(timezone_1.default);
dayjs_1.default.extend(utc_1.default);
class NumericFunc extends common_1.FormulaFunc {
    type = common_1.FormulaFuncType.Numeric;
}
class Sum extends NumericFunc {
    name = common_1.FunctionName.Sum;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (!params.length) {
            throw new Error(`${common_1.FunctionName.Sum} needs at least 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Sum} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        return params.reduce((result, param) => {
            if (param.isMultiple) {
                if (!Array.isArray(param.value)) {
                    return result;
                }
                result += param.value
                    ? param.value.reduce((r, p) => {
                        r += p || 0;
                        return r;
                    }, 0)
                    : 0;
                return result;
            }
            result += param.value || 0;
            return result;
        }, 0);
    }
}
exports.Sum = Sum;
class Average extends NumericFunc {
    name = common_1.FunctionName.Average;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (!params.length) {
            throw new Error(`${common_1.FunctionName.Average} needs at least 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Average} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        let totalValue = 0;
        let totalCount = 0;
        params.forEach((param) => {
            if (param.isMultiple) {
                if (!Array.isArray(param.value)) {
                    return;
                }
                totalCount += param.value.length;
                totalValue += param.value
                    ? param.value.reduce((r, p) => {
                        return r + (p || 0);
                    }, 0)
                    : 0;
            }
            else {
                totalCount += 1;
                totalValue += param.value || 0;
            }
        });
        if (totalCount === 0)
            return null;
        return totalValue / totalCount;
    }
}
exports.Average = Average;
class Max extends NumericFunc {
    name = common_1.FunctionName.Max;
    acceptValueType = new Set([constant_1.CellValueType.Number, constant_1.CellValueType.DateTime]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (!params.length) {
            throw new Error(`${common_1.FunctionName.Max} needs at least 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type !== constant_1.CellValueType.Number && param.type !== constant_1.CellValueType.DateTime) {
                throw new Error(`${common_1.FunctionName.Max} can only process number or datetime type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: params?.[0].type || constant_1.CellValueType.Number };
    }
    eval(params) {
        let max = null;
        const updateMax = (value) => {
            if (value === null)
                return;
            const timestamp = typeof value === 'string' ? new Date(value).getTime() : value;
            if (max === null || timestamp > max) {
                max = timestamp;
            }
        };
        params.forEach((param) => {
            if (param.isMultiple && Array.isArray(param.value)) {
                const values = param.value.filter((v) => v !== null);
                if (param.type === constant_1.CellValueType.DateTime) {
                    const currentMax = values.reduce((maxDate, v) => {
                        const timestamp = new Date(v).getTime();
                        return maxDate === null || timestamp > maxDate ? timestamp : maxDate;
                    }, null);
                    updateMax(currentMax);
                }
                else {
                    updateMax(Math.max(...values));
                }
            }
            else {
                updateMax(param.value);
            }
        });
        if (max === null)
            return null;
        return params[0].type === constant_1.CellValueType.DateTime ? new Date(max).toISOString() : max;
    }
}
exports.Max = Max;
class Min extends NumericFunc {
    name = common_1.FunctionName.Min;
    acceptValueType = new Set([constant_1.CellValueType.Number, constant_1.CellValueType.DateTime]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (!params.length) {
            throw new Error(`${common_1.FunctionName.Min} needs at least 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type !== constant_1.CellValueType.Number && param.type !== constant_1.CellValueType.DateTime) {
                throw new Error(`${common_1.FunctionName.Min} can only process number or datetime type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: params?.[0].type || constant_1.CellValueType.Number };
    }
    eval(params) {
        let min = null;
        const updateMin = (value) => {
            if (value === null)
                return;
            const timestamp = typeof value === 'string' ? new Date(value).getTime() : value;
            if (min === null || timestamp < min) {
                min = timestamp;
            }
        };
        params.forEach((param) => {
            if (param.isMultiple && Array.isArray(param.value)) {
                const values = param.value.filter((v) => v !== null);
                if (param.type === constant_1.CellValueType.DateTime) {
                    const currentMin = values.reduce((minDate, v) => {
                        const timestamp = new Date(v).getTime();
                        return minDate === null || timestamp < minDate ? timestamp : minDate;
                    }, null);
                    updateMin(currentMin);
                }
                else {
                    updateMin(Math.min(...values));
                }
            }
            else {
                updateMin(param.value);
            }
        });
        if (min === null)
            return null;
        return params[0].type === constant_1.CellValueType.DateTime ? new Date(min).toISOString() : min;
    }
}
exports.Min = Min;
class Round extends NumericFunc {
    name = common_1.FunctionName.Round;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (!params.length) {
            throw new Error(`${common_1.FunctionName.Round} needs at least 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Round} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = params[0].value;
        if (value == null)
            return null;
        const precision = params[1]?.value ? Math.floor(params[1].value) : 0;
        const offset = Math.pow(10, precision);
        return Math.round(value * offset) / offset;
    }
}
exports.Round = Round;
class RoundUp extends NumericFunc {
    name = common_1.FunctionName.RoundUp;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (!params.length) {
            throw new Error(`${common_1.FunctionName.RoundUp} needs at least 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.RoundUp} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        let value = params[0].value;
        if (value == null)
            return null;
        value = Number(params[0].value);
        const precision = params[1]?.value ? Math.floor(params[1].value) : 0;
        const offset = Math.pow(10, precision);
        const roundFn = value > 0 ? Math.ceil : Math.floor;
        return roundFn(value * offset) / offset;
    }
}
exports.RoundUp = RoundUp;
class RoundDown extends NumericFunc {
    name = common_1.FunctionName.RoundDown;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (!params.length) {
            throw new Error(`${common_1.FunctionName.RoundDown} needs at least 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.RoundDown} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        let value = params[0].value;
        if (value == null)
            return null;
        value = Number(params[0].value);
        const precision = params[1]?.value ? Math.floor(params[1].value) : 0;
        const offset = Math.pow(10, precision);
        const roundFn = value > 0 ? Math.floor : Math.ceil;
        return roundFn(value * offset) / offset;
    }
}
exports.RoundDown = RoundDown;
class Ceiling extends NumericFunc {
    name = common_1.FunctionName.Ceiling;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (!params.length) {
            throw new Error(`${common_1.FunctionName.Ceiling} needs at least 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Ceiling} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = params[0].value;
        if (value == null)
            return null;
        const places = params[1]?.value || 0;
        const multiplier = Math.pow(10, places);
        return Math.ceil(value * multiplier) / multiplier;
    }
}
exports.Ceiling = Ceiling;
class Floor extends NumericFunc {
    name = common_1.FunctionName.Floor;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (!params.length) {
            throw new Error(`${common_1.FunctionName.Floor} needs at least 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Floor} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = params[0].value;
        if (value == null)
            return null;
        const places = params[1]?.value || 0;
        const multiplier = Math.pow(10, places);
        return Math.floor(value * multiplier) / multiplier;
    }
}
exports.Floor = Floor;
class Even extends NumericFunc {
    name = common_1.FunctionName.Even;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Even} only allow 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Even} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = params[0].value;
        if (value == null)
            return null;
        const roundedValue = value > 0 ? Math.ceil(value) : Math.floor(value);
        if (roundedValue % 2 === 0)
            return roundedValue;
        return roundedValue > 0 ? roundedValue + 1 : roundedValue - 1;
    }
}
exports.Even = Even;
class Odd extends NumericFunc {
    name = common_1.FunctionName.Odd;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Odd} only allow 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Odd} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = params[0].value;
        if (value == null)
            return null;
        const roundedValue = value > 0 ? Math.ceil(value) : Math.floor(value);
        if (roundedValue % 2 !== 0)
            return roundedValue;
        return roundedValue >= 0 ? roundedValue + 1 : roundedValue - 1;
    }
}
exports.Odd = Odd;
class Int extends NumericFunc {
    name = common_1.FunctionName.Int;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Int} only allow 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Int} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = params[0].value;
        if (value == null)
            return null;
        return Math.floor(value);
    }
}
exports.Int = Int;
class Abs extends NumericFunc {
    name = common_1.FunctionName.Abs;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Abs} only allow 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Abs} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = params[0].value;
        if (value == null)
            return null;
        return Math.abs(value);
    }
}
exports.Abs = Abs;
class Sqrt extends NumericFunc {
    name = common_1.FunctionName.Sqrt;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Sqrt} only allow 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Sqrt} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = params[0].value;
        if (value == null)
            return null;
        return Math.sqrt(value);
    }
}
exports.Sqrt = Sqrt;
class Power extends NumericFunc {
    name = common_1.FunctionName.Power;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.Power} needs 2 params`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Power} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = params[0].value;
        if (value == null)
            return null;
        const exponent = params[1]?.value || 1;
        return Math.pow(value, exponent);
    }
}
exports.Power = Power;
class Exp extends NumericFunc {
    name = common_1.FunctionName.Exp;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Exp} only allow 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Exp} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = params[0].value;
        if (value == null)
            return null;
        return Math.exp(value);
    }
}
exports.Exp = Exp;
class Log extends NumericFunc {
    name = common_1.FunctionName.Log;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (!params.length) {
            throw new Error(`${common_1.FunctionName.Log} needs at least 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Log} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = params[0].value;
        if (value == null)
            return null;
        const base = params[1]?.value || 10;
        return Math.log(value) / Math.log(base);
    }
}
exports.Log = Log;
class Mod extends NumericFunc {
    name = common_1.FunctionName.Mod;
    acceptValueType = new Set([constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.Mod} needs 2 params`);
        }
        params.forEach((param, i) => {
            if (param && param.type === constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Mod} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = params[0].value;
        if (value == null)
            return null;
        const divisor = params[1]?.value || 1;
        const mod = value % divisor;
        return (value ^ divisor) < 0 ? -mod : mod;
    }
}
exports.Mod = Mod;
class Value extends NumericFunc {
    name = common_1.FunctionName.Value;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Value} only allow 1 param`);
        }
        params.forEach((param, i) => {
            if (param && param.type !== constant_1.CellValueType.String) {
                throw new Error(`${common_1.FunctionName.Value} can't process string type param at ${i + 1}`);
            }
        });
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        let value = params[0].value;
        if (value == null)
            return null;
        const numberReg = /[^\d.+-]/g;
        const symbolReg = /([+\-.])+/g;
        value = String(value).replace(numberReg, '').replace(symbolReg, '$1');
        return parseFloat(value);
    }
}
exports.Value = Value;
