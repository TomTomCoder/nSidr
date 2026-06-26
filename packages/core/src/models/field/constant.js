"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOT_NULL_VALIDATION_FIELD_TYPES = exports.UNIQUE_VALIDATION_FIELD_TYPES = exports.IMPORT_SUPPORTED_TYPES = exports.PRIMARY_SUPPORTED_TYPES = exports.isMultiValueLink = exports.RelationshipRevert = exports.Relationship = exports.CellValueType = exports.DbFieldType = exports.FieldType = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
var FieldType;
(function (FieldType) {
    FieldType["SingleLineText"] = "singleLineText";
    FieldType["LongText"] = "longText";
    FieldType["User"] = "user";
    FieldType["Attachment"] = "attachment";
    FieldType["Checkbox"] = "checkbox";
    FieldType["MultipleSelect"] = "multipleSelect";
    FieldType["SingleSelect"] = "singleSelect";
    FieldType["Date"] = "date";
    FieldType["Number"] = "number";
    FieldType["Rating"] = "rating";
    FieldType["Formula"] = "formula";
    FieldType["Rollup"] = "rollup";
    FieldType["ConditionalRollup"] = "conditionalRollup";
    FieldType["Link"] = "link";
    FieldType["CreatedTime"] = "createdTime";
    FieldType["LastModifiedTime"] = "lastModifiedTime";
    FieldType["CreatedBy"] = "createdBy";
    FieldType["LastModifiedBy"] = "lastModifiedBy";
    FieldType["AutoNumber"] = "autoNumber";
    FieldType["Button"] = "button";
    FieldType["Ai"] = "ai";
})(FieldType || (exports.FieldType = FieldType = {}));
var DbFieldType;
(function (DbFieldType) {
    DbFieldType["Text"] = "TEXT";
    DbFieldType["Integer"] = "INTEGER";
    DbFieldType["DateTime"] = "DATETIME";
    DbFieldType["Real"] = "REAL";
    DbFieldType["Blob"] = "BLOB";
    DbFieldType["Json"] = "JSON";
    DbFieldType["Boolean"] = "BOOLEAN";
})(DbFieldType || (exports.DbFieldType = DbFieldType = {}));
var CellValueType;
(function (CellValueType) {
    CellValueType["String"] = "string";
    CellValueType["Number"] = "number";
    CellValueType["Boolean"] = "boolean";
    CellValueType["DateTime"] = "dateTime";
})(CellValueType || (exports.CellValueType = CellValueType = {}));
var Relationship;
(function (Relationship) {
    Relationship["OneOne"] = "oneOne";
    Relationship["ManyMany"] = "manyMany";
    Relationship["OneMany"] = "oneMany";
    Relationship["ManyOne"] = "manyOne";
})(Relationship || (exports.Relationship = Relationship = {}));
// eslint-disable-next-line @typescript-eslint/naming-convention
exports.RelationshipRevert = {
    [Relationship.OneMany]: Relationship.ManyOne,
    [Relationship.ManyOne]: Relationship.OneMany,
    [Relationship.ManyMany]: Relationship.ManyMany,
    [Relationship.OneOne]: Relationship.OneOne,
};
const isMultiValueLink = (relationship) => relationship === Relationship.ManyMany || relationship === Relationship.OneMany;
exports.isMultiValueLink = isMultiValueLink;
exports.PRIMARY_SUPPORTED_TYPES = new Set([
    FieldType.SingleLineText,
    FieldType.LongText,
    FieldType.User,
    FieldType.MultipleSelect,
    FieldType.SingleSelect,
    FieldType.Date,
    FieldType.Number,
    FieldType.Rating,
    FieldType.Formula,
    FieldType.CreatedTime,
    FieldType.LastModifiedTime,
    FieldType.CreatedBy,
    FieldType.LastModifiedBy,
    FieldType.AutoNumber,
]);
exports.IMPORT_SUPPORTED_TYPES = [
    FieldType.SingleLineText,
    FieldType.LongText,
    FieldType.Date,
    FieldType.Number,
    FieldType.Attachment,
    FieldType.Checkbox,
    FieldType.MultipleSelect,
    FieldType.SingleSelect,
    FieldType.User,
];
exports.UNIQUE_VALIDATION_FIELD_TYPES = new Set([
    FieldType.SingleLineText,
    FieldType.LongText,
    FieldType.Number,
    FieldType.Date,
]);
exports.NOT_NULL_VALIDATION_FIELD_TYPES = new Set([
    FieldType.SingleLineText,
    FieldType.LongText,
    FieldType.Number,
    FieldType.SingleSelect,
    FieldType.MultipleSelect,
    FieldType.User,
    FieldType.Date,
    FieldType.Rating,
    FieldType.Attachment,
    FieldType.Link,
]);
