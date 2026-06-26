export const IMPORT_QUEUE = 'import-queue';
export const AI_GENERATION_QUEUE = 'ai-generation-queue';

export interface ImportJobData {
  importId: string;
  tableId: string;
  userId: string;
}

export interface AiGenerationJobData {
  jobType: 'table' | 'app' | 'workflow' | 'chat';
  prompt: string;
  baseId?: string;
  tableId?: string;
  userId: string;
}
