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
exports.DateUtil = void 0;
const dayjs_1 = __importStar(require("dayjs"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
(0, dayjs_1.extend)(utc_1.default);
(0, dayjs_1.extend)(timezone_1.default);
class DateUtil {
    timeZone;
    useUTC;
    static NORM_YEAR_PATTERN = 'YYYY';
    static NORM_MONTH_PATTERN = 'YYYY-MM';
    static NORM_DATE_PATTERN = 'YYYY-MM-DD';
    static NORM_DATETIME_MINUTE_PATTERN = 'YYYY-MM-DD HH:mm';
    static NORM_DATETIME_PATTERN = 'YYYY-MM-DD HH:mm:ss';
    static NORM_DATETIME_MS_PATTERN = 'YYYY-MM-DD HH:mm:ss.SSS';
    static UTC_SIMPLE_PATTERN = 'YYYY-MM-DDTHH:mm:ss';
    static UTC_SIMPLE_MS_PATTERN = 'YYYY-MM-DDTHH:mm:ss.SSS';
    static UTC_WITH_ZONE_OFFSET_PATTERN = 'YYYY-MM-DDTHH:mm:ssZ';
    static UTC_MS_WITH_ZONE_OFFSET_PATTERN = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
    constructor(timeZone, useUTC = true) {
        this.timeZone = timeZone;
        this.useUTC = useUTC;
    }
    /**
     * Current time
     *
     * @param date Date
     * @return Current time
     */
    date(date) {
        return (this.useUTC ? (0, dayjs_1.default)(date).utc() : (0, dayjs_1.default)(date)).tz(this.timeZone);
    }
    /**
     * Current time, in the format YYYY-MM-DD HH:mm:ss
     *
     * @return The current time in standard form string
     */
    now() {
        return this.date().format(DateUtil.NORM_DATETIME_PATTERN);
    }
    /**
     * Current date, in the format YYYY-MM-DD
     *
     * @return Standard form string of the current date
     */
    today() {
        return this.date().format(DateUtil.NORM_DATE_PATTERN);
    }
    /**
     * Offset days
     *
     * @param offset offset days, positive numbers offset to the future, negative numbers offset to history
     * @param date Date
     * @return offset date
     */
    offsetDay(offset, date = this.date()) {
        return this.offset('day', offset, date);
    }
    /**
     * Offset week
     *
     * @param offset offset week, positive number offset to future, negative number offset to history
     * @param date Date
     * @return offset date
     */
    offsetWeek(offset, date = this.date()) {
        return this.offset('week', offset, date);
    }
    /**
     * Offset month
     *
     * @param offset offset months, positive offset to the future, negative offset to history
     * @param date Date
     * @return offset date
     */
    offsetMonth(offset, date = this.date()) {
        return this.offset('month', offset, date);
    }
    /**
     * Get the time after the specified date offset from the specified time, the generated offset date does not affect the original date
     *
     * @param dateField The granularity size of the offset (hour, day, month, etc.) {@link ManipulateType}
     * @param offset offset, positive number is backward offset, negative number is forward offset
     * @param date the base date
     * @return offset date
     */
    offset(dateField, offset, date = this.date()) {
        if (offset === 0) {
            return date;
        }
        return date[offset > 0 ? 'add' : 'subtract'](Math.abs(offset), dateField);
    }
    /**
     * Tomorrow
     *
     * @return Tomorrow
     */
    tomorrow() {
        return this.offsetDay(1);
    }
    /**
     * Yesterday
     *
     * @return yesterday
     */
    yesterday() {
        return this.offsetDay(-1);
    }
    /**
     * Last week
     *
     * @return Last week
     */
    lastWeek() {
        return this.offsetWeek(-1);
    }
    /**
     * Next week
     *
     * @return Next week
     */
    nextWeek() {
        return this.offsetWeek(1);
    }
    /**
     * Last month
     *
     * @return Last month
     */
    lastMonth() {
        return this.offsetMonth(-1);
    }
    /**
     * Next month
     *
     * @return Next month
     */
    nextMonth() {
        return this.offsetMonth(1);
    }
}
exports.DateUtil = DateUtil;
