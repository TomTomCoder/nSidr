"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAiProxyTokenSign = exports.generateAiProxyTokenId = exports.generateAppId = exports.generateQueryId = exports.generateChatMessageId = exports.generateChatId = exports.generateTaskId = exports.generateTemplateCategoryId = exports.generateTemplateId = exports.generateIntegrationId = exports.generateOrganizationDepartmentId = exports.generateOrganizationId = exports.generateRecordTrashId = exports.generateOperationId = exports.generateDashboardId = exports.generatePluginPanelId = exports.generatePluginUserId = exports.generatePluginInstallId = exports.generatePluginId = exports.generateRecordHistoryId = exports.generateClientId = exports.generateLicenseId = exports.generateAuthorityMatrixRoleId = exports.generateAuthorityMatrixId = exports.generateAccountId = exports.generateAccessTokenId = exports.generateNotificationId = exports.generateShareId = exports.generateInvitationId = exports.generateBaseId = exports.generateSpaceId = exports.identify = exports.generateWindowId = exports.generateUserId = exports.generateWorkflowDecisionId = exports.generateWorkflowActionId = exports.generateWorkflowTriggerId = exports.generateWorkflowId = exports.generateAttachmentId = exports.generateChoiceId = exports.generateCommentId = exports.generateRecordId = exports.generateViewId = exports.generateFieldId = exports.generateTableId = exports.generateBaseNodeFolderId = exports.generateBaseNodeId = exports.getRandomString = exports.RandomType = exports.IdPrefix = void 0;
exports.generateLogId = void 0;
const nanoid_1 = require("nanoid");
var IdPrefix;
(function (IdPrefix) {
    IdPrefix["Space"] = "spc";
    IdPrefix["Base"] = "bse";
    IdPrefix["BaseNode"] = "bno";
    IdPrefix["BaseNodeFolder"] = "bnf";
    IdPrefix["Table"] = "tbl";
    IdPrefix["Field"] = "fld";
    IdPrefix["View"] = "viw";
    IdPrefix["Record"] = "rec";
    IdPrefix["Comment"] = "com";
    IdPrefix["Attachment"] = "act";
    IdPrefix["Choice"] = "cho";
    IdPrefix["Workflow"] = "wfl";
    IdPrefix["WorkflowTrigger"] = "wtr";
    IdPrefix["WorkflowAction"] = "wac";
    IdPrefix["WorkflowDecision"] = "wde";
    IdPrefix["User"] = "usr";
    IdPrefix["Account"] = "aco";
    IdPrefix["Invitation"] = "inv";
    IdPrefix["Share"] = "shr";
    IdPrefix["Notification"] = "not";
    IdPrefix["AccessToken"] = "acc";
    IdPrefix["AuthorityMatrix"] = "aut";
    IdPrefix["AuthorityMatrixRole"] = "aur";
    IdPrefix["License"] = "lic";
    IdPrefix["OAuthClient"] = "clt";
    IdPrefix["Window"] = "win";
    IdPrefix["RecordHistory"] = "rhi";
    IdPrefix["Plugin"] = "plg";
    IdPrefix["PluginInstall"] = "pli";
    IdPrefix["PluginUser"] = "plu";
    IdPrefix["PluginPanel"] = "plp";
    IdPrefix["Dashboard"] = "dsh";
    IdPrefix["RecordTrash"] = "rtr";
    IdPrefix["Operation"] = "opr";
    IdPrefix["Organization"] = "org";
    IdPrefix["OrganizationDepartment"] = "odp";
    IdPrefix["Integration"] = "int";
    IdPrefix["Template"] = "tpl";
    IdPrefix["TemplateCategory"] = "tpc";
    IdPrefix["Task"] = "tsk";
    IdPrefix["Chat"] = "cht";
    IdPrefix["ChatMessage"] = "cmm";
    IdPrefix["Query"] = "qry";
    IdPrefix["App"] = "app";
    IdPrefix["AiProxyToken"] = "apt";
})(IdPrefix || (exports.IdPrefix = IdPrefix = {}));
var RandomType;
(function (RandomType) {
    RandomType["String"] = "string";
    RandomType["Number"] = "number";
})(RandomType || (exports.RandomType = RandomType = {}));
const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = (0, nanoid_1.customAlphabet)(chars);
const charsNumber = '0123456789';
const nanoidNumber = (0, nanoid_1.customAlphabet)(charsNumber);
function getRandomString(len, type = RandomType.String) {
    if (type === RandomType.Number) {
        return nanoidNumber(len);
    }
    return nanoid(len);
}
exports.getRandomString = getRandomString;
function generateBaseNodeId() {
    return IdPrefix.BaseNode + getRandomString(16);
}
exports.generateBaseNodeId = generateBaseNodeId;
function generateBaseNodeFolderId() {
    return IdPrefix.BaseNodeFolder + getRandomString(16);
}
exports.generateBaseNodeFolderId = generateBaseNodeFolderId;
function generateTableId() {
    return IdPrefix.Table + getRandomString(16);
}
exports.generateTableId = generateTableId;
function generateFieldId() {
    return IdPrefix.Field + getRandomString(16);
}
exports.generateFieldId = generateFieldId;
function generateViewId() {
    return IdPrefix.View + getRandomString(16);
}
exports.generateViewId = generateViewId;
function generateRecordId() {
    return IdPrefix.Record + getRandomString(16);
}
exports.generateRecordId = generateRecordId;
function generateCommentId() {
    return IdPrefix.Comment + getRandomString(16);
}
exports.generateCommentId = generateCommentId;
function generateChoiceId() {
    return IdPrefix.Choice + getRandomString(8);
}
exports.generateChoiceId = generateChoiceId;
function generateAttachmentId() {
    return IdPrefix.Attachment + getRandomString(16);
}
exports.generateAttachmentId = generateAttachmentId;
function generateWorkflowId() {
    return IdPrefix.Workflow + getRandomString(16);
}
exports.generateWorkflowId = generateWorkflowId;
function generateWorkflowTriggerId() {
    return IdPrefix.WorkflowTrigger + getRandomString(16);
}
exports.generateWorkflowTriggerId = generateWorkflowTriggerId;
function generateWorkflowActionId() {
    return IdPrefix.WorkflowAction + getRandomString(16);
}
exports.generateWorkflowActionId = generateWorkflowActionId;
function generateWorkflowDecisionId() {
    return IdPrefix.WorkflowDecision + getRandomString(16);
}
exports.generateWorkflowDecisionId = generateWorkflowDecisionId;
function generateUserId() {
    return IdPrefix.User + getRandomString(16);
}
exports.generateUserId = generateUserId;
function generateWindowId() {
    return IdPrefix.Window + getRandomString(16);
}
exports.generateWindowId = generateWindowId;
function identify(id) {
    if (id.length < 2) {
        return undefined;
    }
    const idPrefix = id.substring(0, 3);
    return Object.values(IdPrefix).includes(idPrefix)
        ? idPrefix
        : undefined;
}
exports.identify = identify;
function generateSpaceId() {
    return IdPrefix.Space + getRandomString(16);
}
exports.generateSpaceId = generateSpaceId;
function generateBaseId() {
    return IdPrefix.Base + getRandomString(16);
}
exports.generateBaseId = generateBaseId;
function generateInvitationId() {
    return IdPrefix.Invitation + getRandomString(16);
}
exports.generateInvitationId = generateInvitationId;
function generateShareId() {
    return IdPrefix.Share + getRandomString(16);
}
exports.generateShareId = generateShareId;
function generateNotificationId() {
    return IdPrefix.Notification + getRandomString(16);
}
exports.generateNotificationId = generateNotificationId;
function generateAccessTokenId() {
    return IdPrefix.AccessToken + getRandomString(16);
}
exports.generateAccessTokenId = generateAccessTokenId;
function generateAccountId() {
    return IdPrefix.Account + getRandomString(16);
}
exports.generateAccountId = generateAccountId;
function generateAuthorityMatrixId() {
    return IdPrefix.AuthorityMatrix + getRandomString(16);
}
exports.generateAuthorityMatrixId = generateAuthorityMatrixId;
function generateAuthorityMatrixRoleId() {
    return IdPrefix.AuthorityMatrixRole + getRandomString(16);
}
exports.generateAuthorityMatrixRoleId = generateAuthorityMatrixRoleId;
function generateLicenseId() {
    return IdPrefix.License + getRandomString(16);
}
exports.generateLicenseId = generateLicenseId;
function generateClientId() {
    return IdPrefix.OAuthClient + getRandomString(16).toLocaleLowerCase();
}
exports.generateClientId = generateClientId;
function generateRecordHistoryId() {
    return IdPrefix.RecordHistory + getRandomString(24);
}
exports.generateRecordHistoryId = generateRecordHistoryId;
function generatePluginId() {
    return IdPrefix.Plugin + getRandomString(16);
}
exports.generatePluginId = generatePluginId;
function generatePluginInstallId() {
    return IdPrefix.PluginInstall + getRandomString(16);
}
exports.generatePluginInstallId = generatePluginInstallId;
function generatePluginUserId() {
    return IdPrefix.PluginUser + getRandomString(16);
}
exports.generatePluginUserId = generatePluginUserId;
function generatePluginPanelId() {
    return IdPrefix.PluginPanel + getRandomString(16);
}
exports.generatePluginPanelId = generatePluginPanelId;
function generateDashboardId() {
    return IdPrefix.Dashboard + getRandomString(12);
}
exports.generateDashboardId = generateDashboardId;
function generateOperationId() {
    return IdPrefix.Operation + getRandomString(16);
}
exports.generateOperationId = generateOperationId;
function generateRecordTrashId() {
    return IdPrefix.RecordTrash + getRandomString(16);
}
exports.generateRecordTrashId = generateRecordTrashId;
function generateOrganizationId() {
    return IdPrefix.Organization + getRandomString(16);
}
exports.generateOrganizationId = generateOrganizationId;
function generateOrganizationDepartmentId() {
    return IdPrefix.OrganizationDepartment + getRandomString(16);
}
exports.generateOrganizationDepartmentId = generateOrganizationDepartmentId;
function generateIntegrationId() {
    return IdPrefix.Integration + getRandomString(16);
}
exports.generateIntegrationId = generateIntegrationId;
function generateTemplateId() {
    return IdPrefix.Template + getRandomString(16);
}
exports.generateTemplateId = generateTemplateId;
function generateTemplateCategoryId() {
    return IdPrefix.TemplateCategory + getRandomString(16);
}
exports.generateTemplateCategoryId = generateTemplateCategoryId;
function generateTaskId() {
    return IdPrefix.Task + getRandomString(16);
}
exports.generateTaskId = generateTaskId;
function generateChatId() {
    return IdPrefix.Chat + getRandomString(16);
}
exports.generateChatId = generateChatId;
function generateChatMessageId() {
    return IdPrefix.ChatMessage + getRandomString(16);
}
exports.generateChatMessageId = generateChatMessageId;
function generateQueryId() {
    return IdPrefix.Query + getRandomString(16);
}
exports.generateQueryId = generateQueryId;
function generateAppId() {
    return IdPrefix.App + getRandomString(16);
}
exports.generateAppId = generateAppId;
function generateAiProxyTokenId() {
    return IdPrefix.AiProxyToken + getRandomString(24);
}
exports.generateAiProxyTokenId = generateAiProxyTokenId;
/**
 * Generate a cryptographically random signing secret for AI Proxy Token JWTs.
 * 48 chars of base62 ≈ 285 bits of entropy — sufficient for HMAC-SHA256.
 */
function generateAiProxyTokenSign() {
    return getRandomString(48);
}
exports.generateAiProxyTokenSign = generateAiProxyTokenSign;
function generateLogId() {
    return getRandomString(25);
}
exports.generateLogId = generateLogId;
