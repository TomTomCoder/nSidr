import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { AiOutputValidationService } from '../ai/ai-output-validation.service';
import { AiService } from '../ai/ai.service';

export const WorkflowTriggerSchema = z.object({
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

export const WorkflowStepSchema: z.ZodType<IWorkflowStep> = z.lazy(() =>
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
      'agent_run',
    ]),
    name: z.string().optional(),
    config: z.record(z.string(), z.unknown()).default({}),
    thenSteps: z.array(WorkflowStepSchema).optional(),
    elseSteps: z.array(WorkflowStepSchema).optional(),
  })
);

export const WorkflowConfigSchema = z.object({
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
- record_created: ALWAYS set config.tableId to the real id of the table this should fire for — omitting it means the trigger fires on every record created in ANY table in the base, not just the one you intend
- record_updated: same — ALWAYS set config.tableId, for the same reason
- record_deleted: same — ALWAYS set config.tableId, for the same reason
- button_clicked: use config.tableId and optionally config.fieldId to scope to a specific button field
- record_matches_conditions: use config.tableId and config.conditions (array of {field, operator, value}) — fires when a record update matches all conditions

Only use a tableId that appears in the "Real tables in this base" list given below. Never invent a tableId or use a table name as if it were an id — the engine looks up tables by id only, so a wrong id silently fails at execution time.

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
- agent_run: config needs { agentId: "real id from the 'Real agents in this base' list below", prompt: "task for the agent, supports {{fieldName}} interpolation" } — fire-and-forget, does not wait for or return the agent's output

Only use an agentId that appears in the "Real agents in this base" list given below — same rule as tableId: never invent one or use an agent's name as if it were its id.

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

  constructor(
    private readonly aiService: AiService,
    private readonly prismaService: PrismaService,
    private readonly aiOutputValidationService: AiOutputValidationService
  ) {}

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

    // Without the real table ids, the LLM has no choice but to invent a tableId or use a
    // table's name as if it were one — both fail silently at execution time (trigger never
    // scoped correctly, or a step's table lookup finds nothing). Confirmed via a real run.
    const tables = await this.prismaService.tableMeta.findMany({
      where: { baseId, deletedTime: null },
      select: { id: true, name: true },
    });
    const tableContext =
      tables.length > 0
        ? `\n\nReal tables in this base:\n${tables.map((t) => `- ${t.name}: ${t.id}`).join('\n')}`
        : '';

    // Same reasoning as tableContext above, for agent_run steps — read directly via Prisma
    // rather than injecting AgentService, since AgentModule already imports WorkflowModule and
    // the reverse import would be a circular module dependency for a single read-only query.
    const agents = await this.prismaService.agent.findMany({
      where: { baseId, isActive: true },
      select: { id: true, name: true },
    });
    const agentContext =
      agents.length > 0
        ? `\n\nReal agents in this base:\n${agents.map((a) => `- ${a.name}: ${a.id}`).join('\n')}`
        : '';
    const system = SYSTEM_PROMPT + tableContext + agentContext;

    // Each attempt gets its own bounded timeout (same AbortController pattern as the
    // http_request step below) — without this, a slow/hanging generateObject call (seen
    // taking 47s end-to-end in a real run) outlives the dev proxy's own timeout, surfacing a
    // false "failed" to the user while the request is still actually running server-side.
    // Failing the first attempt fast also gets to the text+parse fallback sooner.
    const withTimeout = <T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ms);
      return fn(controller.signal).finally(() => clearTimeout(timer));
    };

    // Try structured output (generateObject) first; fall back to text+parse
    try {
      const { object } = await withTimeout(15_000, (abortSignal) =>
        generateObject({
          model: modelInstance,
          schema: WorkflowConfigSchema,
          system,
          prompt,
          abortSignal,
        })
      );
      return object;
    } catch (err) {
      this.logger.warn(
        `generateObject failed (${(err as Error).message}), falling back to text+parse`
      );
    }

    const { text } = await withTimeout(15_000, (abortSignal) =>
      generateText({
        model: modelInstance,
        system:
          system +
          '\n\nRespond with ONLY a valid JSON object matching the schema. No markdown, no explanation.',
        prompt,
        abortSignal,
      })
    );

    // Reuses AiOutputValidationService's fence-stripping/JSON-parse tolerance instead of a
    // second, ad-hoc implementation — same "model wrapped its JSON in prose or a markdown
    // fence" problem this generateText fallback always had.
    const stripped = this.aiOutputValidationService.stripFences(text).trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return a valid JSON workflow config');

    const parsed = this.aiOutputValidationService.tryJsonParse(jsonMatch[0]);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('AI did not return a valid JSON workflow config');
    }
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
