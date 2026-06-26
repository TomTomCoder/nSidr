"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkflowTestChannel = exports.getBaseNodeChannel = exports.getChatChannel = exports.getToolCallChannel = exports.getTableButtonClickChannel = exports.getTableCommentChannel = exports.getCommentChannel = exports.getTableImportChannel = exports.getBasePermissionUpdateChannel = exports.getActionTriggerChannel = exports.getUserNotificationChannel = exports.getCellCollaboratorsChannel = exports.getCollaboratorsChannel = void 0;
function getCollaboratorsChannel(tableId) {
    return `__col_user_${tableId}`;
}
exports.getCollaboratorsChannel = getCollaboratorsChannel;
function getCellCollaboratorsChannel(tableId) {
    return `__col_cell_user_${tableId}`;
}
exports.getCellCollaboratorsChannel = getCellCollaboratorsChannel;
function getUserNotificationChannel(userId) {
    return `__notification_user_${userId}`;
}
exports.getUserNotificationChannel = getUserNotificationChannel;
function getActionTriggerChannel(tableIdOrViewId) {
    return `__action_trigger_${tableIdOrViewId}`;
}
exports.getActionTriggerChannel = getActionTriggerChannel;
function getBasePermissionUpdateChannel(baseId) {
    return `__base_permission_update_${baseId}`;
}
exports.getBasePermissionUpdateChannel = getBasePermissionUpdateChannel;
function getTableImportChannel(tableId) {
    return `__table_import_${tableId}`;
}
exports.getTableImportChannel = getTableImportChannel;
function getCommentChannel(tableId, recordId) {
    return `__record_comment_${tableId}_${recordId}`;
}
exports.getCommentChannel = getCommentChannel;
function getTableCommentChannel(tableId) {
    return `__table_comment_${tableId}`;
}
exports.getTableCommentChannel = getTableCommentChannel;
function getTableButtonClickChannel(tableId) {
    return `__table_button_click_${tableId}`;
}
exports.getTableButtonClickChannel = getTableButtonClickChannel;
function getToolCallChannel(toolCallId) {
    return `__tool_call_${toolCallId}`;
}
exports.getToolCallChannel = getToolCallChannel;
function getChatChannel(chatId) {
    return `__chat_${chatId}`;
}
exports.getChatChannel = getChatChannel;
function getBaseNodeChannel(baseId) {
    return `__base_node_${baseId}`;
}
exports.getBaseNodeChannel = getBaseNodeChannel;
function getWorkflowTestChannel(workflowId) {
    return `__workflow_test_${workflowId}`;
}
exports.getWorkflowTestChannel = getWorkflowTestChannel;
