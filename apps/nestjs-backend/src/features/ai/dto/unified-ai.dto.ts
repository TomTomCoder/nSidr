export interface IChatRo {
  message: string;
  conversationId?: string;
  modelKey: string;
  baseId?: string;
  activeBaseId?: string;
  attachments?: { url: string; name: string; mimetype: string }[];
  targetType?: 'table' | 'interface' | 'automation' | 'agent' | 'app' | 'mock_data';
  pageContext?: { tableId?: string; tableName?: string };
}

export interface IFullAppRo {
  baseId: string;
  prompt: string;
  modelKey: string;
  conversationId?: string;
}

export interface IAcceptProposalRo {
  proposalId: string;
  conversationId: string;
}
