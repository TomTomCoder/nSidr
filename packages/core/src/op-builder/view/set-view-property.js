"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetViewPropertyBuilder = void 0;
const common_1 = require("../common");
class SetViewPropertyBuilder {
    name = common_1.OpName.SetViewProperty;
    build(params) {
        const { key, newValue, oldValue } = params;
        return {
            p: [key],
            ...(newValue == null ? {} : { oi: newValue }),
            ...(oldValue == null ? {} : { od: oldValue }),
        };
    }
    detect(op) {
        const { p, oi, od } = op;
        const result = (0, common_1.pathMatcher)(p, ['*']);
        if (!result) {
            return null;
        }
        return {
            name: this.name,
            key: p[0],
            newValue: oi,
            oldValue: od,
        };
    }
}
exports.SetViewPropertyBuilder = SetViewPropertyBuilder;
