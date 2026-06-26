"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentFieldCore = exports.attachmentCellValueRoSchema = exports.attachmentCellValueSchema = exports.attachmentItemSchema = void 0;
const zod_1 = require("zod");
const utils_1 = require("../../../utils");
const constant_1 = require("../constant");
const field_1 = require("../field");
const attachment_option_schema_1 = require("./attachment-option.schema");
exports.attachmentItemSchema = zod_1.z.object({
    id: zod_1.z.string().startsWith(utils_1.IdPrefix.Attachment), // partial in Ro
    name: zod_1.z.string(),
    path: zod_1.z.string(),
    token: zod_1.z.string(),
    size: zod_1.z.number(),
    mimetype: zod_1.z.string(),
    presignedUrl: zod_1.z.string().optional(),
    width: zod_1.z.number().optional(),
    height: zod_1.z.number().optional(),
    smThumbnailUrl: zod_1.z.string().optional(),
    lgThumbnailUrl: zod_1.z.string().optional(),
});
// Simplified format: only name and token (backend will fetch other fields from DB)
// Optional id: if provided and exists in DB, the attachment will reuse that id
const attachmentItemRoSchema = exports.attachmentItemSchema.partial().required({ name: true, token: true });
exports.attachmentCellValueSchema = zod_1.z.array(exports.attachmentItemSchema);
exports.attachmentCellValueRoSchema = zod_1.z.array(attachmentItemRoSchema);
class AttachmentFieldCore extends field_1.FieldCore {
    type = constant_1.FieldType.Attachment;
    options;
    meta;
    cellValueType = constant_1.CellValueType.String;
    isMultipleCellValue = true;
    static CELL_VALUE_STRING_SPLITTER = ',';
    static defaultOptions() {
        return {};
    }
    static itemString(name, token) {
        return `${name} (${token})`;
    }
    cellValue2String(cellValue) {
        // TODO: The path is currently empty
        return cellValue
            ? cellValue
                .map(this.item2String)
                .join(AttachmentFieldCore.CELL_VALUE_STRING_SPLITTER)
            : '';
    }
    convertStringToCellValue(_value, _ctx) {
        return null;
    }
    repair(value) {
        if (this.isLookup) {
            return null;
        }
        if (this.validateCellValue(value).success) {
            return value;
        }
        return null;
    }
    validateOptions() {
        return attachment_option_schema_1.attachmentFieldOptionsSchema.safeParse(this.options);
    }
    validateCellValue(cellValue) {
        return exports.attachmentCellValueRoSchema.nonempty().nullable().safeParse(cellValue);
    }
    item2String(value) {
        if (value == null) {
            return '';
        }
        const { name, token } = value;
        return AttachmentFieldCore.itemString(name, token);
    }
    accept(visitor) {
        return visitor.visitAttachmentField(this);
    }
}
exports.AttachmentFieldCore = AttachmentFieldCore;
