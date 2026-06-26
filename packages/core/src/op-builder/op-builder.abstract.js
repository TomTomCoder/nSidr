"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpBuilderAbstract = void 0;
class OpBuilderAbstract {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static editor;
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
exports.OpBuilderAbstract = OpBuilderAbstract;
