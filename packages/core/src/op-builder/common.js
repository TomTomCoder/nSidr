"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathMatcher = exports.OpName = void 0;
var OpName;
(function (OpName) {
    OpName["AddTable"] = "addTable";
    OpName["SetTableProperty"] = "setTableProperty";
    OpName["SetRecord"] = "setRecord";
    OpName["AddRecord"] = "addRecord";
    OpName["AddField"] = "addField";
    OpName["AddColumnMeta"] = "addColumnMeta";
    OpName["DeleteColumnMeta"] = "deleteColumnMeta";
    OpName["SetFieldProperty"] = "setFieldProperty";
    OpName["AddView"] = "addView";
    OpName["SetViewProperty"] = "setViewProperty";
    OpName["UpdateViewColumnMeta"] = "updateViewColumnMeta";
})(OpName || (exports.OpName = OpName = {}));
function pathMatcher(path, matchList) {
    if (path.length !== matchList.length) {
        return null;
    }
    const res = {};
    for (let i = 0; i < matchList.length; i++) {
        if (matchList[i].startsWith(':')) {
            const pathKey = matchList[i].slice(1);
            res[pathKey] = path[i];
            continue;
        }
        if (matchList[i] === '*') {
            continue;
        }
        if (path[i] !== matchList[i]) {
            return null;
        }
    }
    return res;
}
exports.pathMatcher = pathMatcher;
