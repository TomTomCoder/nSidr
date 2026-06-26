"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatedTimeFieldCore = void 0;
const dayjs_1 = require("dayjs");
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const formatting_1 = require("../formatting");
const formula_field_abstract_1 = require("./abstract/formula.field.abstract");
const created_time_option_schema_1 = require("./created-time-option.schema");
(0, dayjs_1.extend)(timezone_1.default);
class CreatedTimeFieldCore extends formula_field_abstract_1.FormulaAbstractCore {
    type;
    getExpression() {
        return this.options.expression;
    }
    static defaultOptions() {
        return {
            formatting: formatting_1.defaultDatetimeFormatting,
        };
    }
    getDatetimeFormatting() {
        return this.options?.formatting ?? formatting_1.defaultDatetimeFormatting;
    }
    validateOptions() {
        return created_time_option_schema_1.createdTimeFieldOptionsRoSchema.safeParse(this.options);
    }
    accept(visitor) {
        return visitor.visitCreatedTimeField(this);
    }
}
exports.CreatedTimeFieldCore = CreatedTimeFieldCore;
