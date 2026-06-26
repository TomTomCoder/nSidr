"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDateFormatting = exports.formatDateToString = exports.defaultDatetimeFormatting = exports.datetimeFormattingSchema = exports.TimeFormatting = exports.DateFormattingPreset = void 0;
const date_fns_tz_1 = require("date-fns-tz");
const dayjs_1 = __importDefault(require("dayjs"));
const zod_1 = require("../../../zod");
const time_zone_1 = require("./time-zone");
var DateFormattingPreset;
(function (DateFormattingPreset) {
    DateFormattingPreset["US"] = "M/D/YYYY";
    DateFormattingPreset["European"] = "D/M/YYYY";
    DateFormattingPreset["Asian"] = "YYYY/MM/DD";
    DateFormattingPreset["ISO"] = "YYYY-MM-DD";
    DateFormattingPreset["YM"] = "YYYY-MM";
    DateFormattingPreset["MD"] = "MM-DD";
    DateFormattingPreset["Y"] = "YYYY";
    DateFormattingPreset["M"] = "MM";
    DateFormattingPreset["D"] = "DD";
})(DateFormattingPreset || (exports.DateFormattingPreset = DateFormattingPreset = {}));
var TimeFormatting;
(function (TimeFormatting) {
    TimeFormatting["Hour24"] = "HH:mm";
    TimeFormatting["Hour12"] = "hh:mm A";
    TimeFormatting["None"] = "None";
})(TimeFormatting || (exports.TimeFormatting = TimeFormatting = {}));
exports.datetimeFormattingSchema = zod_1.z
    .object({
    date: zod_1.z.string().meta({
        description: 'the display formatting of the date. you can use the following presets: ' +
            Object.values(DateFormattingPreset).join(', '),
    }),
    time: zod_1.z.enum(TimeFormatting).meta({
        description: 'the display formatting of the time. you can use the following presets: ' +
            Object.values(TimeFormatting).join(', '),
    }),
    timeZone: time_zone_1.timeZoneStringSchema,
})
    .describe('Only be used in date field (date field or formula / rollup field with cellValueType equals dateTime)')
    .meta({
    description: 'caveat: the formatting is just a formatter, it dose not effect the storing value of the record',
});
exports.defaultDatetimeFormatting = {
    date: DateFormattingPreset.ISO,
    time: TimeFormatting.None,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};
const formatDateToString = (cellValue, formatting) => {
    if (cellValue == null) {
        return '';
    }
    const { date, time, timeZone } = formatting ?? exports.defaultDatetimeFormatting;
    const format = time === TimeFormatting.None ? date : `${date} ${time}`;
    try {
        return (0, dayjs_1.default)(cellValue).tz(timeZone).format(format);
    }
    catch {
        // in export service case, crash in dayjs, so use date-fns-tz
        return (0, date_fns_tz_1.formatInTimeZone)(cellValue, timeZone, format.replace(/D/g, 'd').replace(/Y/g, 'y'));
    }
};
exports.formatDateToString = formatDateToString;
const normalizeDateFormatting = (dateFormatting) => {
    const validFormats = Object.values(DateFormattingPreset);
    if (validFormats.includes(dateFormatting)) {
        return dateFormatting;
    }
    return DateFormattingPreset.ISO;
};
exports.normalizeDateFormatting = normalizeDateFormatting;
