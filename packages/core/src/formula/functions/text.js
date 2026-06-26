"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncodeUrlComponent = exports.Len = exports.T = exports.Trim = exports.Rept = exports.Upper = exports.Lower = exports.TextSplit = exports.TextBefore = exports.Substitute = exports.RegExpReplace = exports.Replace = exports.Right = exports.Left = exports.Mid = exports.Search = exports.Find = exports.Concatenate = exports.convertValueToString = void 0;
const lodash_1 = require("lodash");
const constant_1 = require("../../models/field/constant");
const common_1 = require("./common");
const convertValueToString = (param, separator = ', '
// eslint-disable-next-line sonarjs/cognitive-complexity
) => {
    const { value, isMultiple, field } = param || {};
    if (value == null)
        return null;
    if (field?.cellValueType === constant_1.CellValueType.DateTime) {
        if (isMultiple && Array.isArray(value)) {
            return value.map((item) => field.cellValue2String(item)).join(separator);
        }
        return field.cellValue2String(value);
    }
    if (isMultiple) {
        if (Array.isArray(value))
            return value.join(separator);
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed))
                    return parsed.join(separator);
            }
            catch {
                // ignore parse errors and fall back to string cast
            }
        }
    }
    return String(value);
};
exports.convertValueToString = convertValueToString;
class TextFunc extends common_1.FormulaFunc {
    type = common_1.FormulaFuncType.Text;
}
class Concatenate extends TextFunc {
    name = common_1.FunctionName.Concatenate;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.Concatenate} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        return params.reduce((result, param) => {
            if (param.isMultiple) {
                if (!Array.isArray(param.value)) {
                    return result;
                }
                result += param.value.join(', ');
                return result;
            }
            result += param.value || '';
            return result;
        }, '');
    }
}
exports.Concatenate = Concatenate;
class Find extends TextFunc {
    name = common_1.FunctionName.Find;
    acceptValueType = new Set([constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.Find} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const findString = params[0].value;
        const targetString = (0, exports.convertValueToString)(params[1]);
        if (findString == null || targetString == null)
            return null;
        let startPosition = params[2]?.value ?? 0;
        startPosition = (0, lodash_1.isNumber)(startPosition) && startPosition > 0 ? startPosition - 1 : 0;
        return String(targetString).indexOf(String(findString), startPosition) + 1;
    }
}
exports.Find = Find;
class Search extends TextFunc {
    name = common_1.FunctionName.Search;
    acceptValueType = new Set([constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.Search} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const findString = params[0].value;
        const targetString = (0, exports.convertValueToString)(params[1]);
        let startPosition = params[2]?.value ?? 0;
        if (findString == null || targetString == null)
            return null;
        startPosition = (0, lodash_1.isNumber)(startPosition) && startPosition > 0 ? startPosition - 1 : 0;
        const position = String(targetString).indexOf(String(findString), startPosition) + 1;
        return position === 0 ? null : position;
    }
}
exports.Search = Search;
class Mid extends TextFunc {
    name = common_1.FunctionName.Mid;
    acceptValueType = new Set([constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 3) {
            throw new Error(`${common_1.FunctionName.Mid} needs at least 3 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const targetString = (0, exports.convertValueToString)(params[0]);
        if (targetString == null)
            return null;
        const startPosition = Number(params[1]?.value ?? 0);
        const truncateCount = Number(params[2]?.value ?? targetString.length);
        return targetString.slice(startPosition, startPosition + truncateCount);
    }
}
exports.Mid = Mid;
class Left extends TextFunc {
    name = common_1.FunctionName.Left;
    acceptValueType = new Set([constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.Left} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const value = (0, exports.convertValueToString)(params[0]);
        if (value == null)
            return null;
        const truncateCount = Number(params[1]?.value ?? 1);
        return String(value).substring(0, truncateCount);
    }
}
exports.Left = Left;
class Right extends TextFunc {
    name = common_1.FunctionName.Right;
    acceptValueType = new Set([constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 1) {
            throw new Error(`${common_1.FunctionName.Right} needs at least 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const value = (0, exports.convertValueToString)(params[0]);
        if (value == null)
            return null;
        const truncateCount = Number(params[1]?.value ?? 1);
        const startPosition = value.length - truncateCount;
        return value.substring(startPosition);
    }
}
exports.Right = Right;
class Replace extends TextFunc {
    name = common_1.FunctionName.Replace;
    acceptValueType = new Set([constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 4) {
            throw new Error(`${common_1.FunctionName.Replace} needs at least 4 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const targetString = (0, exports.convertValueToString)(params[0]);
        if (targetString == null)
            return null;
        const startPosition = Number(params[1]?.value ?? 0);
        const truncateCount = Number(params[2]?.value ?? targetString.length);
        const replaceStr = String(params[3]?.value ?? '');
        if (targetString.length <= startPosition)
            return targetString + replaceStr;
        return (targetString.substring(0, startPosition - 1) +
            replaceStr +
            targetString.substring(startPosition + truncateCount - 1));
    }
}
exports.Replace = Replace;
class RegExpReplace extends TextFunc {
    name = common_1.FunctionName.RegExpReplace;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 3) {
            throw new Error(`${common_1.FunctionName.RegExpReplace} needs at least 3 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const text = (0, exports.convertValueToString)(params[0]);
        if (text == null)
            return null;
        const pattern = params[1].value ? String(params[1].value) : '';
        const replacement = params[2].value ? String(params[2].value) : '';
        const regex = new RegExp(pattern, 'g');
        return text.replace(regex, replacement);
    }
}
exports.RegExpReplace = RegExpReplace;
class Substitute extends TextFunc {
    name = common_1.FunctionName.Substitute;
    acceptValueType = new Set([constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 3) {
            throw new Error(`${common_1.FunctionName.Substitute} needs at least 3 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const targetString = (0, exports.convertValueToString)(params[0]);
        if (targetString == null)
            return null;
        const oldString = String(params[1]?.value ?? '');
        const newString = String(params[2]?.value ?? '');
        const index = Number(params[3]?.value ?? 0) - 1;
        const splitStringArray = targetString.split(oldString);
        if (index > splitStringArray.length - 2)
            return targetString;
        if (index > 0) {
            const substituter = [splitStringArray[index], splitStringArray[index + 1]].join(newString);
            splitStringArray.splice(index, 2, substituter);
            return splitStringArray.join(oldString);
        }
        return splitStringArray.join(newString);
    }
}
exports.Substitute = Substitute;
function getTextBeforeIndex(source, delimiter, instanceNum, matchMode, matchEnd) {
    const searchSource = matchMode === 1 ? source.toLowerCase() : source;
    const searchDelimiter = matchMode === 1 ? delimiter.toLowerCase() : delimiter;
    const indexes = [];
    let position = searchSource.indexOf(searchDelimiter);
    while (position !== -1) {
        indexes.push(position);
        position = searchSource.indexOf(searchDelimiter, position + searchDelimiter.length);
    }
    if (matchEnd) {
        indexes.push(source.length);
    }
    return instanceNum > 0 ? indexes[instanceNum - 1] : indexes[indexes.length + instanceNum];
}
class TextBefore extends TextFunc {
    name = common_1.FunctionName.TextBefore;
    acceptValueType = new Set([constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.TextBefore} needs at least 2 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const targetString = (0, exports.convertValueToString)(params[0]);
        const delimiter = (0, exports.convertValueToString)(params[1]);
        if (targetString == null || delimiter == null)
            return null;
        const instanceNum = Number(params[2]?.value ?? 1);
        const matchMode = Number(params[3]?.value ?? 0);
        const matchEnd = Boolean(params[4]?.value ?? false);
        const ifNotFound = params[5] ? (0, exports.convertValueToString)(params[5]) : null;
        if (!Number.isInteger(instanceNum) || instanceNum === 0)
            return null;
        if (delimiter === '')
            return instanceNum > 0 ? '' : targetString;
        const source = String(targetString);
        const index = getTextBeforeIndex(source, delimiter, instanceNum, matchMode, matchEnd);
        if (index == null)
            return ifNotFound;
        return source.slice(0, index);
    }
}
exports.TextBefore = TextBefore;
class TextSplit extends TextFunc {
    name = common_1.FunctionName.TextSplit;
    acceptValueType = new Set([constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.TextSplit} needs at least 2 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String, isMultiple: true };
    }
    eval(params) {
        const targetString = (0, exports.convertValueToString)(params[0]);
        const delimiter = (0, exports.convertValueToString)(params[1]);
        if (targetString == null || delimiter == null)
            return null;
        const matchMode = Number(params[3]?.value ?? 0);
        const ignoreEmpty = Boolean(params[2]?.value ?? false);
        const value = String(targetString);
        const parts = matchMode === 1
            ? value.split(new RegExp(delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
            : value.split(delimiter);
        return ignoreEmpty ? parts.filter((part) => part !== '') : parts;
    }
}
exports.TextSplit = TextSplit;
class Lower extends TextFunc {
    name = common_1.FunctionName.Lower;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Lower} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const value = (0, exports.convertValueToString)(params[0]);
        if (value == null)
            return null;
        return String(value).toLowerCase();
    }
}
exports.Lower = Lower;
class Upper extends TextFunc {
    name = common_1.FunctionName.Upper;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Upper} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const value = (0, exports.convertValueToString)(params[0]);
        if (value == null)
            return null;
        return String(value).toUpperCase();
    }
}
exports.Upper = Upper;
class Rept extends TextFunc {
    name = common_1.FunctionName.Rept;
    acceptValueType = new Set([constant_1.CellValueType.String, constant_1.CellValueType.Number]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length < 2) {
            throw new Error(`${common_1.FunctionName.Rept} needs at least 2 params`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const value = (0, exports.convertValueToString)(params[0]);
        if (value == null)
            return null;
        const count = Number(params[1]?.value ?? 0);
        if (count === 0)
            return null;
        return String(value).repeat(count);
    }
}
exports.Rept = Rept;
class Trim extends TextFunc {
    name = common_1.FunctionName.Trim;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Trim} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const value = (0, exports.convertValueToString)(params[0]);
        if (value == null)
            return null;
        return String(value).trim();
    }
}
exports.Trim = Trim;
class T extends TextFunc {
    name = common_1.FunctionName.T;
    acceptValueType = new Set([
        constant_1.CellValueType.String,
        constant_1.CellValueType.Number,
        constant_1.CellValueType.Boolean,
        constant_1.CellValueType.DateTime,
    ]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.T} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const { value, isMultiple } = params[0];
        if (isMultiple && Array.isArray(value)) {
            if (value.some((v) => v != null && !(0, lodash_1.isString)(v)))
                return null;
            return value.filter(Boolean).join(', ');
        }
        return (0, lodash_1.isString)(value) ? value : null;
    }
}
exports.T = T;
class Len extends TextFunc {
    name = common_1.FunctionName.Len;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.Len} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.Number };
    }
    eval(params) {
        const value = (0, exports.convertValueToString)(params[0]);
        if (value == null)
            return null;
        return String(value).length;
    }
}
exports.Len = Len;
class EncodeUrlComponent extends TextFunc {
    name = common_1.FunctionName.EncodeUrlComponent;
    acceptValueType = new Set([constant_1.CellValueType.String]);
    acceptMultipleValue = true;
    validateParams(params) {
        if (params.length !== 1) {
            throw new Error(`${common_1.FunctionName.EncodeUrlComponent} only allow 1 param`);
        }
    }
    getReturnType(params) {
        params && this.validateParams(params);
        return { type: constant_1.CellValueType.String };
    }
    eval(params) {
        const value = (0, exports.convertValueToString)(params[0]);
        if (value == null)
            return null;
        return encodeURIComponent(value);
    }
}
exports.EncodeUrlComponent = EncodeUrlComponent;
