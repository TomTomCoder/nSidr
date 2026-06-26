"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddViewBuilder = void 0;
const common_1 = require("../common");
class AddViewBuilder {
    name = common_1.OpName.AddView;
    build(view) {
        return view;
    }
}
exports.AddViewBuilder = AddViewBuilder;
