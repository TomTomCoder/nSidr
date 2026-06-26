"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTableBuilder = void 0;
const common_1 = require("../common");
class AddTableBuilder {
    name = common_1.OpName.AddTable;
    build(table) {
        return table;
    }
}
exports.AddTableBuilder = AddTableBuilder;
