"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateFieldCore = exports.dataFieldCellValueSchema = void 0;
const dayjs_1 = __importStar(require("dayjs"));
const customParseFormat_1 = __importDefault(require("dayjs/plugin/customParseFormat"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const zod_1 = require("zod");
const field_1 = require("../field");
const formatting_1 = require("../formatting");
const date_option_schema_1 = require("./date-option.schema");
(0, dayjs_1.extend)(timezone_1.default);
(0, dayjs_1.extend)(customParseFormat_1.default);
(0, dayjs_1.extend)(utc_1.default);
// Stored date/time values can come from client-side `Date.toISOString()` (millisecond precision)
// or from database JSON aggregation (which may omit fractional seconds when zero).
// Accept both, while still requiring an explicit timezone offset (e.g. `Z`, `+00:00`).
exports.dataFieldCellValueSchema = zod_1.z.string().datetime({ offset: true });
class DateFieldCore extends field_1.FieldCore {
    type;
    options;
    meta;
    cellValueType;
    static defaultOptions() {
        return {
            formatting: formatting_1.defaultDatetimeFormatting,
        };
    }
    getDatetimeFormatting() {
        return this.options?.formatting ?? formatting_1.defaultDatetimeFormatting;
    }
    cellValue2String(cellValue) {
        if (cellValue == null)
            return '';
        if (this.isMultipleCellValue && Array.isArray(cellValue)) {
            return cellValue.map((v) => this.item2String(v)).join(', ');
        }
        return this.item2String(cellValue);
    }
    defaultTzFormat(value) {
        const { timeZone } = this.getDatetimeFormatting();
        try {
            const formatValue = dayjs_1.default.tz(value, timeZone);
            if (!formatValue.isValid())
                return null;
            return formatValue.toISOString();
        }
        catch {
            return null;
        }
    }
    parseUsingFieldFormatting(value) {
        const formatting = this.getDatetimeFormatting();
        const hasTime = /\d{1,2}:\d{2}(?::\d{2})?/.test(value);
        const dateFormat = formatting.date;
        const timeFormat = hasTime && formatting.time !== formatting_1.TimeFormatting.None ? formatting.time : null;
        const format = timeFormat ? `${dateFormat} ${timeFormat}` : dateFormat;
        try {
            const check = (0, dayjs_1.default)(value, format, true).isValid();
            if (!check)
                return null;
            const formatValue = dayjs_1.default.tz(value, format, formatting.timeZone);
            if (!formatValue.isValid())
                return null;
            const isoString = formatValue.toISOString();
            if (isoString.startsWith('-'))
                return null;
            return isoString;
        }
        catch {
            return null;
        }
    }
    // eslint-disable-next-line sonarjs/cognitive-complexity
    convertStringToCellValue(value) {
        if (this.isLookup) {
            return null;
        }
        if (value === '' || value == null)
            return null;
        if (value === 'now') {
            return (0, dayjs_1.default)().toISOString();
        }
        const dayjsObj = (0, dayjs_1.default)(value);
        if (dayjsObj.isValid() && dayjsObj.toISOString() === value) {
            return value;
        }
        const formatted = this.parseUsingFieldFormatting(value);
        if (formatted)
            return formatted;
        return this.defaultTzFormat(value);
    }
    item2String(item) {
        return (0, formatting_1.formatDateToString)(item, this.getDatetimeFormatting());
    }
    repair(value) {
        if (this.isLookup) {
            return null;
        }
        if (typeof value === 'string' || typeof value === 'number') {
            return this.convertStringToCellValue(value);
        }
        return null;
    }
    validateOptions() {
        return date_option_schema_1.dateFieldOptionsSchema.safeParse(this.options);
    }
    validateCellValue(cellValue) {
        if (this.isMultipleCellValue) {
            return zod_1.z.array(exports.dataFieldCellValueSchema).nonempty().nullable().safeParse(cellValue);
        }
        return exports.dataFieldCellValueSchema.nullable().safeParse(cellValue);
    }
    validateCellValueLoose(cellValue) {
        if (this.isMultipleCellValue) {
            return zod_1.z.array(zod_1.z.string()).nonempty().nullable().safeParse(cellValue);
        }
        return zod_1.z.string().nullable().safeParse(cellValue);
    }
    accept(visitor) {
        return visitor.visitDateField(this);
    }
}
exports.DateFieldCore = DateFieldCore;
