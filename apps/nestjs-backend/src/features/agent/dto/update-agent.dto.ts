export interface KnowledgeSources {
  docIds: string[];
  folderIds: string[];
}

export class UpdateAgentDto {
  name?: string;
  description?: string;
  baseId?: string;
  instructions?: string;
  modelKey?: string;
  isPublic?: boolean;
  knowledgeSources?: KnowledgeSources | null;
  respondToMentions?: boolean;
  allowDirectMessage?: boolean;
  memoryEnabled?: boolean;
}
