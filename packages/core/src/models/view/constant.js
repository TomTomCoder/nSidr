"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewType = exports.RowHeightLevel = void 0;
var RowHeightLevel;
(function (RowHeightLevel) {
    RowHeightLevel["Short"] = "short";
    RowHeightLevel["Medium"] = "medium";
    RowHeightLevel["Tall"] = "tall";
    RowHeightLevel["ExtraTall"] = "extraTall";
    RowHeightLevel["AutoFit"] = "autoFit";
})(RowHeightLevel || (exports.RowHeightLevel = RowHeightLevel = {}));
var ViewType;
(function (ViewType) {
    ViewType["Grid"] = "grid";
    ViewType["Calendar"] = "calendar";
    ViewType["Kanban"] = "kanban";
    ViewType["Form"] = "form";
    ViewType["Gallery"] = "gallery";
    ViewType["Plugin"] = "plugin";
    ViewType["Gantt"] = "gantt";
})(ViewType || (exports.ViewType = ViewType = {}));
