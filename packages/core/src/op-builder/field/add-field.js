"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddFieldBuilder = void 0;
const common_1 = require("../common");
class AddFieldBuilder {
    name = common_1.OpName.AddField;
    build(field) {
        return field;
    }
}
exports.AddFieldBuilder = AddFieldBuilder;
