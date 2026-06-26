"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableOpBuilder = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const common_1 = require("../common");
const op_builder_abstract_1 = require("../op-builder.abstract");
const add_table_1 = require("./add-table");
const set_table_property_1 = require("./set-table-property");
class TableOpBuilder {
    static editor = {
        [common_1.OpName.SetTableProperty]: new set_table_property_1.SetTablePropertyBuilder(),
    };
    static creator = new add_table_1.AddTableBuilder();
    static ops2Contexts = op_builder_abstract_1.OpBuilderAbstract.ops2Contexts;
    static detect = op_builder_abstract_1.OpBuilderAbstract.detect;
}
exports.TableOpBuilder = TableOpBuilder;
