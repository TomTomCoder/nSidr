"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationStatesEnum = exports.NotificationTypeEnum = void 0;
var NotificationTypeEnum;
(function (NotificationTypeEnum) {
    NotificationTypeEnum["System"] = "system";
    NotificationTypeEnum["CollaboratorCellTag"] = "collaboratorCellTag";
    NotificationTypeEnum["CollaboratorMultiRowTag"] = "collaboratorMultiRowTag";
    NotificationTypeEnum["Comment"] = "comment";
    NotificationTypeEnum["ExportBase"] = "exportBase";
})(NotificationTypeEnum || (exports.NotificationTypeEnum = NotificationTypeEnum = {}));
var NotificationStatesEnum;
(function (NotificationStatesEnum) {
    NotificationStatesEnum["Unread"] = "unread";
    NotificationStatesEnum["Read"] = "read";
})(NotificationStatesEnum || (exports.NotificationStatesEnum = NotificationStatesEnum = {}));
