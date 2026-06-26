"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayCompact = exports.ArrayFlatten = exports.ArrayUnique = exports.ArrayJoin = exports.Count = exports.CountA = exports.CountAll = void 0;
const lodash_1 = require("lodash");
const constant_1 = require("../../models/field/constant");
const common_1 = require("./common");
const text_1 = require("./text");
class ArrayFunc extends common_1.FormulaFunc {
    type = common_1.FormulaFuncType.Array;
}
const countCalculator = (params, calcFn) => {
    return params.reduce((result, param) => {
        if (param.isMultiple) {
            if (!Array.isArray(param.value) || param.value === null) {
                return calcFn(param.value) ? result + 1 : result;
            }
            result += param.value.reduce((pre, v) => {
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
const flatten = (arr) => {
    let result = [];
    for (const item of arr) {
        if (item !== null) {
            if (Array.isArray(item)) {
                result = result.concat(flatten(item));
            }
            else {
                result.push(item);
            }
        }
    }
    return result;
};
const flattenParams = (params) => {
    return params.reduce((prev, item) => {
        const value = item.value;
        if (value == null)
            return prev;
        return prev.concat(Array.isArray(value) ? flatten(value) : value);
    }, []);
};
const getUnionReturnType = (params) => {
    if (!params?.length)
        return { type: constant_1.CellValueType.String, isMultiple: true };
    const firstCellValueType = params[0].type;
    const isAllSameType = params.every((param) => param.type === firstCellValueType);
    return {
        type: isAllSameType ? firstCellValueType : constant_1.CellValueType.String,
        isMultiple: true,
    };
};
class CountAll extends ArrayFunc {
    name = common_1.FunctionName.CountAll;
    acceptValueType = new Set([
        constant_1.CellValueType.Boolean,
        constant_1.CellValueType.DateTime,
        constant_1.CellValueType.Number,
        constant_1.CellValueType.String,
    ]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.CountAll} needs 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        if (params[0].value == null) {
            return 0;
        }
        if (Array.isArray(params[0].value)) {
            return params[0].value.length;
        }
        return 1;
    }
}
exports.CountAll = CountAll;
class CountA extends ArrayFunc {
    name = common_1.FunctionName.CountA;
    acceptValueType = new Set([
        constant_1.CellValueType.Boolean,
        constant_1.CellValueType.DateTime,
        constant_1.CellValueType.Number,
        constant_1.CellValueType.String,
    ]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.CountA} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        return countCalculator(params, (v) => (0, lodash_1.isNumber)(v) || ((0, lodash_1.isString)(v) && v !== ''));
    }
}
exports.CountA = CountA;
class Count extends ArrayFunc {
    name = common_1.FunctionName.Count;
    acceptValueType = new Set([
        constant_1.CellValueType.Boolean,
        constant_1.CellValueType.DateTime,
        constant_1.CellValueType.Number,
        constant_1.CellValueType.String,
    ]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.Count} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        return countCalculator(params, lodash_1.isNumber);
    }
}
exports.Count = Count;
class ArrayJoin extends ArrayFunc {
    name = common_1.FunctionName.ArrayJoin;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.ArrayJoin} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        let separator = params[1]?.value;
        separator = (0, lodash_1.isString)(separator) ? separator : ', ';
        return (0, text_1.convertValueToString)(params[0], separator);
    }
}
exports.ArrayJoin = ArrayJoin;
class ArrayUnique extends ArrayFunc {
    name = common_1.FunctionName.ArrayUnique;
    acceptValueType = new Set([
        constant_1.CellValueType.Boolean,
        constant_1.CellValueType.DateTime,
        constant_1.CellValueType.Number,
        constant_1.CellValueType.String,
    ]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.ArrayUnique} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return getUnionReturnType(params);
    }
    eval(params) {
        const flattenArray = flattenParams(params);
        const uniqueArray = [...new Set(flattenArray)];
        return uniqueArray.length ? uniqueArray : null;
    }
}
exports.ArrayUnique = ArrayUnique;
class ArrayFlatten extends ArrayFunc {
    name = common_1.FunctionName.ArrayFlatten;
    acceptValueType = new Set([
        constant_1.CellValueType.Boolean,
        constant_1.CellValueType.DateTime,
        constant_1.CellValueType.Number,
        constant_1.CellValueType.String,
    ]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.ArrayFlatten} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return getUnionReturnType(params);
    }
    eval(params) {
        const flattenArray = flattenParams(params);
        return flattenArray.length ? flattenArray : null;
    }
}
exports.ArrayFlatten = ArrayFlatten;
class ArrayCompact extends ArrayFunc {
    name = common_1.FunctionName.ArrayCompact;
    acceptValueType = new Set([
        constant_1.CellValueType.Boolean,
        constant_1.CellValueType.DateTime,
        constant_1.CellValueType.Number,
        constant_1.CellValueType.String,
    ]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.ArrayCompact} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return getUnionReturnType(params);
    }
    eval(params) {
        const flattenArray = flattenParams(params);
        const filteredArray = flattenArray.filter((v) => v !== '');
        return filteredArray.length ? filteredArray : null;
    }
}
exports.ArrayCompact = ArrayCompact;
