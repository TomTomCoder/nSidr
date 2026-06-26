export type AgentRunEventType = 'think' | 'tool' | 'progress' | 'text' | 'done' | 'error';

export interface AgentRunEvent {
  type: AgentRunEventType;
  content?: string;
  name?: string;
  input?: object;
  output?: object;
  step?: string;
  role?: 'user' | 'assistant' | 'system';
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  type: AgentRunEventType;
  content: string;
  toolName?: string;
  toolInput?: object;
  toolOutput?: object;
  metadata?: object;
  createdTime: string;
}

export interface ApprovalPayload {
  question: string;
  context?: string;
}

export interface AgentConversation {
  id: string;
  agentId: string;
  title?: string;
  trigger: string;
  status: 'in_progress' | 'completed' | 'failed' | 'waiting_for_approval';
  approvalPayload?: ApprovalPayload;
  createdTime: string;
  updatedTime: string;
  createdBy: string;
  messages?: ConversationMessage[];
}

// UnifiedChatEvent — matches backend UnifiedChatEvent interface
export type UnifiedChatEventType =
  | 'text_chunk'
  | 'tool'
  | 'tool_result'
  | 'proposal'
  | 'done'
  | 'error';

export interface UnifiedChatEvent {
  type: UnifiedChatEventType;
  content?: string;
  name?: string;
  toolName?: string;
  input?: unknown;
  toolInput?: unknown;
  output?: unknown;
  toolOutput?: unknown;
  proposal?: { proposalId: string; action: string; preview: unknown };
  conversationId?: string;
  role?: 'user' | 'assistant';
}

// WorkspaceConversation — for history panel
export interface WorkspaceConversation {
  id: string;
  spaceId: string;
  title?: string;
  status: 'in_progress' | 'completed';
  createdTime: string;
  updatedTime: string;
  createdBy: string;
}
