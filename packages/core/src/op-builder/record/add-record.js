"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddRecordBuilder = void 0;
const common_1 = require("../common");
class AddRecordBuilder {
    name = common_1.OpName.AddRecord;
    // you should only build an empty record
    build(record) {
        return {
            id: record.id,
            fields: {},
        };
    }
}
exports.AddRecordBuilder = AddRecordBuilder;
