"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingFieldCore = void 0;
const zod_1 = require("zod");
const colors_1 = require("../colors");
const field_1 = require("../field");
const formatting_1 = require("../formatting");
const rating_option_schema_1 = require("./rating-option.schema");
class RatingFieldCore extends field_1.FieldCore {
    type;
    options;
    meta;
    cellValueType;
    static defaultOptions() {
        return {
            icon: rating_option_schema_1.RatingIcon.Star,
            color: colors_1.Colors.YellowBright,
            max: 5,
        };
    }
    cellValue2String(cellValue) {
        if (cellValue == null) {
            return '';
        }
        if (this.isMultipleCellValue && Array.isArray(cellValue)) {
            return cellValue.map((v) => this.item2String(v)).join(', ');
        }
        return this.item2String(cellValue);
    }
    item2String(value) {
        if (value == null) {
            return '';
        }
        return String(value);
    }
    convertStringToCellValue(value) {
        if (this.isLookup) {
            return null;
        }
        const num = (0, formatting_1.parseStringToNumber)(value);
        return num == null ? null : Math.min(Math.round(num), this.options.max ?? 10);
    }
    repair(value) {
        if (this.isLookup) {
            return null;
        }
        if (typeof value === 'number') {
            return Math.min(Math.round(value), this.options.max ?? 10);
        }
        if (typeof value === 'string') {
            return this.convertStringToCellValue(value);
        }
        return null;
    }
    validateOptions() {
        return rating_option_schema_1.ratingFieldOptionsSchema.safeParse(this.options);
    }
    validateCellValue(value) {
        if (this.isMultipleCellValue) {
            return zod_1.z
                .array(zod_1.z
                .number()
                .int()
                .max(this.options.max ?? 10)
                .min(1))
                .nonempty()
                .nullable()
                .safeParse(value);
        }
        return zod_1.z
            .number()
            .int()
            .max(this.options.max ?? 10)
            .min(1)
            .nullable()
            .safeParse(value);
    }
    accept(visitor) {
        return visitor.visitRatingField(this);
    }
}
exports.RatingFieldCore = RatingFieldCore;
