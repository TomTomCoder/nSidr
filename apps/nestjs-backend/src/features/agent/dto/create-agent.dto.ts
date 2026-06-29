import type { KnowledgeSources } from './update-agent.dto';

export class CreateAgentDto {
  name!: string;
  description?: string;
  baseId!: string;
  instructions?: string;
  modelKey?: string;
  isPublic?: boolean;
  knowledgeSources?: KnowledgeSources | null;
  planningEnabled?: boolean;
  reflectionEnabled?: boolean;
  maxReflections?: number;
  maxIterations?: number;
}
