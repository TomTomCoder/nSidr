"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateViewColumnMetaBuilder = void 0;
const common_1 = require("../common");
class UpdateViewColumnMetaBuilder {
    name = common_1.OpName.UpdateViewColumnMeta;
    build(params) {
        const { fieldId, newColumnMeta, oldColumnMeta } = params;
        return {
            p: ['columnMeta', fieldId],
            ...(newColumnMeta ? { oi: newColumnMeta } : {}),
            ...(oldColumnMeta ? { od: oldColumnMeta } : {}),
        };
    }
    detect(op) {
        const { p, oi, od } = op;
        const result = (0, common_1.pathMatcher)(p, ['columnMeta', ':fieldId']);
        if (!result) {
            return null;
        }
        return {
            name: this.name,
            fieldId: result.fieldId,
            newColumnMeta: oi,
            oldColumnMeta: od,
        };
    }
}
exports.UpdateViewColumnMetaBuilder = UpdateViewColumnMetaBuilder;
