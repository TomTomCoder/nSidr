export declare enum IdPrefix {
    Space = "spc",
    Base = "bse",
    BaseNode = "bno",
    BaseNodeFolder = "bnf",
    Table = "tbl",
    Field = "fld",
    View = "viw",
    Record = "rec",
    Comment = "com",
    Attachment = "act",
    Choice = "cho",
    Workflow = "wfl",
    WorkflowTrigger = "wtr",
    WorkflowAction = "wac",
    WorkflowDecision = "wde",
    User = "usr",
    Account = "aco",
    Invitation = "inv",
    Share = "shr",
    Notification = "not",
    AccessToken = "acc",
    AuthorityMatrix = "aut",
    AuthorityMatrixRole = "aur",
    License = "lic",
    OAuthClient = "clt",
    Window = "win",
    RecordHistory = "rhi",
    Plugin = "plg",
    PluginInstall = "pli",
    PluginUser = "plu",
    PluginPanel = "plp",
    Dashboard = "dsh",
    RecordTrash = "rtr",
    Operation = "opr",
    Organization = "org",
    OrganizationDepartment = "odp",
    Integration = "int",
    Template = "tpl",
    TemplateCategory = "tpc",
    Task = "tsk",
    Chat = "cht",
    ChatMessage = "cmm",
    Query = "qry",
    App = "app",
    AiProxyToken = "apt"
}
export declare enum RandomType {
    String = "string",
    Number = "number"
}
export declare function getRandomString(len: number, type?: RandomType): string;
export declare function generateBaseNodeId(): string;
export declare function generateBaseNodeFolderId(): string;
export declare function generateTableId(): string;
export declare function generateFieldId(): string;
export declare function generateViewId(): string;
export declare function generateRecordId(): string;
export declare function generateCommentId(): string;
export declare function generateChoiceId(): string;
export declare function generateAttachmentId(): string;
export declare function generateWorkflowId(): string;
export declare function generateWorkflowTriggerId(): string;
export declare function generateWorkflowActionId(): string;
export declare function generateWorkflowDecisionId(): string;
export declare function generateUserId(): string;
export declare function generateWindowId(): string;
export declare function identify(id: string): IdPrefix | undefined;
export declare function generateSpaceId(): string;
export declare function generateBaseId(): string;
export declare function generateInvitationId(): string;
export declare function generateShareId(): string;
export declare function generateNotificationId(): string;
export declare function generateAccessTokenId(): string;
export declare function generateAccountId(): string;
export declare function generateAuthorityMatrixId(): string;
export declare function generateAuthorityMatrixRoleId(): string;
export declare function generateLicenseId(): string;
export declare function generateClientId(): string;
export declare function generateRecordHistoryId(): string;
export declare function generatePluginId(): string;
export declare function generatePluginInstallId(): string;
export declare function generatePluginUserId(): string;
export declare function generatePluginPanelId(): string;
export declare function generateDashboardId(): string;
export declare function generateOperationId(): string;
export declare function generateRecordTrashId(): string;
export declare function generateOrganizationId(): string;
export declare function generateOrganizationDepartmentId(): string;
export declare function generateIntegrationId(): string;
export declare function generateTemplateId(): string;
export declare function generateTemplateCategoryId(): string;
export declare function generateTaskId(): string;
export declare function generateChatId(): string;
export declare function generateChatMessageId(): string;
export declare function generateQueryId(): string;
export declare function generateAppId(): string;
export declare function generateAiProxyTokenId(): string;
/**
 * Generate a cryptographically random signing secret for AI Proxy Token JWTs.
 * 48 chars of base62 ≈ 285 bits of entropy — sufficient for HMAC-SHA256.
 */
export declare function generateAiProxyTokenSign(): string;
export declare function generateLogId(): string;
