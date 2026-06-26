"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordOpBuilder = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const common_1 = require("../common");
const op_builder_abstract_1 = require("../op-builder.abstract");
const add_record_1 = require("./add-record");
const set_record_1 = require("./set-record");
class RecordOpBuilder {
    static editor = {
        [common_1.OpName.SetRecord]: new set_record_1.SetRecordBuilder(),
    };
    static creator = new add_record_1.AddRecordBuilder();
    static ops2Contexts = op_builder_abstract_1.OpBuilderAbstract.ops2Contexts;
    static detect = op_builder_abstract_1.OpBuilderAbstract.detect;
}
exports.RecordOpBuilder = RecordOpBuilder;
