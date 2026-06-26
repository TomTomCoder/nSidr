"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationBufferSchema = exports.notificationSchema = exports.notificationUrlSchema = exports.tableRecordUrlSchema = exports.notificationIconSchema = exports.userIconSchema = exports.systemIconSchema = void 0;
const zod_1 = require("zod");
const utils_1 = require("../../utils");
const notification_enum_1 = require("./notification.enum");
exports.systemIconSchema = zod_1.z.object({
    iconUrl: zod_1.z.string(),
});
exports.userIconSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    userName: zod_1.z.string(),
    userAvatarUrl: zod_1.z.string().nullable().optional(),
});
exports.notificationIconSchema = zod_1.z.union([exports.systemIconSchema, exports.userIconSchema]);
exports.tableRecordUrlSchema = zod_1.z.object({
    baseId: zod_1.z.string().startsWith(utils_1.IdPrefix.Base),
    tableId: zod_1.z.string().startsWith(utils_1.IdPrefix.Table),
    recordId: zod_1.z.string().startsWith(utils_1.IdPrefix.Record).optional(),
    commentId: zod_1.z.string().startsWith(utils_1.IdPrefix.Comment).optional(),
    downloadUrl: zod_1.z.string().optional(),
});
exports.notificationUrlSchema = exports.tableRecordUrlSchema.optional();
exports.notificationSchema = zod_1.z.object({
    id: zod_1.z.string().startsWith(utils_1.IdPrefix.Notification),
    notifyIcon: exports.notificationIconSchema,
    notifyType: zod_1.z.enum(notification_enum_1.NotificationTypeEnum),
    url: zod_1.z.string(),
    message: zod_1.z.string(),
    messageI18n: zod_1.z.string().nullable().optional(),
    isRead: zod_1.z.boolean(),
    createdTime: zod_1.z.string(),
});
exports.notificationBufferSchema = zod_1.z.object({
    notification: exports.notificationSchema,
    unreadCount: zod_1.z.number().nonnegative().int(),
});
