"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetRecordBuilder = void 0;
const common_1 = require("../common");
class SetRecordBuilder {
    name = common_1.OpName.SetRecord;
    build(params) {
        const { fieldId } = params;
        let { newCellValue, oldCellValue } = params;
        newCellValue = newCellValue ?? null;
        oldCellValue = oldCellValue ?? null;
        // convert set null to delete key
        if (newCellValue == null || (Array.isArray(newCellValue) && newCellValue.length === 0)) {
            return {
                p: ['fields', fieldId],
                od: oldCellValue,
                oi: null,
            };
        }
        // convert new cellValue to insert key
        if (oldCellValue == null) {
            return {
                p: ['fields', fieldId],
                oi: newCellValue,
            };
        }
        return {
            p: ['fields', fieldId],
            od: oldCellValue,
            oi: newCellValue,
        };
    }
    detect(op) {
        const { p, oi, od } = op;
        const result = (0, common_1.pathMatcher)(p, ['fields', ':fieldId']);
        if (!result) {
            return null;
        }
        return {
            name: this.name,
            fieldId: result.fieldId,
            newCellValue: oi,
            oldCellValue: od,
        };
    }
}
exports.SetRecordBuilder = SetRecordBuilder;
