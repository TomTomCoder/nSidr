import { Injectable, Logger } from '@nestjs/common';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { AiService } from '../ai/ai.service';

const WorkflowTriggerSchema = z.object({
  type: z.enum([
    'scheduled',
    'webhook_received',
    'email_received',
    'record_created',
    'record_updated',
    'record_deleted',
    'button_clicked',
    'record_matches_conditions',
  ]),
  config: z.record(z.string(), z.unknown()).default({}),
});

// Use z.lazy for recursive thenSteps/elseSteps on if_condition
type IWorkflowStep = {
  type: string;
  name?: string;
  config: Record<string, unknown>;
  thenSteps?: IWorkflowStep[];
  elseSteps?: IWorkflowStep[];
};

const WorkflowStepSchema: z.ZodType<IWorkflowStep> = z.lazy(() =>
  z.object({
    type: z.enum([
      'send_slack',
      'send_email',
      'http_request',
      'if_condition',
      'ai_generate',
      'create_record',
      'update_record',
      'get_records',
      'execute_script',
    ]),
    name: z.string().optional(),
    config: z.record(z.string(), z.unknown()).default({}),
    thenSteps: z.array(WorkflowStepSchema).optional(),
    elseSteps: z.array(WorkflowStepSchema).optional(),
  })
);

const WorkflowConfigSchema = z.object({
  name: z.string(),
  trigger: WorkflowTriggerSchema,
  steps: z.array(WorkflowStepSchema).min(1).max(10),
});

export type IGeneratedWorkflowConfig = z.infer<typeof WorkflowConfigSchema>;

const SYSTEM_PROMPT = `You are an automation workflow designer. Given a user description, produce a complete workflow configuration in JSON.

Trigger types available:
- scheduled: use config.cron (cron expression, e.g. "0 9 * * 1" for Monday 9am)
- webhook_received: no extra config needed
- email_received: no extra config needed
- record_created: no extra config needed
- record_updated: no extra config needed
- record_deleted: no extra config needed
- button_clicked: use config.tableId and optionally config.fieldId to scope to a specific button field
- record_matches_conditions: use config.tableId and config.conditions (array of {field, operator, value}) — fires when a record update matches all conditions

Step types available:
- send_slack: config needs { channel: "#channel-name", message: "text" }
- send_email: config needs { to: "email@domain.com", subject: "...", body: "..." }
- http_request: config needs { url: "https://...", method: "POST", body: "{}" }
- if_condition: config needs { condition: "expression" }
- ai_generate: config needs { prompt: "what to generate, supports {{fieldName}} interpolation" }
- create_record: config needs { tableId: "tbl...", fields: { fieldId: "value" } }
- update_record: config needs { tableId: "tbl...", recordId: "rec... or omit to use trigger record", fields: { fieldId: "value" } }
- get_records: config needs { tableId: "tbl...", take: 20 }
- execute_script: config needs { script: "JavaScript code; set result = <value>" } — runs sandboxed JS with data = triggerData

Template variables available in any config string:
- {{record.fields.fieldId}} — field value from the trigger event record
- {{tableId}} — tableId from the trigger event
- {{steps.0.output.text}} — ai_generate output from step 0
- {{steps.0.output.recordId}} — recordId created by a create_record step 0
- {{steps.N.*}} — any output property from step N (0-indexed)

Rules:
- name must be a short descriptive automation name (max 60 chars)
- include at least 1 step that does something meaningful
- for scheduled triggers always include a valid cron expression in config.cron
- chain steps: use get_records then update_record, or ai_generate then update_record with {{steps.0.output.text}}
- keep configs minimal and realistic`;

@Injectable()
export class WorkflowAiService {
  private readonly logger = new Logger(WorkflowAiService.name);

  constructor(private readonly aiService: AiService) {}

  async generateWorkflowFromPrompt(
    baseId: string,
    prompt: string
  ): Promise<IGeneratedWorkflowConfig> {
    this.logger.log(`Generating workflow from prompt for base ${baseId}`);

    const chatModels = await this.aiService.getChatModelInstance(baseId).catch(() => {
      throw new Error(
        'AI is not configured. Go to Admin Panel → AI Settings to set up a provider.'
      );
    });
    const modelInstance = chatModels.lg;

    // Try structured output (generateObject) first; fall back to text+parse
    try {
      const { object } = await generateObject({
        model: modelInstance,
        schema: WorkflowConfigSchema,
        system: SYSTEM_PROMPT,
        prompt,
      });
      return object;
    } catch (err) {
      this.logger.warn(
        `generateObject failed (${(err as Error).message}), falling back to text+parse`
      );
    }

    const { text } = await generateText({
      model: modelInstance,
      system:
        SYSTEM_PROMPT +
        '\n\nRespond with ONLY a valid JSON object matching the schema. No markdown, no explanation.',
      prompt,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return a valid JSON workflow config');

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    return WorkflowConfigSchema.parse(parsed);
  }

  /**
   * Execute an ai_generate step during workflow execution.
   * Interpolates {{fieldName}} placeholders from trigger data then calls the LLM.
   */
  async executeAiGenerateStep(
    baseId: string,
    config: Record<string, unknown>,
    triggerData: Record<string, unknown>
  ): Promise<string> {
    const prompt = config.prompt as string | undefined;
    if (!prompt) throw new Error('ai_generate step requires a config.prompt');

    const chatModels = await this.aiService.getChatModelInstance(baseId).catch(() => {
      throw new Error('AI is not configured for this base');
    });
    const modelInstance = chatModels.lg;

    // Full dot-path interpolation: {{record.fields.Status}}, {{steps.0.output.text}}, etc.
    const interpolated = prompt.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
      const parts = path.trim().split('.');
      let cur: unknown = triggerData;
      for (const p of parts) {
        if (cur !== null && cur !== undefined && typeof cur === 'object') {
          cur = (cur as Record<string, unknown>)[p];
        } else {
          return '';
        }
      }
      return cur !== undefined && cur !== null ? String(cur) : '';
    });

    const { text } = await generateText({ model: modelInstance, prompt: interpolated });
    return text;
  }
}
