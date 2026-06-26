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
exports.LastModifiedTime = exports.CreatedTime = exports.DatetimeParse = exports.DatetimeFormat = exports.Timestr = exports.Datestr = exports.DateAdd = exports.IsBefore = exports.IsAfter = exports.IsSame = exports.WorkdayDiff = exports.Workday = exports.DatetimeDiff = exports.ToNow = exports.FromNow = exports.Second = exports.Minute = exports.Hour = exports.Day = exports.Weekday = exports.WeekNum = exports.Month = exports.Year = exports.Now = exports.Today = exports.getDayjs = exports.dayjs = void 0;
const dayjs_1 = __importStar(require("dayjs"));
exports.dayjs = dayjs_1.default;
const customParseFormat_1 = __importDefault(require("dayjs/plugin/customParseFormat"));
const isBetween_1 = __importDefault(require("dayjs/plugin/isBetween"));
const relativeTime_1 = __importDefault(require("dayjs/plugin/relativeTime"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const weekOfYear_1 = __importDefault(require("dayjs/plugin/weekOfYear"));
const lodash_1 = require("lodash");
const constant_1 = require("../../models/field/constant");
const common_1 = require("./common");
const logical_1 = require("./logical");
dayjs_1.default.extend(relativeTime_1.default);
dayjs_1.default.extend(weekOfYear_1.default);
dayjs_1.default.extend(isBetween_1.default);
dayjs_1.default.extend(customParseFormat_1.default);
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
class DateTimeFunc extends common_1.FormulaFunc {
    type = common_1.FormulaFuncType.DateTime;
}
const unitSet = new Set([
    'millisecond',
    'second',
    'minute',
    'hour',
    'day',
    'week',
    'month',
    'year',
    'ms',
    's',
    'm',
    'h',
    'd',
    'w',
    'M',
    'y',
]);
const getUnit = (unit) => {
    const unitStr = unit;
    if (unitSet.has(unitStr))
        return unitStr;
    return 'second';
};
const dateOnlyFormat = 'YYYY-MM-DD';
function isISODateString(dateString) {
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
    return isoDatePattern.test(dateString);
}
const normalizeDateTimeParseInput = (isoStr) => isoStr.trim().replace(/\//g, '-').replace('T', ' ');
const inferDateTimeParseFormat = (isoStr) => {
    if (!/^\d{4}-\d{1,2}-\d{1,2}(?: \d{1,2}:\d{1,2}(?::\d{1,2}(?:\.\d{1,3})?)?)?$/.test(isoStr)) {
        return null;
    }
    const timePart = isoStr.split(' ')[1];
    if (!timePart)
        return 'YYYY-M-D';
    const timeSegments = timePart.split(':');
    if (timeSegments.length < 2 || timeSegments.length > 3)
        return null;
    if (!/^\d{1,2}$/.test(timeSegments[0]) || !/^\d{1,2}$/.test(timeSegments[1]))
        return null;
    if (timeSegments.length === 2)
        return 'YYYY-M-D H:m';
    const [second, fractional] = timeSegments[2].split('.');
    if (!/^\d{1,2}$/.test(second))
        return null;
    if (!fractional)
        return 'YYYY-M-D H:m:s';
    const msToken = 'S'.repeat(Math.max(1, Math.min(3, fractional.length)));
    return `YYYY-M-D H:m:s.${msToken}`;
};
const getDayjs = (isoStr, timeZone, customFormat) => {
    if (isoStr == null)
        return null;
    if ((0, dayjs_1.isDayjs)(isoStr))
        return isoStr;
    if (!(0, lodash_1.isString)(isoStr))
        throw new logical_1.FormulaBaseError();
    let date;
    if (customFormat) {
        // For custom format, assume it's in the specified timezone
        date = dayjs_1.default.tz(isoStr, customFormat, timeZone);
    }
    else if (isISODateString(isoStr)) {
        // If it's a valid ISO string, convert to the specified timezone
        date = (0, dayjs_1.default)(isoStr).tz(timeZone);
    }
    else {
        // For other formats (including local date-time text), interpret as local time in target timezone.
        const normalizedInput = normalizeDateTimeParseInput(isoStr);
        const format = inferDateTimeParseFormat(normalizedInput);
        date = format
            ? dayjs_1.default.tz(normalizedInput, format, timeZone)
            : dayjs_1.default.tz(normalizedInput, timeZone);
    }
    if (!date.isValid())
        throw new logical_1.FormulaBaseError();
    return date;
};
exports.getDayjs = getDayjs;
const normalizeToCalendarDate = (date, timeZone) => dayjs_1.default.tz(date.format(dateOnlyFormat), dateOnlyFormat, timeZone);
class Today extends DateTimeFunc {
    name = common_1.FunctionName.Today;
    acceptValueType = new Set([]);
    acceptMultipleValue = false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    validateParams(_params) { }
    getReturnType() {
        return { type: constant_1.CellValueType.DateTime };
    }
    eval(_params, context) {
        return (0, dayjs_1.default)().tz(context.timeZone).startOf('d').toISOString();
    }
}
exports.Today = Today;
class Now extends DateTimeFunc {
    name = common_1.FunctionName.Now;
    acceptValueType = new Set([]);
    acceptMultipleValue = false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    validateParams(_params) { }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.DateTime };
    }
    eval(_params, context) {
        return (0, dayjs_1.default)().tz(context.timeZone).toISOString();
    }
}
exports.Now = Now;
class Year extends DateTimeFunc {
    name = common_1.FunctionName.Year;
    acceptValueType = new Set([constant_1.CellValueType.DateTime]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Year} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params, context) {
        const value = params[0].value;
        return (0, exports.getDayjs)(value, context.timeZone)?.year() ?? null;
    }
}
exports.Year = Year;
class Month extends DateTimeFunc {
    name = common_1.FunctionName.Month;
    acceptValueType = new Set([constant_1.CellValueType.DateTime]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Month} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params, context) {
        const value = params[0].value;
        const month = (0, exports.getDayjs)(value, context.timeZone)?.month() ?? null;
        return (0, lodash_1.isNumber)(month) ? month + 1 : null;
    }
}
exports.Month = Month;
class WeekNum extends DateTimeFunc {
    name = common_1.FunctionName.WeekNum;
    acceptValueType = new Set([constant_1.CellValueType.DateTime]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.WeekNum} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params, context) {
        const value = params[0].value;
        return (0, exports.getDayjs)(value, context.timeZone)?.week() ?? null;
    }
}
exports.WeekNum = WeekNum;
class Weekday extends DateTimeFunc {
    name = common_1.FunctionName.Weekday;
    acceptValueType = new Set([constant_1.CellValueType.DateTime, constant_1.CellValueType.String]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.Weekday} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params, context) {
        const value = params[0].value;
        const startDayOfWeek = params[1]?.value ?? 'sunday';
        const currentDate = (0, exports.getDayjs)(value, context.timeZone);
        if (currentDate == null)
            return null;
        const weekday = currentDate.day();
        if (startDayOfWeek.toLowerCase() === 'monday') {
            return weekday === 0 ? 6 : weekday - 1;
        }
        return weekday;
    }
}
exports.Weekday = Weekday;
class Day extends DateTimeFunc {
    name = common_1.FunctionName.Day;
    acceptValueType = new Set([constant_1.CellValueType.DateTime]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Day} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params, context) {
        const value = params[0].value;
        return (0, exports.getDayjs)(value, context.timeZone)?.date() ?? null;
    }
}
exports.Day = Day;
class Hour extends DateTimeFunc {
    name = common_1.FunctionName.Hour;
    acceptValueType = new Set([constant_1.CellValueType.DateTime]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Hour} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params, context) {
        const value = params[0].value;
        return (0, exports.getDayjs)(value, context.timeZone)?.hour() ?? null;
    }
}
exports.Hour = Hour;
class Minute extends DateTimeFunc {
    name = common_1.FunctionName.Minute;
    acceptValueType = new Set([constant_1.CellValueType.DateTime]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Minute} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params, context) {
        const value = params[0].value;
        return (0, exports.getDayjs)(value, context.timeZone)?.minute() ?? null;
    }
}
exports.Minute = Minute;
class Second extends DateTimeFunc {
    name = common_1.FunctionName.Second;
    acceptValueType = new Set([constant_1.CellValueType.DateTime]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Second} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params, context) {
        const value = params[0].value;
        return (0, exports.getDayjs)(value, context.timeZone)?.second() ?? null;
    }
}
exports.Second = Second;
class FromNow extends DateTimeFunc {
    name = common_1.FunctionName.FromNow;
    acceptValueType = new Set([constant_1.CellValueType.DateTime, constant_1.CellValueType.String, constant_1.CellValueType.Boolean]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.FromNow} needs at least 2 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params, context) {
        const targetDate = (0, exports.getDayjs)(params[0].value, context.timeZone);
        const unit = (params[1]?.value ?? 'd');
        const isFloat = Boolean(params[2]?.value ?? false);
        const diffCount = (0, dayjs_1.default)().diff(targetDate, unit, isFloat);
        return (0, lodash_1.isNumber)(diffCount) ? Math.abs(diffCount) : null;
    }
}
exports.FromNow = FromNow;
class ToNow extends FromNow {
    name = common_1.FunctionName.ToNow;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.ToNow} needs at least 2 params`);
        }
    }
}
exports.ToNow = ToNow;
class DatetimeDiff extends DateTimeFunc {
    name = common_1.FunctionName.DatetimeDiff;
    acceptValueType = new Set([constant_1.CellValueType.DateTime, constant_1.CellValueType.String, constant_1.CellValueType.Boolean]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.DatetimeDiff} needs at least 2 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params, context) {
        const startDate = (0, exports.getDayjs)(params[0].value, context.timeZone);
        const endDate = (0, exports.getDayjs)(params[1].value, context.timeZone);
        const unit = (params[2]?.value ?? 'second');
        const isFloat = Boolean(params[3]?.value ?? false);
        if (startDate == null || endDate == null)
            return null;
        const diffCount = startDate.diff(endDate, unit, isFloat);
        return (0, lodash_1.isNumber)(diffCount) ? diffCount : null;
    }
}
exports.DatetimeDiff = DatetimeDiff;
class Workday extends DateTimeFunc {
    name = common_1.FunctionName.Workday;
    acceptValueType = new Set([constant_1.CellValueType.DateTime, constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.Workday} needs at least 2 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.DateTime };
    }
    eval(params, context) {
        const startDate = (0, exports.getDayjs)(params[0].value, context.timeZone);
        if (startDate == null)
            return null;
        const count = Number(params[1].value ?? 0);
        const holidayStr = params[2]?.value;
        const holidays = ((0, lodash_1.isString)(holidayStr)
            ? holidayStr
                .split(',')
                .map((str) => (0, exports.getDayjs)(str.trim(), context.timeZone))
                .filter(Boolean)
            : []);
        const unit = 'day';
        const efficientSign = count > 0 ? 1 : -1;
        const weeks = Math.floor(count / 5);
        const extraDays = count % 5;
        let targetDate = startDate.add(weeks * 7, unit);
        for (let i = 0; i < extraDays;) {
            targetDate = targetDate.add(efficientSign, unit);
            const holidayIndex = holidays.findIndex((holiday) => holiday.isSame(targetDate, unit));
            if (holidayIndex > -1)
                holidays.splice(holidayIndex);
            if (targetDate.day() !== 0 && targetDate.day() !== 6 && holidayIndex === -1) {
                i++;
            }
        }
        let daysToAdjust = holidays.filter((date) => {
            return date.isBetween(startDate, targetDate, 'day', '[]') && ![0, 6].includes(date.day());
        }).length;
        while (daysToAdjust > 0) {
            targetDate = targetDate.add(efficientSign, unit);
            if (targetDate.day() !== 0 &&
                targetDate.day() !== 6 &&
                !holidays.some((holiday) => holiday.isSame(targetDate, unit))) {
                daysToAdjust--;
            }
        }
        return targetDate.toISOString();
    }
}
exports.Workday = Workday;
class WorkdayDiff extends DateTimeFunc {
    name = common_1.FunctionName.WorkdayDiff;
    acceptValueType = new Set([constant_1.CellValueType.DateTime, constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.WorkdayDiff} needs at least 2 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params, context) {
        const startDate = (0, exports.getDayjs)(params[0].value, context.timeZone);
        const endDate = (0, exports.getDayjs)(params[1].value, context.timeZone);
        if (startDate == null || endDate == null)
            return null;
        const holidayStr = params[2]?.value;
        const holidays = ((0, lodash_1.isString)(holidayStr)
            ? holidayStr
                .split(',')
                .map((str) => (0, exports.getDayjs)(str.trim(), context.timeZone))
                .filter((date) => date != null)
                .map((date) => normalizeToCalendarDate(date, context.timeZone))
            : []);
        const normalizedStartDate = normalizeToCalendarDate(startDate, context.timeZone);
        const normalizedEndDate = normalizeToCalendarDate(endDate, context.timeZone);
        const isForward = normalizedEndDate.isSame(normalizedStartDate, 'day') ||
            normalizedEndDate.isAfter(normalizedStartDate, 'day');
        const minDate = isForward ? normalizedStartDate : normalizedEndDate;
        const maxDate = isForward ? normalizedEndDate : normalizedStartDate;
        let currentDay = minDate.add(1, 'day');
        let count = 0;
        while (currentDay.isSame(maxDate, 'day') || currentDay.isBefore(maxDate, 'day')) {
            const isWeekend = currentDay.day() === 0 || currentDay.day() === 6;
            const isHoliday = holidays.some((holiday) => holiday.isSame(currentDay, 'day'));
            if (!isWeekend && !isHoliday) {
                count++;
            }
            currentDay = currentDay.add(1, 'day');
        }
        return isForward ? count : -count;
    }
}
exports.WorkdayDiff = WorkdayDiff;
class IsSame extends DateTimeFunc {
    name = common_1.FunctionName.IsSame;
    acceptValueType = new Set([constant_1.CellValueType.DateTime, constant_1.CellValueType.String]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.IsSame} needs at least 2 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Boolean };
    }
    eval(params, context) {
        const date1 = (0, exports.getDayjs)(params[0].value, context.timeZone);
        const date2 = (0, exports.getDayjs)(params[1].value, context.timeZone);
        if (date1 == null || date2 == null)
            return null;
        const unit = (params[2]?.value ?? 'd');
        return date1.isSame(date2, unit);
    }
}
exports.IsSame = IsSame;
class IsAfter extends DateTimeFunc {
    name = common_1.FunctionName.IsAfter;
    acceptValueType = new Set([constant_1.CellValueType.DateTime, constant_1.CellValueType.String]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.IsAfter} needs at least 2 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Boolean };
    }
    eval(params, context) {
        const date1 = (0, exports.getDayjs)(params[0].value, context.timeZone);
        const date2 = (0, exports.getDayjs)(params[1].value, context.timeZone);
        if (date1 == null || date2 == null)
            return null;
        const unit = (params[2]?.value ?? 'd');
        return date1.isAfter(date2, unit);
    }
}
exports.IsAfter = IsAfter;
class IsBefore extends DateTimeFunc {
    name = common_1.FunctionName.IsBefore;
    acceptValueType = new Set([constant_1.CellValueType.DateTime, constant_1.CellValueType.String]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.IsBefore} needs at least 2 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Boolean };
    }
    eval(params, context) {
        const date1 = (0, exports.getDayjs)(params[0].value, context.timeZone);
        const date2 = (0, exports.getDayjs)(params[1].value, context.timeZone);
        if (date1 == null || date2 == null)
            return null;
        const unit = (params[2]?.value ?? 'd');
        return date1.isBefore(date2, unit);
    }
}
exports.IsBefore = IsBefore;
class DateAdd extends DateTimeFunc {
    name = common_1.FunctionName.DateAdd;
    acceptValueType = new Set([constant_1.CellValueType.DateTime, constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 3) {
            throw new Error(`${common_1.FunctionName.DateAdd} needs at least 3 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.DateTime };
    }
    eval(params, context) {
        const date = (0, exports.getDayjs)(params[0].value, context.timeZone);
        if (date == null)
            return null;
        const count = Number(params[1].value ?? 0);
        const unit = getUnit(params[2].value);
        return date.add(Number(count), unit).toISOString();
    }
}
exports.DateAdd = DateAdd;
class Datestr extends DateTimeFunc {
    name = common_1.FunctionName.Datestr;
    acceptValueType = new Set([constant_1.CellValueType.DateTime]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Datestr} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params, context) {
        const date = (0, exports.getDayjs)(params[0].value, context.timeZone);
        if (date == null)
            return null;
        return date.format(dateOnlyFormat);
    }
}
exports.Datestr = Datestr;
class Timestr extends DateTimeFunc {
    name = common_1.FunctionName.Timestr;
    acceptValueType = new Set([constant_1.CellValueType.DateTime]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Timestr} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params, context) {
        const date = (0, exports.getDayjs)(params[0].value, context.timeZone);
        if (date == null)
            return null;
        return date.format('HH:mm:ss');
    }
}
exports.Timestr = Timestr;
class DatetimeFormat extends DateTimeFunc {
    name = common_1.FunctionName.DatetimeFormat;
    acceptValueType = new Set([constant_1.CellValueType.DateTime, constant_1.CellValueType.String]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.DatetimeFormat} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params, context) {
        const date = (0, exports.getDayjs)(params[0].value, context.timeZone);
        if (date == null)
            return null;
        const formatString = String(params[1]?.value || 'YYYY-MM-DD HH:mm');
        return date.format(formatString);
    }
}
exports.DatetimeFormat = DatetimeFormat;
class DatetimeParse extends DateTimeFunc {
    name = common_1.FunctionName.DatetimeParse;
    acceptValueType = new Set([constant_1.CellValueType.DateTime, constant_1.CellValueType.String]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.DatetimeParse} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.DateTime };
    }
    eval(params, context) {
        const format = params[1]?.value;
        if (params[0].type === constant_1.CellValueType.DateTime && format) {
            const sourceDate = (0, exports.getDayjs)(params[0].value, context.timeZone);
            if (sourceDate == null) {
                return null;
            }
            const reparsedDate = (0, exports.getDayjs)(sourceDate.format(format), context.timeZone, format);
            return reparsedDate?.toISOString() ?? null;
        }
        const date = (0, exports.getDayjs)(params[0].value, context.timeZone, format);
        if (date == null)
            return null;
        return date.toISOString();
    }
}
exports.DatetimeParse = DatetimeParse;
class CreatedTime extends DateTimeFunc {
    name = common_1.FunctionName.CreatedTime;
    acceptValueType = new Set([constant_1.CellValueType.DateTime]);
    acceptMultipleValue = false;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    validateParams() { }
    getReturnType() {
        return { type: constant_1.CellValueType.DateTime };
    }
    eval(params, context) {
        return context.record.createdTime ?? null;
    }
}
exports.CreatedTime = CreatedTime;
class LastModifiedTime extends DateTimeFunc {
    name = common_1.FunctionName.LastModifiedTime;
    acceptValueType = new Set([
        constant_1.CellValueType.String,
        constant_1.CellValueType.Number,
        constant_1.CellValueType.Boolean,
        constant_1.CellValueType.DateTime,
    ]);
    acceptMultipleValue = false;
    validateParams(params) {
        if (!params.length)
            return;
        if (params.some((param) => !param?.field)) {
            throw new Error(`${common_1.FunctionName.LastModifiedTime} parameter must be a field reference`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.DateTime };
    }
    eval(params, context) {
        this.validateParams(params);
        return context.record.lastModifiedTime ?? null;
    }
}
exports.LastModifiedTime = LastModifiedTime;
