"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldOpBuilder = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const common_1 = require("../common");
const op_builder_abstract_1 = require("../op-builder.abstract");
const add_column_meta_1 = require("./add-column-meta");
const add_field_1 = require("./add-field");
const delete_column_meta_1 = require("./delete-column-meta");
const set_field_property_1 = require("./set-field-property");
class FieldOpBuilder {
    static editor = {
        [common_1.OpName.AddColumnMeta]: new add_column_meta_1.AddColumnMetaBuilder(),
        [common_1.OpName.DeleteColumnMeta]: new delete_column_meta_1.DeleteColumnMetaBuilder(),
        [common_1.OpName.SetFieldProperty]: new set_field_property_1.SetFieldPropertyBuilder(),
    };
    static creator = new add_field_1.AddFieldBuilder();
    static ops2Contexts = op_builder_abstract_1.OpBuilderAbstract.ops2Contexts;
    static detect = op_builder_abstract_1.OpBuilderAbstract.detect;
}
exports.FieldOpBuilder = FieldOpBuilder;
