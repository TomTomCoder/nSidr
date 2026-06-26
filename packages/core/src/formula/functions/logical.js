"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsError = exports.FormulaError = exports.FormulaBaseError = exports.Blank = exports.Not = exports.Xor = exports.Or = exports.And = exports.Switch = exports.If = void 0;
const constant_1 = require("../../models/field/constant");
const common_1 = require("./common");
const text_1 = require("./text");
class LogicalFunc extends common_1.FormulaFunc {
    type = common_1.FormulaFuncType.Logical;
}
class If extends LogicalFunc {
    name = common_1.FunctionName.If;
    acceptValueType = new Set([
        constant_1.CellValueType.String,
        constant_1.CellValueType.DateTime,
        constant_1.CellValueType.Number,
        constant_1.CellValueType.Boolean,
    ]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 3) {
            throw new Error(`${common_1.FunctionName.If} needs at least 3 params`);
        }
    }
    getReturnType(params) {
        if (params == null)
            return { type: constant_1.CellValueType.String };
        this.validateParams(params);
        if (params[1].isBlank) {
            return {
                type: params[2].type,
                isMultiple: params[2].isMultiple,
            };
        }
        if (params[2].isBlank) {
            return {
                type: params[1].type,
                isMultiple: params[1].isMultiple,
            };
        }
        if (params[1].type === params[2].type) {
            return {
                type: params[1].type,
                isMultiple: params[1].isMultiple && params[2].isMultiple,
            };
        }
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const condition = params[0].value;
        return condition ? params[1]?.value : params[2]?.value;
    }
}
exports.If = If;
class Switch extends LogicalFunc {
    name = common_1.FunctionName.Switch;
    acceptValueType = new Set([
        constant_1.CellValueType.String,
        constant_1.CellValueType.DateTime,
        constant_1.CellValueType.Number,
        constant_1.CellValueType.Boolean,
    ]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.Switch} needs at least 2 params`);
        }
    }
    getReturnType(params) {
        if (params == null)
            return { type: constant_1.CellValueType.String };
        this.validateParams(params);
        const paramsLength = params.length;
        if (paramsLength <= 2)
            return { type: params[1].type, isMultiple: params[1].isMultiple };
        let expectedType = params[2].type;
        let expectedIsMultiple = params[2].isMultiple;
        const checkParam = (param) => {
            const { type, isBlank, isMultiple } = param;
            if (!isBlank) {
                if (expectedType !== type) {
                    expectedType = constant_1.CellValueType.String;
                }
                if (expectedIsMultiple !== isMultiple) {
                    expectedIsMultiple = false;
                }
            }
        };
        for (let i = 2; i < paramsLength; i += 2) {
            checkParam(params[i]);
        }
        if (paramsLength % 2 === 0) {
            checkParam(params[paramsLength - 1]);
        }
        return { type: expectedType, isMultiple: expectedIsMultiple };
    }
    eval(params) {
        const paramsLength = params.length;
        const expression = params[0].value;
        if (paramsLength % 2 === 0) {
            const defaultValue = params[paramsLength - 1].value;
            for (let i = 1; i < paramsLength - 1; i += 2) {
                const currentCase = params[i].value;
                const currentValue = params[i + 1].value;
                if (expression === currentCase) {
                    return currentValue;
                }
            }
            return defaultValue;
        }
        for (let i = 1; i < paramsLength; i += 2) {
            const currentCase = params[i].value;
            const currentValue = params[i + 1].value;
            if (expression === currentCase) {
                return currentValue;
            }
        }
        return null;
    }
}
exports.Switch = Switch;
class And extends LogicalFunc {
    name = common_1.FunctionName.And;
    acceptValueType = new Set([constant_1.CellValueType.Boolean]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.And} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Boolean };
    }
    eval(params) {
        return params.reduce((result, param) => {
            if (param.isMultiple) {
                if (!Array.isArray(param.value) || param.value == null) {
                    return false;
                }
                return result && param.value.every((v) => Boolean(v));
            }
            return result && Boolean(param.value);
        }, true);
    }
}
exports.And = And;
class Or extends LogicalFunc {
    name = common_1.FunctionName.Or;
    acceptValueType = new Set([constant_1.CellValueType.Boolean]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.Or} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Boolean };
    }
    eval(params) {
        return params.reduce((result, param) => {
            if (param.isMultiple) {
                if (!Array.isArray(param.value) || param.value == null) {
                    return result;
                }
                return result || param.value.some((v) => Boolean(v));
            }
            return result || Boolean(param.value);
        }, false);
    }
}
exports.Or = Or;
class Xor extends LogicalFunc {
    name = common_1.FunctionName.Xor;
    acceptValueType = new Set([constant_1.CellValueType.Boolean]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.Xor} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Boolean };
    }
    eval(params) {
        const count = params.reduce((result, param) => {
            if (param.isMultiple) {
                if (!Array.isArray(param.value) || param.value == null) {
                    return result;
                }
                param.value.forEach((v) => {
                    if (v)
                        result++;
                });
                return result;
            }
            return param.value ? result + 1 : result;
        }, 0);
        return Boolean(count & 1);
    }
}
exports.Xor = Xor;
class Not extends LogicalFunc {
    name = common_1.FunctionName.Not;
    acceptValueType = new Set([constant_1.CellValueType.Boolean]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Not} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Boolean };
    }
    eval(params) {
        return !params[0].value;
    }
}
exports.Not = Not;
class Blank extends LogicalFunc {
    name = common_1.FunctionName.Blank;
    acceptValueType = new Set([]);
    acceptMultipleValue = false;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    validateParams() { }
    getReturnType() {
        return { type: constant_1.CellValueType.String };
    }
    eval() {
        return null;
    }
}
exports.Blank = Blank;
class FormulaBaseError extends Error {
    constructor(message) {
        super();
        this.message = message ? '#ERROR: ' + message : '#ERROR!';
    }
}
exports.FormulaBaseError = FormulaBaseError;
class FormulaError extends LogicalFunc {
    name = common_1.FunctionName.Error;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = true;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    validateParams() { }
    getReturnType() {
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const errText = (0, text_1.convertValueToString)(params[0]);
        throw new FormulaBaseError(errText ?? '');
    }
}
exports.FormulaError = FormulaError;
class IsError extends LogicalFunc {
    name = common_1.FunctionName.IsError;
    acceptValueType = new Set([
        constant_1.CellValueType.String,
        constant_1.CellValueType.Number,
        constant_1.CellValueType.Boolean,
        constant_1.CellValueType.DateTime,
    ]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.IsError} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Boolean };
    }
    eval(params) {
        const value = params[0].value;
        return value instanceof FormulaBaseError;
    }
}
exports.IsError = IsError;
