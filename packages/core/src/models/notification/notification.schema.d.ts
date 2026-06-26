import { z } from 'zod';
import { NotificationTypeEnum } from './notification.enum';
export declare const systemIconSchema: z.ZodObject<{
    iconUrl: z.ZodString;
}, z.core.$strip>;
export type INotificationSystemIcon = z.infer<typeof systemIconSchema>;
export declare const userIconSchema: z.ZodObject<{
    userId: z.ZodString;
    userName: z.ZodString;
    userAvatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type INotificationUserIcon = z.infer<typeof userIconSchema>;
export declare const notificationIconSchema: z.ZodUnion<readonly [z.ZodObject<{
    iconUrl: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    userId: z.ZodString;
    userName: z.ZodString;
    userAvatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>]>;
export type INotificationIcon = z.infer<typeof notificationIconSchema>;
export declare const tableRecordUrlSchema: z.ZodObject<{
    baseId: z.ZodString;
    tableId: z.ZodString;
    recordId: z.ZodOptional<z.ZodString>;
    commentId: z.ZodOptional<z.ZodString>;
    downloadUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const notificationUrlSchema: z.ZodOptional<z.ZodObject<{
    baseId: z.ZodString;
    tableId: z.ZodString;
    recordId: z.ZodOptional<z.ZodString>;
    commentId: z.ZodOptional<z.ZodString>;
    downloadUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
export type INotificationUrl = z.infer<typeof notificationUrlSchema>;
export declare const notificationSchema: z.ZodObject<{
    id: z.ZodString;
    notifyIcon: z.ZodUnion<readonly [z.ZodObject<{
        iconUrl: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        userId: z.ZodString;
        userName: z.ZodString;
        userAvatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>]>;
    notifyType: z.ZodEnum<typeof NotificationTypeEnum>;
    url: z.ZodString;
    message: z.ZodString;
    messageI18n: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isRead: z.ZodBoolean;
    createdTime: z.ZodString;
}, z.core.$strip>;
export type INotification = z.infer<typeof notificationSchema>;
export declare const notificationBufferSchema: z.ZodObject<{
    notification: z.ZodObject<{
        id: z.ZodString;
        notifyIcon: z.ZodUnion<readonly [z.ZodObject<{
            iconUrl: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            userId: z.ZodString;
            userName: z.ZodString;
            userAvatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>]>;
        notifyType: z.ZodEnum<typeof NotificationTypeEnum>;
        url: z.ZodString;
        message: z.ZodString;
        messageI18n: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isRead: z.ZodBoolean;
        createdTime: z.ZodString;
    }, z.core.$strip>;
    unreadCount: z.ZodNumber;
}, z.core.$strip>;
export type INotificationBuffer = z.infer<typeof notificationBufferSchema>;
