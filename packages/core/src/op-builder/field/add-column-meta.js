"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddColumnMetaBuilder = void 0;
const common_1 = require("../common");
class AddColumnMetaBuilder {
    name = common_1.OpName.AddColumnMeta;
    build(params) {
        const { viewId, newMetaValue, oldMetaValue } = params;
        return {
            p: ['columnMeta', viewId],
            oi: newMetaValue,
            ...(oldMetaValue ? { od: oldMetaValue } : {}),
        };
    }
    detect(op) {
        const { p, oi, od } = op;
        if (!oi) {
            return null;
        }
        const result = (0, common_1.pathMatcher)(p, ['columnMeta', ':viewId']);
        if (!result) {
            return null;
        }
        return {
            name: this.name,
            viewId: result.viewId,
            newMetaValue: oi,
            oldMetaValue: od,
        };
    }
}
exports.AddColumnMetaBuilder = AddColumnMetaBuilder;
