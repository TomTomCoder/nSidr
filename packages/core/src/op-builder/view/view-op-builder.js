"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewOpBuilder = void 0;
const common_1 = require("../common");
const add_view_1 = require("./add-view");
const set_view_property_1 = require("./set-view-property");
const update_view_column_meta_1 = require("./update-view-column-meta");
class ViewOpBuilder {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static editor = {
        [common_1.OpName.SetViewProperty]: new set_view_property_1.SetViewPropertyBuilder(),
        [common_1.OpName.UpdateViewColumnMeta]: new update_view_column_meta_1.UpdateViewColumnMetaBuilder(),
    };
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static creator = new add_view_1.AddViewBuilder();
    static ops2Contexts(ops) {
        return ops.map((op) => {
            const result = this.detect(op);
            if (!result) {
                throw new Error(`can't detect op: ${JSON.stringify(op)}`);
            }
            return result;
        });
    }
    static detect(op) {
        for (const builder of Object.values(this.editor)) {
            const result = builder.detect(op);
            if (result) {
                return result;
            }
        }
        return null;
    }
}
exports.ViewOpBuilder = ViewOpBuilder;
