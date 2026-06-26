"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSchema = exports.RecordCore = exports.CellFormat = exports.FieldKeyType = void 0;
const zod_1 = require("zod");
const utils_1 = require("../../utils");
var FieldKeyType;
(function (FieldKeyType) {
    FieldKeyType["Id"] = "id";
    FieldKeyType["Name"] = "name";
    FieldKeyType["DbFieldName"] = "dbFieldName";
})(FieldKeyType || (exports.FieldKeyType = FieldKeyType = {}));
var CellFormat;
(function (CellFormat) {
    CellFormat["Json"] = "json";
    CellFormat["Text"] = "text";
})(CellFormat || (exports.CellFormat = CellFormat = {}));
class RecordCore {
    fieldMap;
    constructor(fieldMap) {
        this.fieldMap = fieldMap;
    }
    name;
    commentCount;
    createdTime;
    id;
    isDeleted = false;
    fields;
    permissions;
    undeletable;
    getCellValue(fieldId) {
        return this.fields[fieldId];
    }
    getCellValueAsString(fieldId) {
        return this.fieldMap[fieldId].cellValue2String(this.fields[fieldId]);
    }
}
exports.RecordCore = RecordCore;
exports.recordSchema = zod_1.z.object({
    id: zod_1.z.string().startsWith(utils_1.IdPrefix.Record).meta({
        description: 'The record id.',
    }),
    name: zod_1.z.string().optional().meta({ description: 'primary field value' }),
    fields: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).meta({
        description: 'Objects with a fields key mapping fieldId or field name to value for that field.',
    }),
    autoNumber: zod_1.z.number().optional().meta({
        description: 'Auto number, a unique identifier for each record',
    }),
    createdTime: zod_1.z.string().optional().meta({
        description: 'Created time, date ISO string (new Date().toISOString).',
    }),
    lastModifiedTime: zod_1.z.string().optional().meta({
        description: 'Last modified time, date ISO string (new Date().toISOString).',
    }),
    createdBy: zod_1.z.string().optional().meta({
        description: 'Created by, user name',
    }),
    lastModifiedBy: zod_1.z.string().optional().meta({
        description: 'Last modified by, user name',
    }),
    permissions: zod_1.z.record(zod_1.z.string(), zod_1.z.record(zod_1.z.string(), zod_1.z.boolean())).optional().meta({
        description: 'Permissions for the record',
    }),
    undeletable: zod_1.z.boolean().optional().meta({
        description: 'Whether the record is undeletable',
    }),
});
