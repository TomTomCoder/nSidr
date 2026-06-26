import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { FieldKeyType } from '@teable/core';
import { RecordOpenApiService } from '../record/open-api/record-open-api.service';
import { MailSenderService } from '../mail-sender/mail-sender.service';
import { WorkflowAiService } from './workflow-ai.service';

export interface IStepResult {
  type: string;
  status: 'success' | 'error' | 'skipped';
  note: string;
  output?: unknown;
}

interface IWorkflowStep {
  type: string;
  config: Record<string, unknown>;
}

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly recordOpenApiService: RecordOpenApiService,
    private readonly mailSenderService: MailSenderService,
    private readonly workflowAiService: WorkflowAiService
  ) {}

  async executeSteps(
    steps: IWorkflowStep[],
    triggerData: Record<string, unknown> = {},
    dryRun = false,
    baseId?: string
  ): Promise<IStepResult[]> {
    const results: IStepResult[] = [];
    // ctx is passed to each step so templates like {{steps.0.output.text}} resolve
    const ctx: Record<string, unknown> = { ...triggerData, steps: [] };

    for (const step of steps) {
      const result = await this.executeStep(step, ctx, dryRun, baseId);
      results.push(result);
      // Merge this step's output into ctx.steps so subsequent steps can reference it
      (ctx.steps as unknown[]).push(result.output ?? {});
      if (result.status === 'error') break;
    }

    return results;
  }

  private async executeStep(
    step: IWorkflowStep,
    triggerData: Record<string, unknown>,
    dryRun: boolean,
    baseId?: string
  ): Promise<IStepResult> {
    try {
      switch (step.type) {
        case 'send_slack':
          return await this.executeSlackStep(step.config, triggerData, dryRun);
        case 'send_email':
          return await this.executeEmailStep(step.config, triggerData, dryRun);
        case 'http_request':
          return await this.executeHttpStep(step.config, triggerData, dryRun);
        case 'if_condition':
          return this.executeIfConditionStep(step.config, triggerData, dryRun, baseId);
        case 'execute_script':
          return this.executeScriptStep(step.config, triggerData, dryRun);
        case 'ai_generate':
          return await this.executeAiGenerateStep(step.config, triggerData, dryRun, baseId);
        case 'create_record':
          return await this.executeCreateRecordStep(step.config, triggerData, dryRun);
        case 'update_record':
          return await this.executeUpdateRecordStep(step.config, triggerData, dryRun);
        case 'get_records':
          return await this.executeGetRecordsStep(step.config, triggerData, dryRun);
        case 'record_action': {
          const action = step.config.action as string | undefined;
          if (action === 'create')
            return await this.executeCreateRecordStep(step.config, triggerData, dryRun);
          if (action === 'update')
            return await this.executeUpdateRecordStep(step.config, triggerData, dryRun);
          if (action === 'get')
            return await this.executeGetRecordsStep(step.config, triggerData, dryRun);
          return {
            type: 'record_action',
            status: 'error',
            note: 'Missing config.action — expected "create", "update", or "get"',
          };
        }
        default:
          return {
            type: step.type,
            status: 'skipped',
            note: `Step type "${step.type}" not yet supported`,
          };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`[executeStep] ${step.type} failed: ${msg}`);
      return { type: step.type, status: 'error', note: msg };
    }
  }

  /**
   * Safe expression evaluator for if_condition steps.
   * Supports: ==, !=, >, <, >=, <=, contains, startsWith, endsWith, isEmpty, isNotEmpty
   * Field references use dot notation: "record.fields.Status == 'Done'"
   * Logical connectors: && ||
   * No eval — parsed token-by-token.
   */
  private async executeIfConditionStep(
    config: Record<string, unknown>,
    triggerData: Record<string, unknown>,
    dryRun: boolean,
    baseId?: string
  ): Promise<IStepResult> {
    const condition = config.condition as string | undefined;
    if (!condition) {
      return { type: 'if_condition', status: 'error', note: 'Missing condition expression' };
    }

    let result: boolean;
    try {
      result = this.evaluateCondition(condition, triggerData);
    } catch (e) {
      return {
        type: 'if_condition',
        status: 'error',
        note: `Condition error: ${(e as Error).message}`,
      };
    }

    const branchSteps = result
      ? (config.thenSteps as IWorkflowStep[] | undefined)
      : (config.elseSteps as IWorkflowStep[] | undefined);

    let branchResults: IStepResult[] | undefined;
    if (Array.isArray(branchSteps) && branchSteps.length > 0) {
      branchResults = await this.executeSteps(branchSteps, triggerData, dryRun, baseId);
    }

    return {
      type: 'if_condition',
      status: 'success',
      note: result ? 'Condition true — ran thenSteps' : 'Condition false — ran elseSteps',
      output: { result, branchResults },
    };
  }

  private evaluateCondition(expr: string, data: Record<string, unknown>): boolean {
    // Split on || first (lowest precedence), then &&
    if (expr.includes('||')) {
      return expr.split('||').some((part) => this.evaluateCondition(part.trim(), data));
    }
    if (expr.includes('&&')) {
      return expr.split('&&').every((part) => this.evaluateCondition(part.trim(), data));
    }

    const resolve = (token: string): unknown => {
      const t = token.trim();
      if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
      if (t === 'true') return true;
      if (t === 'false') return false;
      if (!isNaN(Number(t))) return Number(t);
      // Dot-path lookup in triggerData
      return t.split('.').reduce<unknown>((obj, key) => {
        if (obj !== null && obj !== undefined && typeof obj === 'object') {
          return (obj as Record<string, unknown>)[key];
        }
        return undefined;
      }, data as unknown);
    };

    const ops = [
      '>=',
      '<=',
      '!=',
      '==',
      '>',
      '<',
      'contains',
      'startsWith',
      'endsWith',
      'isEmpty',
      'isNotEmpty',
    ];
    for (const op of ops) {
      const idx = expr.indexOf(` ${op} `);
      if (idx !== -1) {
        const left = resolve(expr.slice(0, idx));
        const right = resolve(expr.slice(idx + op.length + 2));
        const ls = String(left ?? '');
        const rs = String(right ?? '');
        if (op === '==') return left == right; // eslint-disable-line eqeqeq
        if (op === '!=') return left != right; // eslint-disable-line eqeqeq
        if (op === '>') return Number(left) > Number(right);
        if (op === '<') return Number(left) < Number(right);
        if (op === '>=') return Number(left) >= Number(right);
        if (op === '<=') return Number(left) <= Number(right);
        if (op === 'contains') return ls.includes(rs);
        if (op === 'startsWith') return ls.startsWith(rs);
        if (op === 'endsWith') return ls.endsWith(rs);
      }
      // Unary ops (no right operand)
      if (expr.trim() === `${expr.split(' ')[0]} ${op}`) {
        const left = resolve(expr.split(' ')[0]);
        if (op === 'isEmpty') return left === undefined || left === null || left === '';
        if (op === 'isNotEmpty') return left !== undefined && left !== null && left !== '';
      }
    }

    throw new Error(`Cannot evaluate: "${expr}"`);
  }

  /**
   * Sandboxed script execution using Node.js vm module.
   * Script receives triggerData as `data` and must return a value via `result = ...`
   * Hard timeout: 5 seconds. No access to require, process, fs.
   */
  private executeScriptStep(
    config: Record<string, unknown>,
    triggerData: Record<string, unknown>,
    dryRun: boolean
  ): IStepResult {
    const script = config.script as string | undefined;
    if (!script) return { type: 'execute_script', status: 'error', note: 'Missing script' };

    if (dryRun) {
      return {
        type: 'execute_script',
        status: 'success',
        note: `[DRY-RUN] Would execute script (${script.length} chars)`,
      };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const vm = require('vm') as typeof import('vm');
      const sandbox: Record<string, unknown> = {
        data: structuredClone(triggerData),
        result: undefined,
      };
      vm.createContext(sandbox);
      vm.runInContext(script, sandbox, { timeout: 5000 });
      return {
        type: 'execute_script',
        status: 'success',
        note: 'Script executed successfully',
        output: { result: sandbox.result },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { type: 'execute_script', status: 'error', note: `Script error: ${msg}` };
    }
  }

  private async executeAiGenerateStep(
    config: Record<string, unknown>,
    triggerData: Record<string, unknown>,
    dryRun: boolean,
    baseId?: string
  ): Promise<IStepResult> {
    if (dryRun) {
      const prompt = config.prompt as string | undefined;
      return {
        type: 'ai_generate',
        status: 'success',
        note: `[DRY-RUN] Would generate AI output for prompt: "${String(prompt ?? '').slice(0, 60)}"`,
      };
    }
    if (!baseId) {
      return { type: 'ai_generate', status: 'error', note: 'baseId required for ai_generate step' };
    }
    const text = await this.workflowAiService.executeAiGenerateStep(baseId, config, triggerData);
    return {
      type: 'ai_generate',
      status: 'success',
      note: `AI generated ${text.length} chars`,
      output: { text },
    };
  }

  private async executeCreateRecordStep(
    config: Record<string, unknown>,
    triggerData: Record<string, unknown>,
    dryRun: boolean
  ): Promise<IStepResult> {
    const tableId = config.tableId as string | undefined;
    if (!tableId) return { type: 'create_record', status: 'error', note: 'Missing tableId' };

    // Fields can contain {{triggerData.fieldName}} template vars — resolve them
    const rawFields = (config.fields ?? {}) as Record<string, unknown>;
    const fields = this.resolveTemplateVars(rawFields, triggerData);

    if (dryRun) {
      return {
        type: 'create_record',
        status: 'success',
        note: `[DRY-RUN] Would create record in table ${tableId} with fields: ${JSON.stringify(fields)}`,
      };
    }

    const result = await this.recordOpenApiService.multipleCreateRecords(tableId, {
      records: [{ fields }],
      fieldKeyType: FieldKeyType.Id,
    });

    const created = result.records[0];
    return {
      type: 'create_record',
      status: 'success',
      note: `Enregistrement créé (id: ${created?.id})`,
      output: { recordId: created?.id, fields: created?.fields },
    };
  }

  private async executeUpdateRecordStep(
    config: Record<string, unknown>,
    triggerData: Record<string, unknown>,
    dryRun: boolean
  ): Promise<IStepResult> {
    const tableId = config.tableId as string | undefined;
    // recordId may come from config or from triggerData (e.g. the record that triggered this workflow)
    const recordId =
      (config.recordId as string | undefined) ?? (triggerData.record as { id?: string })?.id;
    if (!tableId) return { type: 'update_record', status: 'error', note: 'Missing tableId' };
    if (!recordId) return { type: 'update_record', status: 'error', note: 'Missing recordId' };

    const rawFields = (config.fields ?? {}) as Record<string, unknown>;
    const fields = this.resolveTemplateVars(rawFields, triggerData);

    if (dryRun) {
      return {
        type: 'update_record',
        status: 'success',
        note: `[DRY-RUN] Would update record ${recordId} in table ${tableId}`,
      };
    }

    const updated = await this.recordOpenApiService.updateRecord(tableId, recordId, {
      record: { fields },
      fieldKeyType: FieldKeyType.Id,
    });

    return {
      type: 'update_record',
      status: 'success',
      note: `Enregistrement ${recordId} mis à jour`,
      output: { recordId: updated.id, fields: updated.fields },
    };
  }

  private async executeGetRecordsStep(
    config: Record<string, unknown>,
    _triggerData: Record<string, unknown>,
    dryRun: boolean
  ): Promise<IStepResult> {
    const tableId = config.tableId as string | undefined;
    const take = Math.min(Number(config.take ?? 20), 100);

    if (!tableId) return { type: 'get_records', status: 'error', note: 'Missing tableId' };

    if (dryRun) {
      return {
        type: 'get_records',
        status: 'success',
        note: `[DRY-RUN] Would fetch up to ${take} records from table ${tableId}`,
      };
    }

    const table = await this.prismaService.tableMeta.findUnique({
      where: { id: tableId },
      select: { dbTableName: true },
    });

    if (!table) return { type: 'get_records', status: 'error', note: `Table ${tableId} not found` };

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table.dbTableName)) {
      return { type: 'get_records', status: 'error', note: 'Invalid table name' };
    }

    const records = await this.prismaService.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${table.dbTableName}" WHERE "__deleted_time__" IS NULL LIMIT $1`,
      take
    );

    return {
      type: 'get_records',
      status: 'success',
      note: `${records.length} enregistrement(s) récupéré(s) depuis ${tableId}`,
      output: { records: records.map((r) => ({ id: r.id })), count: records.length },
    };
  }

  /** Resolve a single string with {{dot.path}} placeholders against ctx. */
  private interpolate(template: string, ctx: Record<string, unknown>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
      const parts = path.trim().split('.');
      let cur: unknown = ctx;
      for (const p of parts) {
        if (cur !== null && cur !== undefined && typeof cur === 'object') {
          cur = (cur as Record<string, unknown>)[p];
        } else {
          return '';
        }
      }
      return cur !== undefined && cur !== null ? String(cur) : '';
    });
  }

  /** Replace {{path.to.value}} placeholders in field values with data from ctx. */
  private resolveTemplateVars(
    fields: Record<string, unknown>,
    ctx: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      resolved[key] = typeof value === 'string' ? this.interpolate(value, ctx) : value;
    }
    return resolved;
  }

  private async resolveSlackToken(config: Record<string, unknown>): Promise<string | null> {
    // Direct token in config (manual setup)
    if (config.accessToken && typeof config.accessToken === 'string') {
      return config.accessToken;
    }

    // Token via integrationId stored in Prisma Integration table
    if (config.integrationId && typeof config.integrationId === 'string') {
      const record = await this.prismaService.integration.findFirst({
        where: { type: 'slack' },
      });
      if (record?.config) {
        try {
          const parsed = JSON.parse(record.config) as { accessToken?: string };
          if (parsed.accessToken) return parsed.accessToken;
        } catch {
          // malformed config
        }
      }
    }

    return null;
  }

  private async executeSlackStep(
    config: Record<string, unknown>,
    triggerData: Record<string, unknown>,
    dryRun: boolean
  ): Promise<IStepResult> {
    const channel = config.channel as string | undefined;
    const rawMessage = config.message as string | undefined;
    const message = rawMessage ? this.interpolate(rawMessage, triggerData) : undefined;

    if (!channel) return { type: 'send_slack', status: 'error', note: 'Canal Slack manquant' };
    if (!message) return { type: 'send_slack', status: 'error', note: 'Message Slack manquant' };

    if (dryRun) {
      return {
        type: 'send_slack',
        status: 'success',
        note: `[DRY-RUN] Enverrait "${message.slice(0, 60)}" vers ${channel}`,
      };
    }

    const token = await this.resolveSlackToken(config);
    if (!token) {
      return {
        type: 'send_slack',
        status: 'error',
        note: 'Token Slack introuvable — connectez un compte Slack dans Paramètres › Intégrations',
      };
    }

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, text: message }),
    });
    const body = (await res.json()) as { ok: boolean; error?: string };

    if (!body.ok) {
      return { type: 'send_slack', status: 'error', note: `Slack error: ${body.error}` };
    }

    return { type: 'send_slack', status: 'success', note: `Message envoyé dans ${channel}` };
  }

  private async executeEmailStep(
    config: Record<string, unknown>,
    triggerData: Record<string, unknown>,
    dryRun: boolean
  ): Promise<IStepResult> {
    const to = config.to as string | undefined;
    const subject = config.subject
      ? this.interpolate(config.subject as string, triggerData)
      : undefined;
    const body = config.body ? this.interpolate(config.body as string, triggerData) : undefined;

    if (!to) return { type: 'send_email', status: 'error', note: 'Destinataire manquant' };
    if (!subject) return { type: 'send_email', status: 'error', note: 'Sujet manquant' };

    if (dryRun) {
      return {
        type: 'send_email',
        status: 'success',
        note: `[DRY-RUN] Enverrait "${subject}" à ${to}`,
      };
    }

    await this.mailSenderService.sendMail({
      to,
      subject,
      text: body ?? '',
    });

    return { type: 'send_email', status: 'success', note: `Email envoyé à ${to}` };
  }

  private async executeHttpStep(
    config: Record<string, unknown>,
    triggerData: Record<string, unknown>,
    dryRun: boolean
  ): Promise<IStepResult> {
    const url = config.url ? this.interpolate(config.url as string, triggerData) : undefined;
    const method = (config.method as string | undefined) ?? 'POST';
    const authHeader = config.authHeader as string | undefined;
    const bodyRaw = config.body ? this.interpolate(config.body as string, triggerData) : undefined;

    if (!url) return { type: 'http_request', status: 'error', note: 'URL manquante' };

    if (dryRun) {
      return {
        type: 'http_request',
        status: 'success',
        note: `[DRY-RUN] ${method} ${url}`,
      };
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;

    let parsedBody: string | undefined;
    if (bodyRaw && method !== 'GET') {
      parsedBody = bodyRaw;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: parsedBody,
        signal: controller.signal,
      });

      return {
        type: 'http_request',
        status: res.ok ? 'success' : 'error',
        note: `${method} ${url} → HTTP ${res.status}`,
        output: { status: res.status, ok: res.ok },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
