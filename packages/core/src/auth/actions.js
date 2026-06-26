"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionPrefixMap = exports.allActions = exports.enterpriseActionSchema = exports.enterpriseActions = exports.instanceActionSchema = exports.instanceActions = exports.tableRecordHistoryActionSchema = exports.tableRecordHistoryActions = exports.userActionSchema = exports.userActions = exports.appActionSchema = exports.appActions = exports.automationActionSchema = exports.automationActions = exports.recordActionSchema = exports.recordActions = exports.fieldActionSchema = exports.fieldActions = exports.viewActionSchema = exports.viewActions = exports.tableActionSchema = exports.tableActions = exports.baseActionSchema = exports.baseActions = exports.spaceActionSchema = exports.spaceActions = exports.ActionPrefix = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const zod_1 = require("zod");
var ActionPrefix;
(function (ActionPrefix) {
    ActionPrefix["Space"] = "space";
    ActionPrefix["Base"] = "base";
    ActionPrefix["Table"] = "table";
    ActionPrefix["View"] = "view";
    ActionPrefix["Record"] = "record";
    ActionPrefix["Field"] = "field";
    ActionPrefix["Automation"] = "automation";
    ActionPrefix["App"] = "app";
    ActionPrefix["User"] = "user";
    ActionPrefix["TableRecordHistory"] = "table_record_history";
    ActionPrefix["Instance"] = "instance";
    ActionPrefix["Enterprise"] = "enterprise";
})(ActionPrefix || (exports.ActionPrefix = ActionPrefix = {}));
exports.spaceActions = [
    'space|create',
    'space|delete',
    'space|read',
    'space|update',
    'space|invite_email',
    'space|invite_link',
    'space|grant_role',
];
exports.spaceActionSchema = zod_1.z.enum(exports.spaceActions);
exports.baseActions = [
    'base|create',
    'base|delete',
    'base|read',
    'base|read_all',
    'base|update',
    'base|invite_email',
    'base|invite_link',
    'base|table_import',
    'base|table_export',
    'base|authority_matrix_config',
    'base|db_connection',
    'base|query_data',
];
exports.baseActionSchema = zod_1.z.enum(exports.baseActions);
exports.tableActions = [
    'table|create',
    'table|delete',
    'table|read',
    'table|update',
    'table|import',
    'table|export',
    'table|trash_read',
    'table|trash_update',
    'table|trash_reset',
];
exports.tableActionSchema = zod_1.z.enum(exports.tableActions);
exports.viewActions = [
    'view|create',
    'view|delete',
    'view|read',
    'view|update',
    'view|share',
];
exports.viewActionSchema = zod_1.z.enum(exports.viewActions);
exports.fieldActions = ['field|create', 'field|delete', 'field|read', 'field|update'];
exports.fieldActionSchema = zod_1.z.enum(exports.fieldActions);
exports.recordActions = [
    'record|create',
    'record|delete',
    'record|read',
    'record|update',
    'record|comment',
    'record|copy',
];
exports.recordActionSchema = zod_1.z.enum(exports.recordActions);
exports.automationActions = [
    'automation|create',
    'automation|delete',
    'automation|read',
    'automation|update',
];
exports.automationActionSchema = zod_1.z.enum(exports.automationActions);
exports.appActions = ['app|create', 'app|delete', 'app|read', 'app|update'];
exports.appActionSchema = zod_1.z.enum(exports.appActions);
exports.userActions = ['user|email_read', 'user|integrations'];
exports.userActionSchema = zod_1.z.enum(exports.userActions);
exports.tableRecordHistoryActions = ['table_record_history|read'];
exports.tableRecordHistoryActionSchema = zod_1.z.enum(exports.tableRecordHistoryActions);
exports.instanceActions = ['instance|read', 'instance|update'];
exports.instanceActionSchema = zod_1.z.enum(exports.instanceActions);
exports.enterpriseActions = ['enterprise|read', 'enterprise|update'];
exports.enterpriseActionSchema = zod_1.z.enum(exports.enterpriseActions);
exports.allActions = [
    ...exports.spaceActions,
    ...exports.baseActions,
    ...exports.tableActions,
    ...exports.viewActions,
    ...exports.fieldActions,
    ...exports.recordActions,
    ...exports.tableRecordHistoryActions,
    ...exports.automationActions,
    ...exports.appActions,
    ...exports.userActions,
    ...exports.instanceActions,
    ...exports.enterpriseActions,
];
exports.actionPrefixMap = {
    [ActionPrefix.Space]: [...exports.spaceActions],
    [ActionPrefix.Base]: [...exports.baseActions],
    [ActionPrefix.Table]: [...exports.tableActions],
    [ActionPrefix.View]: [...exports.viewActions],
    [ActionPrefix.Field]: [...exports.fieldActions],
    [ActionPrefix.Record]: [...exports.recordActions],
    [ActionPrefix.TableRecordHistory]: [...exports.tableRecordHistoryActions],
    [ActionPrefix.Automation]: [...exports.automationActions],
    [ActionPrefix.App]: [...exports.appActions],
    [ActionPrefix.User]: [...exports.userActions],
    [ActionPrefix.Instance]: [...exports.instanceActions],
    [ActionPrefix.Enterprise]: [...exports.enterpriseActions],
};
