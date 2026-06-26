"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LastModifiedTimeFieldCore = void 0;
const dayjs_1 = require("dayjs");
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const formatting_1 = require("../formatting");
const formula_field_abstract_1 = require("./abstract/formula.field.abstract");
const last_modified_time_option_schema_1 = require("./last-modified-time-option.schema");
(0, dayjs_1.extend)(timezone_1.default);
class LastModifiedTimeFieldCore extends formula_field_abstract_1.FormulaAbstractCore {
    type;
    static defaultOptions() {
        return {
            formatting: formatting_1.defaultDatetimeFormatting,
            expression: 'LAST_MODIFIED_TIME()',
            trackedFieldIds: [],
        };
    }
    validateOptions() {
        return last_modified_time_option_schema_1.lastModifiedTimeFieldOptionsRoSchema.safeParse(this.options);
    }
    getExpression() {
        return this.options.expression;
    }
    getDatetimeFormatting() {
        return this.options?.formatting ?? formatting_1.defaultDatetimeFormatting;
    }
    getTrackedFieldIds() {
        return this.options?.trackedFieldIds ?? [];
    }
    isTrackAll() {
        const persistedAsGeneratedColumn = this.meta?.persistedAsGeneratedColumn;
        return persistedAsGeneratedColumn !== false && this.getTrackedFieldIds().length === 0;
    }
    shouldUpdate(changedFieldIds) {
        const trackedFieldIds = this.getTrackedFieldIds();
        return this.isTrackAll() || trackedFieldIds.some((id) => changedFieldIds.has(id));
    }
    accept(visitor) {
        return visitor.visitLastModifiedTimeField(this);
    }
}
exports.LastModifiedTimeFieldCore = LastModifiedTimeFieldCore;
