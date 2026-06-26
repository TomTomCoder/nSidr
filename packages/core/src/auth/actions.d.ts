import { z } from 'zod';
export declare enum ActionPrefix {
    Space = "space",
    Base = "base",
    Table = "table",
    View = "view",
    Record = "record",
    Field = "field",
    Automation = "automation",
    App = "app",
    User = "user",
    TableRecordHistory = "table_record_history",
    Instance = "instance",
    Enterprise = "enterprise"
}
export declare const spaceActions: readonly ["space|create", "space|delete", "space|read", "space|update", "space|invite_email", "space|invite_link", "space|grant_role"];
export declare const spaceActionSchema: z.ZodEnum<{
    "space|create": "space|create";
    "space|delete": "space|delete";
    "space|read": "space|read";
    "space|update": "space|update";
    "space|invite_email": "space|invite_email";
    "space|invite_link": "space|invite_link";
    "space|grant_role": "space|grant_role";
}>;
export type SpaceAction = z.infer<typeof spaceActionSchema>;
export declare const baseActions: readonly ["base|create", "base|delete", "base|read", "base|read_all", "base|update", "base|invite_email", "base|invite_link", "base|table_import", "base|table_export", "base|authority_matrix_config", "base|db_connection", "base|query_data"];
export declare const baseActionSchema: z.ZodEnum<{
    "base|create": "base|create";
    "base|delete": "base|delete";
    "base|read": "base|read";
    "base|read_all": "base|read_all";
    "base|update": "base|update";
    "base|invite_email": "base|invite_email";
    "base|invite_link": "base|invite_link";
    "base|table_import": "base|table_import";
    "base|table_export": "base|table_export";
    "base|authority_matrix_config": "base|authority_matrix_config";
    "base|db_connection": "base|db_connection";
    "base|query_data": "base|query_data";
}>;
export type BaseAction = z.infer<typeof baseActionSchema>;
export declare const tableActions: readonly ["table|create", "table|delete", "table|read", "table|update", "table|import", "table|export", "table|trash_read", "table|trash_update", "table|trash_reset"];
export declare const tableActionSchema: z.ZodEnum<{
    "table|create": "table|create";
    "table|delete": "table|delete";
    "table|read": "table|read";
    "table|update": "table|update";
    "table|import": "table|import";
    "table|export": "table|export";
    "table|trash_read": "table|trash_read";
    "table|trash_update": "table|trash_update";
    "table|trash_reset": "table|trash_reset";
}>;
export type TableAction = z.infer<typeof tableActionSchema>;
export declare const viewActions: readonly ["view|create", "view|delete", "view|read", "view|update", "view|share"];
export declare const viewActionSchema: z.ZodEnum<{
    "view|create": "view|create";
    "view|delete": "view|delete";
    "view|read": "view|read";
    "view|update": "view|update";
    "view|share": "view|share";
}>;
export type ViewAction = z.infer<typeof viewActionSchema>;
export declare const fieldActions: readonly ["field|create", "field|delete", "field|read", "field|update"];
export declare const fieldActionSchema: z.ZodEnum<{
    "field|create": "field|create";
    "field|delete": "field|delete";
    "field|read": "field|read";
    "field|update": "field|update";
}>;
export type FieldAction = z.infer<typeof fieldActionSchema>;
export declare const recordActions: readonly ["record|create", "record|delete", "record|read", "record|update", "record|comment", "record|copy"];
export declare const recordActionSchema: z.ZodEnum<{
    "record|create": "record|create";
    "record|delete": "record|delete";
    "record|read": "record|read";
    "record|update": "record|update";
    "record|comment": "record|comment";
    "record|copy": "record|copy";
}>;
export type RecordAction = z.infer<typeof recordActionSchema>;
export declare const automationActions: readonly ["automation|create", "automation|delete", "automation|read", "automation|update"];
export declare const automationActionSchema: z.ZodEnum<{
    "automation|create": "automation|create";
    "automation|delete": "automation|delete";
    "automation|read": "automation|read";
    "automation|update": "automation|update";
}>;
export type AutomationAction = z.infer<typeof automationActionSchema>;
export declare const appActions: readonly ["app|create", "app|delete", "app|read", "app|update"];
export declare const appActionSchema: z.ZodEnum<{
    "app|create": "app|create";
    "app|delete": "app|delete";
    "app|read": "app|read";
    "app|update": "app|update";
}>;
export type AppAction = z.infer<typeof appActionSchema>;
export declare const userActions: readonly ["user|email_read", "user|integrations"];
export declare const userActionSchema: z.ZodEnum<{
    "user|email_read": "user|email_read";
    "user|integrations": "user|integrations";
}>;
export type UserAction = z.infer<typeof userActionSchema>;
export declare const tableRecordHistoryActions: readonly ["table_record_history|read"];
export declare const tableRecordHistoryActionSchema: z.ZodEnum<{
    "table_record_history|read": "table_record_history|read";
}>;
export type TableRecordHistoryAction = z.infer<typeof tableRecordHistoryActionSchema>;
export declare const instanceActions: readonly ["instance|read", "instance|update"];
export declare const instanceActionSchema: z.ZodEnum<{
    "instance|read": "instance|read";
    "instance|update": "instance|update";
}>;
export type InstanceAction = z.infer<typeof instanceActionSchema>;
export declare const enterpriseActions: readonly ["enterprise|read", "enterprise|update"];
export declare const enterpriseActionSchema: z.ZodEnum<{
    "enterprise|read": "enterprise|read";
    "enterprise|update": "enterprise|update";
}>;
export type EnterpriseAction = z.infer<typeof enterpriseActionSchema>;
export type Action = SpaceAction | BaseAction | TableAction | ViewAction | FieldAction | RecordAction | AutomationAction | AppAction | UserAction | TableRecordHistoryAction | InstanceAction | EnterpriseAction;
export type ActionPrefixMap = {
    [ActionPrefix.Space]: SpaceAction[];
    [ActionPrefix.Base]: BaseAction[];
    [ActionPrefix.Table]: TableAction[];
    [ActionPrefix.View]: ViewAction[];
    [ActionPrefix.Field]: FieldAction[];
    [ActionPrefix.Record]: RecordAction[];
    [ActionPrefix.TableRecordHistory]: TableRecordHistoryAction[];
    [ActionPrefix.Automation]: AutomationAction[];
    [ActionPrefix.App]: AppAction[];
    [ActionPrefix.User]: UserAction[];
    [ActionPrefix.Instance]: InstanceAction[];
    [ActionPrefix.Enterprise]: EnterpriseAction[];
};
export declare const allActions: readonly Action[];
export declare const actionPrefixMap: ActionPrefixMap;
