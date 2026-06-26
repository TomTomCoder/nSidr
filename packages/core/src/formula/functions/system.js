"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoNumber = exports.RecordId = exports.TextAll = void 0;
const constant_1 = require("../../models/field/constant");
const common_1 = require("./common");
class SystemFunc extends common_1.FormulaFunc {
    type = common_1.FormulaFuncType.System;
}
class TextAll extends SystemFunc {
    name = common_1.FunctionName.TextAll;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.TextAll} only allow 1 param`);
        }
    }
    getReturnType(params) {
        if (params[0].isMultiple) {
            return { type: constant_1.CellValueType.String, isMultiple: true };
        }
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const param = params[0];
        if (param.isMultiple) {
            return param.value
                ? param.value.map((p) => {
                    if (Array.isArray(p)) {
                        return p.join(', ');
                    }
                    return p;
                })
                : null;
        }
        return param.value || null;
    }
}
exports.TextAll = TextAll;
class RecordId extends SystemFunc {
    name = common_1.FunctionName.RecordId;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = true;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    validateParams() { }
    getReturnType() {
        return { type: constant_1.CellValueType.String };
    }
    eval(_params, context) {
        return context.record.id;
    }
}
exports.RecordId = RecordId;
class AutoNumber extends SystemFunc {
    name = common_1.FunctionName.RecordId;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = true;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    validateParams() { }
    getReturnType() {
        return { type: constant_1.CellValueType.Number };
    }
    eval(_params, context) {
        return context.record.autoNumber ?? null;
    }
}
exports.AutoNumber = AutoNumber;
