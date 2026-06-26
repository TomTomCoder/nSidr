import { z } from 'zod';

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  baseId: z.string(),
  instructions: z.string().optional(),
  modelKey: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
});

export type ICreateAgent = z.infer<typeof CreateAgentSchema>;

export const UpdateAgentSchema = CreateAgentSchema.partial();

export type IUpdateAgent = z.infer<typeof UpdateAgentSchema>;

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  baseId: z.string(),
  instructions: z.string().nullable(),
  modelKey: z.string().nullable(),
  isPublic: z.boolean(),
  isActive: z.boolean(),
  maxIterations: z.number(),
  createdBy: z.string(),
  createdTime: z.string(),
});

export type IAgent = z.infer<typeof AgentSchema>;
