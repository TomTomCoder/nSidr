"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionName = exports.FormulaFunc = exports.FormulaFuncType = void 0;
var FormulaFuncType;
(function (FormulaFuncType) {
    FormulaFuncType["Array"] = "Array";
    FormulaFuncType["DateTime"] = "DataTime";
    FormulaFuncType["Logical"] = "Logical";
    FormulaFuncType["Numeric"] = "Numeric";
    FormulaFuncType["Text"] = "Text";
    FormulaFuncType["System"] = "System";
})(FormulaFuncType || (exports.FormulaFuncType = FormulaFuncType = {}));
class FormulaFunc {
}
exports.FormulaFunc = FormulaFunc;
var FunctionName;
(function (FunctionName) {
    // Numeric
    FunctionName["Sum"] = "SUM";
    FunctionName["Average"] = "AVERAGE";
    FunctionName["Max"] = "MAX";
    FunctionName["Min"] = "MIN";
    FunctionName["Round"] = "ROUND";
    FunctionName["RoundUp"] = "ROUNDUP";
    FunctionName["RoundDown"] = "ROUNDDOWN";
    FunctionName["Ceiling"] = "CEILING";
    FunctionName["Floor"] = "FLOOR";
    FunctionName["Even"] = "EVEN";
    FunctionName["Odd"] = "ODD";
    FunctionName["Int"] = "INT";
    FunctionName["Abs"] = "ABS";
    FunctionName["Sqrt"] = "SQRT";
    FunctionName["Power"] = "POWER";
    FunctionName["Exp"] = "EXP";
    FunctionName["Log"] = "LOG";
    FunctionName["Mod"] = "MOD";
    FunctionName["Value"] = "VALUE";
    // Text
    FunctionName["Concatenate"] = "CONCATENATE";
    FunctionName["Find"] = "FIND";
    FunctionName["Search"] = "SEARCH";
    FunctionName["Mid"] = "MID";
    FunctionName["Left"] = "LEFT";
    FunctionName["Right"] = "RIGHT";
    FunctionName["Replace"] = "REPLACE";
    FunctionName["RegExpReplace"] = "REGEXP_REPLACE";
    FunctionName["Substitute"] = "SUBSTITUTE";
    FunctionName["TextBefore"] = "TEXTBEFORE";
    FunctionName["TextSplit"] = "TEXTSPLIT";
    FunctionName["Lower"] = "LOWER";
    FunctionName["Upper"] = "UPPER";
    FunctionName["Rept"] = "REPT";
    FunctionName["Trim"] = "TRIM";
    FunctionName["Len"] = "LEN";
    FunctionName["T"] = "T";
    FunctionName["EncodeUrlComponent"] = "ENCODE_URL_COMPONENT";
    // Logical
    FunctionName["If"] = "IF";
    FunctionName["Switch"] = "SWITCH";
    FunctionName["And"] = "AND";
    FunctionName["Or"] = "OR";
    FunctionName["Xor"] = "XOR";
    FunctionName["Not"] = "NOT";
    FunctionName["Blank"] = "BLANK";
    FunctionName["Error"] = "ERROR";
    FunctionName["IsError"] = "IS_ERROR";
    // DateTime
    FunctionName["Today"] = "TODAY";
    FunctionName["Now"] = "NOW";
    FunctionName["Year"] = "YEAR";
    FunctionName["Month"] = "MONTH";
    FunctionName["WeekNum"] = "WEEKNUM";
    FunctionName["Weekday"] = "WEEKDAY";
    FunctionName["Day"] = "DAY";
    FunctionName["Hour"] = "HOUR";
    FunctionName["Minute"] = "MINUTE";
    FunctionName["Second"] = "SECOND";
    FunctionName["FromNow"] = "FROMNOW";
    FunctionName["ToNow"] = "TONOW";
    FunctionName["DatetimeDiff"] = "DATETIME_DIFF";
    FunctionName["Workday"] = "WORKDAY";
    FunctionName["WorkdayDiff"] = "WORKDAY_DIFF";
    FunctionName["IsSame"] = "IS_SAME";
    FunctionName["IsAfter"] = "IS_AFTER";
    FunctionName["IsBefore"] = "IS_BEFORE";
    FunctionName["DateAdd"] = "DATE_ADD";
    FunctionName["Datestr"] = "DATESTR";
    FunctionName["Timestr"] = "TIMESTR";
    FunctionName["DatetimeFormat"] = "DATETIME_FORMAT";
    FunctionName["DatetimeParse"] = "DATETIME_PARSE";
    FunctionName["CreatedTime"] = "CREATED_TIME";
    FunctionName["LastModifiedTime"] = "LAST_MODIFIED_TIME";
    // Array
    FunctionName["CountAll"] = "COUNTALL";
    FunctionName["CountA"] = "COUNTA";
    FunctionName["Count"] = "COUNT";
    FunctionName["ArrayJoin"] = "ARRAY_JOIN";
    FunctionName["ArrayUnique"] = "ARRAY_UNIQUE";
    FunctionName["ArrayFlatten"] = "ARRAY_FLATTEN";
    FunctionName["ArrayCompact"] = "ARRAY_COMPACT";
    // System
    FunctionName["TextAll"] = "TEXT_ALL";
    FunctionName["RecordId"] = "RECORD_ID";
    FunctionName["AutoNumber"] = "AUTO_NUMBER";
})(FunctionName || (exports.FunctionName = FunctionName = {}));
