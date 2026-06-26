"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStringToNumber = exports.formatNumberToString = exports.defaultNumberFormatting = exports.numberFormattingSchema = exports.currencyFormattingSchema = exports.percentFormattingSchema = exports.decimalFormattingSchema = exports.NumberFormattingType = void 0;
const zod_1 = require("zod");
var NumberFormattingType;
(function (NumberFormattingType) {
    NumberFormattingType["Decimal"] = "decimal";
    NumberFormattingType["Percent"] = "percent";
    NumberFormattingType["Currency"] = "currency";
})(NumberFormattingType || (exports.NumberFormattingType = NumberFormattingType = {}));
const baseFormatting = zod_1.z.object({
    precision: zod_1.z.number().max(5).min(0),
});
exports.decimalFormattingSchema = baseFormatting
    .extend({
    type: zod_1.z.literal(NumberFormattingType.Decimal),
})
    .strict();
exports.percentFormattingSchema = baseFormatting
    .extend({
    type: zod_1.z.literal(NumberFormattingType.Percent),
})
    .strict();
exports.currencyFormattingSchema = baseFormatting
    .extend({
    type: zod_1.z.literal(NumberFormattingType.Currency),
    symbol: zod_1.z.string(),
})
    .strict();
exports.numberFormattingSchema = zod_1.z
    .discriminatedUnion('type', [
    exports.decimalFormattingSchema,
    exports.percentFormattingSchema,
    exports.currencyFormattingSchema,
])
    .describe('Only be used in number field (number field or formula / rollup field with cellValueType equals Number');
exports.defaultNumberFormatting = {
    type: NumberFormattingType.Decimal,
    precision: 2,
};
const formatNumberToString = (value, formatting) => {
    if (value == null) {
        return '';
    }
    const cellValue = Number(value);
    const { type, precision } = formatting;
    if (type === NumberFormattingType.Currency) {
        const symbol = formatting.symbol ?? '$';
        const sign = cellValue < 0 ? '-' : '';
        const options = precision != null
            ? {
                minimumFractionDigits: precision,
                maximumFractionDigits: precision,
            }
            : undefined;
        const formattedValue = Math.abs(cellValue).toLocaleString('en-US', options);
        return sign + symbol + formattedValue;
    }
    if (type === NumberFormattingType.Percent) {
        const formattedNumber = (cellValue * 100).toFixed(precision);
        return `${formattedNumber}%`;
    }
    if (precision != null) {
        return cellValue.toFixed(precision);
    }
    return String(cellValue);
};
exports.formatNumberToString = formatNumberToString;
const parseStringToNumber = (value, formatting) => {
    if (value == null || value === '')
        return null;
    const originStr = String(value);
    const isPercent = formatting?.type === NumberFormattingType.Percent || originStr.includes('%');
    const numberReg = /[^\d.+-]/g;
    const symbolReg = /([+\-.])+/g;
    const numStr = originStr.replace(numberReg, '').replace(symbolReg, '$1');
    const num = parseFloat(numStr);
    if (Number.isNaN(num)) {
        return null;
    }
    return isPercent ? num / 100 : num;
};
exports.parseStringToNumber = parseStringToNumber;
