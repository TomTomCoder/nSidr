"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteColumnMetaBuilder = void 0;
const common_1 = require("../common");
class DeleteColumnMetaBuilder {
    name = common_1.OpName.DeleteColumnMeta;
    build(params) {
        const { viewId, oldMetaValue } = params;
        return {
            p: ['columnMeta', viewId],
            od: oldMetaValue,
        };
    }
    detect(op) {
        const { p, od, oi } = op;
        if (!od || oi) {
            return null;
        }
        const result = (0, common_1.pathMatcher)(p, ['columnMeta', ':viewId']);
        if (!result) {
            return null;
        }
        return {
            name: this.name,
            viewId: result.viewId,
            oldMetaValue: od,
        };
    }
}
exports.DeleteColumnMetaBuilder = DeleteColumnMetaBuilder;
