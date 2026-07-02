import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { generateText, stepCountIs, jsonSchema } from 'ai';
import { APICallError } from '@ai-sdk/provider';
import { FieldKeyType } from '@teable/core';
import { Prisma, PrismaService } from '@teable/db-main-prisma';
import { DataPrismaService } from '@teable/db-data-prisma';
import { AI_SERVICE } from '../../shared/tokens/ai.token';
import { PromptService } from '../ai/prompt.service';
import { RecordOpenApiService } from '../record/open-api/record-open-api.service';
import { AgentService } from './agent.service';
import { AgentToolRegistryService } from './agent-tool-registry.service';
import { AgentMemoryService } from './agent-memory.service';
import { AgentPlannerService, type IPlanStep } from './agent-planner.service';
import { AgentConversationService } from './agent-conversation.service';
import { GmailOAuthService } from './oauth/gmail-oauth.service';
import { executeGmailTool } from './oauth/gmail-agent-tool';
import { SlackOAuthService } from './oauth/slack-oauth.service';
import { SlackClient } from './oauth/slack-client';
import { executeSlackTool } from './oauth/slack-agent-tool';
import { GitHubOAuthService } from './oauth/github-oauth.service';
import { GitHubClient } from './oauth/github-client';
import { executeGitHubTool } from './oauth/github-agent-tool';
import { McpClientAggregatorService } from './mcp/mcp-client-aggregator.service';
import { parseMcpToolName } from './mcp/mcp-tool-adapter';
import { DocSearchService, type DocSearchScope } from '../doc-search/search.service';
import { KnowledgeDocService } from '../doc-search/knowledge-doc.service';
import { DocLinkService } from '../doc-search/doc-link.service';
import { MEMORY_EXTRACTOR, type IMemoryExtractor } from '../doc-search/memory-extractor';
import { WorkflowService } from '../workflow/workflow.service';
import { WorkflowExecutorService } from '../workflow/workflow-executor.service';
import { TableOpenApiService } from '../table/open-api/table-open-api.service';
import { FieldOpenApiService } from '../field/open-api/field-open-api.service';
import { ViewOpenApiService } from '../view/open-api/view-open-api.service';
import { AppBuilderService } from '../app-builder/app-builder.service';
import { executeSchemaTool } from './schema-agent-tools';
import { GuardrailService } from './agent-guardrail.service';

// Type for AiService (avoid circular import)
interface IAiService {
  getAIConfig(baseId: string): Promise<any>;
  getModelInstance(modelKey: string, llmProviders: any): Promise<any>;
}

export interface AgentRunEvent {
  type: 'think' | 'tool' | 'progress' | 'text' | 'done' | 'error' | 'hitl';
  content?: string;
  name?: string;
  input?: object;
  output?: object;
  step?: string;
  payload?: { question: string; context?: string };
}

export interface AgentRunContext {
  agentId: string;
  trigger: string; // 'cron' | 'mention' | 'dm' | 'manual'
  triggerPayload?: object; // record context for mention/DM, empty for cron
  userId?: string;
  conversationId?: string; // When set, reuse existing conversation and load prior messages
  syntheticUserMessage?: string; // When set, injected as a user-role message after history load (used by HITL resume)
  depth?: number; // Delegation depth (orchestrator=0). Bounds multi-agent recursion.
  pageContext?: { tableId?: string; tableName?: string; viewId?: string; viewName?: string };
}

@Injectable()
export class AgentExecutionService {
  private readonly logger = new Logger(AgentExecutionService.name);
  /** Tracks conversation IDs with an active run to prevent concurrent state corruption. */
  private readonly activeRuns = new Set<string>();

  constructor(
    private readonly agentService: AgentService,
    private readonly toolRegistry: AgentToolRegistryService,
    private readonly memoryService: AgentMemoryService,
    private readonly planner: AgentPlannerService,
    private readonly conversationService: AgentConversationService,
    @Inject(AI_SERVICE) private readonly aiService: IAiService,
    private readonly promptService: PromptService,
    private readonly prismaService: PrismaService,
    private readonly dataPrismaService: DataPrismaService,
    private readonly recordOpenApiService: RecordOpenApiService,
    private readonly gmailOAuthService: GmailOAuthService,
    private readonly slackOAuthService: SlackOAuthService,
    private readonly slackClient: SlackClient,
    private readonly gitHubOAuthService: GitHubOAuthService,
    private readonly gitHubClient: GitHubClient,
    private readonly httpService: HttpService,
    private readonly mcpAggregator: McpClientAggregatorService,
    private readonly docSearchService: DocSearchService,
    private readonly knowledgeDocService: KnowledgeDocService,
    private readonly docLinkService: DocLinkService,
    @Optional() @Inject(MEMORY_EXTRACTOR) private readonly memoryExtractor?: IMemoryExtractor,
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutorService: WorkflowExecutorService,
    private readonly tableOpenApiService: TableOpenApiService,
    private readonly fieldOpenApiService: FieldOpenApiService,
    private readonly viewOpenApiService: ViewOpenApiService,
    private readonly appBuilderService: AppBuilderService,
    private readonly guardrailService: GuardrailService
  ) {}

  /**
   * Returns true when the LLM error is retryable (429 or >= 500) or a network-level
   * transient failure. Non-retryable 4xx errors (400, 401, 403, 404…) return false
   * to prevent request amplification (T-24-04-01 mitigation).
   */
  private isRetryableLlmError(err: unknown): boolean {
    if (APICallError.isInstance(err)) {
      const code = (err as APICallError).statusCode;
      if (code === undefined) return false;
      return code === 429 || code >= 500;
    }
    // Low-level network transients
    const errno = (err as NodeJS.ErrnoException).code;
    if (errno && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(errno)) {
      return true;
    }
    return false;
  }

  /**
   * Resolve the agent's spaceId via base → space FK. Throws if the base is missing.
   * KG dispatchers MUST NEVER trust an agent-supplied spaceId from toolCall.args
   * (T-21-16 mitigation).
   */
  /** ponytail: fire-and-forget entity extraction from agent memory into the knowledge graph */
  private async extractAndStoreEntities(
    baseId: string,
    memoryId: string,
    content: string
  ): Promise<void> {
    if (!this.memoryExtractor || !content.trim()) return;
    let spaceId: string;
    try {
      spaceId = await this.resolveAgentSpaceId({ baseId });
    } catch {
      return;
    }
    let extraction: {
      entities: { name: string; type: string; summary: string }[];
      relations: { from: string; to: string; label: string }[];
    };
    try {
      extraction = await this.memoryExtractor.extractMemory(spaceId, content);
    } catch {
      return;
    }
    const entities = extraction.entities ?? [];
    if (entities.length === 0) return;
    const { randomUUID } = require('crypto') as { randomUUID: () => string };
    const idByName = new Map<string, string>();
    const rows = entities.map((e) => {
      const id = randomUUID();
      idByName.set(e.name, id);
      return Prisma.sql`(${id}, ${spaceId}, ${e.name}, ${e.type}, ${e.summary}, ${memoryId})`;
    });
    try {
      await this.prismaService
        .$executeRaw`INSERT INTO "memory_entity" ("id","spaceId","name","type","summary","sourceDocId") VALUES ${Prisma.join(rows)} ON CONFLICT DO NOTHING`;
      const relRows = (extraction.relations ?? [])
        .map((r) => ({ from: idByName.get(r.from), to: idByName.get(r.to), label: r.label }))
        .filter((r): r is { from: string; to: string; label: string } => Boolean(r.from && r.to))
        .map(
          (r) =>
            Prisma.sql`(${randomUUID()}, ${spaceId}, ${r.from}, ${r.to}, ${r.label}, ${memoryId})`
        );
      if (relRows.length > 0) {
        await this.prismaService
          .$executeRaw`INSERT INTO "memory_relation" ("id","spaceId","fromEntityId","toEntityId","label","sourceDocId") VALUES ${Prisma.join(relRows)} ON CONFLICT DO NOTHING`;
      }
    } catch (err) {
      this.logger.warn(`extractAndStoreEntities failed: ${(err as Error).message}`);
    }
  }

  private async resolveAgentSpaceId(agent: { baseId: string }): Promise<string> {
    const base = await this.prismaService.base.findUnique({
      where: { id: agent.baseId },
      select: { spaceId: true },
    });
    if (!base) {
      throw new Error(`Base ${agent.baseId} not found`);
    }
    return base.spaceId;
  }

  /**
   * Resolve the *user* id to attribute agent-written rows to. `imported_doc.createdBy`
   * (and FK-linked sibling tables) point at the users table — passing the agent.id
   * fails with `imported_doc_createdBy_fkey`. The agent acts as its owner user;
   * prefer the real caller user when present, fall back to the agent's `createdBy`.
   */
  private resolveAgentCallerUserId(
    agent: { createdBy?: string | null },
    ctx: AgentRunContext
  ): string {
    return ctx.userId || agent.createdBy || 'system';
  }

  // Returns an AsyncGenerator of AgentRunEvents (consumed by SSE/NDJSON controller)
  async *run(ctx: AgentRunContext): AsyncGenerator<AgentRunEvent> {
    // Guard: reject concurrent runs on the same conversation to prevent state corruption
    const lockKey = ctx.conversationId ? `conv:${ctx.conversationId}` : `agent:${ctx.agentId}:new`;
    if (this.activeRuns.has(lockKey)) {
      yield {
        type: 'error',
        content:
          'A run is already in progress for this conversation. Please wait for it to complete.',
      };
      return;
    }
    this.activeRuns.add(lockKey);
    try {
      yield* this._runInner(ctx);
    } finally {
      this.activeRuns.delete(lockKey);
    }
  }

  private async *_runInner(ctx: AgentRunContext): AsyncGenerator<AgentRunEvent> {
    yield { type: 'progress', step: 'Loading agent configuration' };

    // Step 1: Load agent + tools
    const agent = await this.agentService.findOne(ctx.agentId);
    const toolDefs = await this.toolRegistry.getToolsForAgent(ctx.agentId);

    // Step 2: Resolve or create conversation
    let conversationId: string;
    if (ctx.conversationId) {
      // Reuse existing conversation — load prior messages for multi-turn memory
      conversationId = ctx.conversationId;
    } else {
      // Create a new conversation
      conversationId = await this.conversationService.createConversation(
        ctx.agentId,
        ctx.userId || 'system',
        ctx.trigger
      );
    }

    // Step 3: Guard model resolution — surface missing AI config as structured error
    let resolvedModelKey: string | null = agent.modelKey ?? null;
    try {
      if (!resolvedModelKey) {
        const aiConfig = await this.aiService.getAIConfig(agent.baseId);
        resolvedModelKey = aiConfig?.chatModel?.lg ?? null;
      }
      if (!resolvedModelKey) {
        throw new Error(`No model key configured for agent (baseId: ${agent.baseId})`);
      }
      // Validate the model instance is resolvable (throws if provider unconfigured)
      const aiConfig = await this.aiService.getAIConfig(agent.baseId);
      await this.aiService.getModelInstance(resolvedModelKey, aiConfig.llmProviders);
    } catch (configError) {
      const isConfigError =
        (configError as Error).message?.includes('AI configuration is not set') ||
        (configError as Error).message?.includes('No model key');
      const errorMessage = isConfigError
        ? 'AI is not configured for this base. Set the base AI / AI Gateway model in base settings before running the agent.'
        : `Agent run failed: ${(configError as Error).message}`;
      yield { type: 'error', content: errorMessage };
      try {
        await this.conversationService.markConversationFailed(conversationId);
      } catch {
        // Ignore failure to update conversation status — do not rethrow
      }
      return;
    }

    // Step 4: Load memory context
    yield { type: 'progress', step: 'Loading memory context' };
    const recentMemories = await this.memoryService.getRecent(ctx.agentId);
    const preferences = await this.memoryService.getPreferences(ctx.agentId);

    // Build system prompt: agent instructions + memory summary
    const memoryContext = recentMemories.length
      ? `\n\nRecent context:\n${recentMemories.slice(0, 5).join('\n')}`
      : '';
    const prefContext = Object.keys(preferences).length
      ? `\n\nUser preferences:\n${JSON.stringify(preferences, null, 2)}`
      : '';

    // Proactive RAG: seed system prompt with relevant knowledge-base snippets so the
    // agent has context before the first tool call, not just when it explicitly calls
    // search_knowledge_base. Uses the agent's instructions as the query since they
    // describe what the agent is supposed to do.
    let ragContext = '';
    try {
      const spaceId = await this.resolveAgentSpaceId(agent);
      const ragQuery = agent.instructions || 'general task';
      const ragDocs = await this.docSearchService.hybridSearch(spaceId, ragQuery, 3);
      if (ragDocs.length) {
        const snippets = ragDocs
          .map((d) => `[${d.docTitle}]: ${d.chunkContent.slice(0, 300)}`)
          .join('\n');
        ragContext = `\n\nRelevant knowledge base:\n${snippets}`;
      }
    } catch {
      // RAG failure must never block agent execution — degrade silently
    }

    // 3-tier lookup: agent-specific prompt override → the agent's own instructions →
    // hardcoded default. NOTE: PromptService.get(key, modelId?) returns undefined for
    // unknown keys (its 2nd arg is modelId, NOT a fallback) — so we must OR in the
    // agent's instructions explicitly, otherwise the system prompt loses the agent's task.
    const defaultInstructions = agent.instructions || 'You are a helpful agent.';
    const promptOverride = await this.promptService.get(
      `agent:${ctx.agentId}.system` as Parameters<typeof this.promptService.get>[0]
    );
    const instructions = promptOverride || defaultInstructions;
    const pageCtxStr = ctx.pageContext
      ? `\n\nCurrent page: table="${ctx.pageContext.tableName ?? ctx.pageContext.tableId ?? ''}"${ctx.pageContext.viewName ? `, view="${ctx.pageContext.viewName}"` : ''}.`
      : '';
    const systemPrompt = instructions + ragContext + memoryContext + prefContext + pageCtxStr;

    // Build message history: system + prior turns (if resuming) + new user message
    // Use any[] to accommodate tool-role messages alongside text turns
    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    // Load prior conversation messages for multi-turn memory
    if (ctx.conversationId) {
      // Authorization: verify the calling user owns this conversation before loading history
      const conv = await this.conversationService.findConversation(ctx.conversationId);
      if (conv && ctx.userId && conv.createdBy !== ctx.userId) {
        yield { type: 'error', content: 'Conversation not found' };
        return;
      }
      const history = await this.conversationService.getConversationHistory(ctx.conversationId);
      if (history?.messages) {
        for (const msg of history.messages) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
            });
          }
        }
      }
    }

    // Inject synthetic user message for HITL resume (e.g. "Approved: <question>")
    if (ctx.syntheticUserMessage) {
      messages.push({ role: 'user', content: ctx.syntheticUserMessage });
      await this.conversationService.saveMessage({
        conversationId,
        role: 'user',
        type: 'text',
        content: ctx.syntheticUserMessage,
      });
    }

    // Append the new user message
    const userMessage = this.buildUserMessage(ctx);
    messages.push({ role: 'user', content: userMessage });

    // Persist the new user message to the conversation
    await this.conversationService.saveMessage({
      conversationId,
      role: 'user',
      type: 'text',
      content: userMessage,
    });

    // --- Plan-and-execute + reflexion controls ---
    const planningEnabled = (agent as { planningEnabled?: boolean }).planningEnabled !== false;
    const reflectionEnabled =
      (agent as { reflectionEnabled?: boolean }).reflectionEnabled !== false;
    const maxReflections = (agent as { maxReflections?: number }).maxReflections ?? 2;
    const hasTools = toolDefs.length > 0;
    const goalText = userMessage;
    const baseSystemPrompt = systemPrompt;
    let plan: IPlanStep[] = [];
    let reflections = 0;

    // Phase A — Planning: decompose the goal into a tracked todo plan (tool-using agents only).
    if (planningEnabled && hasTools) {
      yield { type: 'progress', step: 'Planning' };
      plan = await this.planner.createPlan({
        baseId: agent.baseId,
        modelKey: resolvedModelKey,
        goal: goalText,
        instructions,
        toolNames: toolDefs.map((d) => d.function.name),
      });
      if (plan.length) {
        const planText = this.planner.renderPlan(plan);
        messages[0].content = `${baseSystemPrompt}\n\n## Plan (call update_plan to mark steps done)\n${planText}`;
        toolDefs.push({
          type: 'function',
          function: {
            name: 'update_plan',
            description:
              'Mark plan steps as completed as you finish them. Pass the ids of the steps now done.',
            parameters: {
              type: 'object',
              properties: {
                completedStepIds: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'IDs of plan steps that are now complete.',
                },
              },
              required: ['completedStepIds'],
            },
          },
        });
        yield { type: 'think', content: `📋 Plan:\n${planText}` };
        await this.conversationService.saveMessage({
          conversationId,
          role: 'assistant',
          type: 'text',
          content: `📋 Plan:\n${planText}`,
        });
      }
    }

    let iterations = 0;
    const maxIterations = agent.maxIterations || 10;

    while (iterations < maxIterations) {
      iterations++;
      yield { type: 'think', content: `Iteration ${iterations}/${maxIterations}` };

      // Stream LLM response — collect tool calls and text via real AiService call
      const { text, toolCalls } = await this.streamLlmIteration(
        agent.modelKey,
        agent.baseId,
        messages,
        toolDefs,
        resolvedModelKey
      );

      // Build the assistant turn. When the model emitted tool calls, the assistant
      // message MUST carry the tool-call parts (AI SDK v6 ModelMessage requirement) —
      // otherwise the following tool-result messages are rejected on the next call.
      if (toolCalls && toolCalls.length > 0) {
        const assistantContent: Array<Record<string, unknown>> = [];
        if (text) assistantContent.push({ type: 'text', text });
        for (const tc of toolCalls) {
          assistantContent.push({
            type: 'tool-call',
            toolCallId: tc.toolCallId,
            toolName: tc.name,
            input: tc.input,
          });
        }
        messages.push({ role: 'assistant', content: assistantContent } as any);
        if (text) {
          yield { type: 'text', content: text };
          await this.conversationService.saveMessage({
            conversationId,
            role: 'assistant',
            type: 'text',
            content: text,
          });
        }
      } else if (text) {
        yield { type: 'text', content: text };
        messages.push({ role: 'assistant', content: text });
        await this.conversationService.saveMessage({
          conversationId,
          role: 'assistant',
          type: 'text',
          content: text,
        });
      }

      // If no tool calls, the model thinks it is done — Phase C: self-review before
      // terminating. If the goal isn't fully met (and reflections remain), feed the
      // critique back and keep working. Reflection FAILS OPEN, so it can't loop forever.
      if (!toolCalls || toolCalls.length === 0) {
        if (reflectionEnabled && hasTools && reflections < maxReflections) {
          yield { type: 'progress', step: 'Self-review' };
          const verdict = await this.planner.reflect({
            baseId: agent.baseId,
            modelKey: resolvedModelKey,
            goal: goalText,
            transcript: this.buildTranscript(messages),
          });
          if (!verdict.goalAchieved) {
            reflections++;
            const critique = `Self-review (${reflections}/${maxReflections}): the goal is NOT yet complete. ${verdict.critique} Continue until it is fully done.`;
            yield { type: 'think', content: `🔍 ${critique}` };
            messages.push({ role: 'user', content: critique });
            await this.conversationService.saveMessage({
              conversationId,
              role: 'user',
              type: 'text',
              content: critique,
            });
            continue;
          }
          yield { type: 'think', content: '🔍 Self-review: goal achieved.' };
        }
        break;
      }

      // Execute each tool call
      let hitlTerminate = false;
      for (const toolCall of toolCalls) {
        // Plan tracking is handled in-loop (not a real side-effect tool).
        if (toolCall.name === 'update_plan') {
          const ids = (toolCall.input as { completedStepIds?: number[] })?.completedStepIds ?? [];
          for (const step of plan) {
            if (ids.includes(step.id)) step.status = 'done';
          }
          const planText = this.planner.renderPlan(plan);
          messages[0].content = `${baseSystemPrompt}\n\n## Plan (call update_plan to mark steps done)\n${planText}`;
          yield { type: 'tool', name: 'update_plan', input: toolCall.input, output: { plan } };
          messages.push({
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId: toolCall.toolCallId,
                toolName: 'update_plan',
                output: { type: 'json', value: { ok: true } },
              },
            ],
          } as any);
          continue;
        }

        yield { type: 'tool', name: toolCall.name, input: toolCall.input };
        const output = await this.executeToolCallWithRetry(
          { name: toolCall.name, input: toolCall.input as Record<string, unknown> },
          agent,
          ctx
        );

        // HITL sentinel: request_human_approval signals termination via __hitl flag
        if (output && typeof output === 'object' && '__hitl' in (output as object)) {
          const hitlOutput = output as {
            __hitl: true;
            payload: { question: string; context?: string };
          };
          yield { type: 'hitl', payload: hitlOutput.payload };
          hitlTerminate = true;
          break;
        }

        yield {
          type: 'tool',
          name: toolCall.name,
          input: toolCall.input,
          output: output as object | undefined,
        };
        const toolSummary = JSON.stringify({ tool: toolCall.name, result: output });
        messages.push({
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.name,
              output: { type: 'json', value: output as object },
            },
          ],
        } as any);
        // Persist tool usage to conversation
        await this.conversationService.saveMessage({
          conversationId,
          role: 'assistant',
          type: 'tool',
          content: toolSummary,
          toolName: toolCall.name,
          toolInput: toolCall.input,
          toolOutput: output as object,
        });
      }

      // Terminate loop after HITL — conversation is already marked waiting_for_approval
      if (hitlTerminate) return;
    }

    // Mark conversation complete and save run to memory
    await this.conversationService.markConversationComplete(conversationId);
    const runSummary = `[${ctx.trigger}] Agent ran ${iterations} iteration(s). Trigger: ${JSON.stringify(ctx.triggerPayload || {})}`;
    await this.memoryService.saveRecent(ctx.agentId, runSummary);

    yield { type: 'done' };
  }

  /** Condensed recent transcript for the reflexion module (token-bounded). */
  private buildTranscript(messages: any[]): string {
    return messages
      .filter((m) => m.role !== 'system')
      .slice(-12)
      .map((m) => {
        if (m.role === 'tool') {
          const part = Array.isArray(m.content) ? m.content[0] : undefined;
          const r = part?.output?.value ?? part?.result ?? m.content;
          return `tool-result: ${typeof r === 'string' ? r : JSON.stringify(r)}`.slice(0, 600);
        }
        const c = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return `${m.role}: ${c}`.slice(0, 600);
      })
      .join('\n');
  }

  private buildUserMessage(ctx: AgentRunContext): string {
    if (ctx.trigger === 'delegated') {
      const task = (ctx.triggerPayload as { task?: string })?.task;
      return task ? String(task) : 'Execute the delegated task.';
    }
    if (ctx.trigger === 'cron') return 'Execute your scheduled task now.';
    if (ctx.trigger === 'manual') {
      return 'Execute your configured task now. Take real actions using your available tools — do not ask the user for clarification; act based on your instructions.';
    }
    if (ctx.trigger === 'mention')
      return `You were mentioned. Context: ${JSON.stringify(ctx.triggerPayload)}`;
    if (ctx.trigger === 'dm')
      return `You received a direct message. Content: ${JSON.stringify(ctx.triggerPayload)}`;
    if (ctx.trigger === 'workflow') {
      const task = (ctx.triggerPayload as { task?: string })?.task;
      return task
        ? String(task)
        : 'Execute the task requested by the automation that triggered you.';
    }
    return 'Execute your task.';
  }

  /**
   * Make a single LLM call using the existing AiService infrastructure.
   *
   * Pattern mirrors generateAgentStream() in ai.service.ts:
   *   1. Resolve the model instance via AiService.getModelInstance()
   *   2. Convert ToolDefinition[] into the Vercel AI SDK `tools` object shape
   *   3. Call generateText() with tools + stopWhen: stepCountIs(1) for one iteration
   *   4. Extract text + all tool calls from steps
   *
   * modelKey format: "type@model@name" (e.g. "aiGateway@claude-sonnet-4@teable")
   * If modelKey is null, fall back to the agent's base AI config lg model.
   */
  private async streamLlmIteration(
    modelKey: string | null,
    baseId: string,
    messages: any[],
    toolDefs: Array<{
      type: string;
      function: { name: string; description: string; parameters: object };
    }>,
    preResolvedModelKey?: string | null
  ): Promise<{
    text: string | null;
    toolCalls: Array<{ name: string; input: object; toolCallId: string }> | null;
  }> {
    // Use pre-resolved model key from run() preflight, or resolve now
    // Fetch aiConfig once; reuse it for both model key resolution and model instance creation
    let resolvedModelKey = preResolvedModelKey ?? modelKey;
    const aiConfig = await this.aiService.getAIConfig(baseId);
    if (!resolvedModelKey) {
      resolvedModelKey = aiConfig.chatModel?.lg ?? null;
    }
    if (!resolvedModelKey) {
      throw new Error(`No model key configured for agent (baseId: ${baseId})`);
    }

    // Convert ToolDefinition[] → Vercel AI SDK v6 tools object
    // AI SDK v6 uses `inputSchema` (not `parameters`) when constructing tools manually
    // Each tool gets a no-op execute() — AgentExecutionService handles actual dispatch
    const tools: Record<
      string,
      {
        description: string;
        inputSchema: ReturnType<typeof jsonSchema>;
        execute: () => Promise<null>;
      }
    > = {};
    for (const def of toolDefs) {
      tools[def.function.name] = {
        description: def.function.description,
        inputSchema: jsonSchema(def.function.parameters as Record<string, unknown>),
        execute: async () => null, // execution handled by executeToolCall() in the run() loop
      };
    }

    // Separate system message from conversation history
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const hasTools = Object.keys(tools).length > 0;

    // ARH-01: failover loop — try primary then each fallback on retryable errors (429/5xx)
    const modelKeys = [resolvedModelKey, ...(aiConfig.fallbackModels ?? [])];
    let lastError: unknown;
    for (let i = 0; i < modelKeys.length; i++) {
      const modelKey = modelKeys[i];
      const modelInstance = await this.aiService.getModelInstance(modelKey, aiConfig.llmProviders);
      try {
        const { text, steps } = await generateText({
          model: modelInstance,
          ...(hasTools ? { tools: tools as never, stopWhen: stepCountIs(1) as never } : {}),
          system: systemMessage?.content,
          messages: conversationMessages as never,
        });

        // Collect all tool calls from all steps (AI SDK may produce multiple steps per call)
        const toolCalls: Array<{ name: string; input: object; toolCallId: string }> = steps.flatMap(
          (step) =>
            (step.toolCalls ?? []).map((tc) => ({
              name: tc.toolName,
              // AI SDK v6 exposes the parsed arguments as `input` (v5 used `args`).
              // Fall back across both so tool dispatch always receives the arguments.
              input: ((tc as { input?: object }).input ??
                (tc as { args?: object }).args ??
                {}) as object,
              toolCallId: tc.toolCallId,
            }))
        );

        return {
          text: text || null,
          toolCalls: toolCalls.length > 0 ? toolCalls : null,
        };
      } catch (err) {
        if (!this.isRetryableLlmError(err)) {
          // Non-retryable (400, 401, 403, etc.) — propagate immediately (T-24-04-01)
          throw err;
        }
        lastError = err;
        if (i < modelKeys.length - 1) {
          const statusCode = APICallError.isInstance(err)
            ? (err as APICallError).statusCode
            : undefined;
          this.logger.warn(
            `LLM provider error on model "${modelKey}" (statusCode=${statusCode}, attempt ${i + 1}/${modelKeys.length}), trying fallback`
          );
        }
      }
    }
    // All models exhausted — rethrow last retryable error
    throw lastError;
  }

  /**
   * Public delegation for MCP server tool handlers.
   * Allows the TeableMcpServerService to reuse the same tool execution logic
   * without forking the SQL/record handling.
   */
  async executeTool(
    toolCall: { name: string; input: Record<string, unknown> },
    agent: { baseId: string; id: string },
    ctx: AgentRunContext
  ): Promise<unknown> {
    // MCP callers pass only {id, baseId}, but executeToolCall reads agent.knowledgeSources
    // for scoped search. Hydrate the full record so search_knowledge_base honours scoping.
    const full = await this.prismaService.agent.findUnique({
      where: { id: agent.id },
      select: { id: true, baseId: true, knowledgeSources: true },
    });
    return this.executeToolCall(toolCall, full ?? agent, ctx);
  }

  private async executeToolCallWithRetry(
    toolCall: { name: string; input: Record<string, unknown> },
    agent: { id?: string; baseId: string; knowledgeSources?: unknown; createdBy?: string | null },
    ctx: AgentRunContext,
    maxRetries = 2
  ): Promise<unknown> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeToolCall(toolCall, agent, ctx);
      } catch (err) {
        lastErr = err;
        const isHttp4xx = err instanceof Error && /\b4\d{2}\b/.test(err.message);
        if (isHttp4xx || !this.isRetryableLlmError(err) || attempt === maxRetries) break;
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
    throw lastErr;
  }

  private async executeToolCall(
    toolCall: { name: string; input: Record<string, unknown> },
    agent: { id?: string; baseId: string; knowledgeSources?: unknown; createdBy?: string | null },
    ctx: AgentRunContext
  ): Promise<unknown> {
    this.logger.debug(
      `Executing tool: ${toolCall.name} with input: ${JSON.stringify(toolCall.input)}`
    );
    try {
      switch (toolCall.name) {
        case 'search_records': {
          const { tableId, query } = toolCall.input as { tableId: string; query: string };
          this.logger.log(`Searching table ${tableId} for: "${query}"`);

          // Fetch table metadata to get the actual database table name
          const table = await this.prismaService.tableMeta.findUnique({
            where: { id: tableId },
            select: { dbTableName: true },
          });

          if (!table) {
            return { results: [], error: `Table ${tableId} not found` };
          }

          // Validate table name against allowlist to prevent SQL injection
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table.dbTableName)) {
            return { results: [], error: 'Invalid table name' };
          }

          // Use raw SQL to search across fields (Teable stores records dynamically)
          const results = (await this.dataPrismaService.$queryRawUnsafe(
            `SELECT id FROM "${table.dbTableName}" WHERE CAST(data AS TEXT) ILIKE $1 LIMIT 10`,
            `%${query}%`
          )) as any[];

          return {
            results: results.map((r) => ({ id: r.id, matched: true })),
            count: results.length,
            query,
          };
        }

        case 'get_records': {
          const { tableId, take = 20 } = toolCall.input as { tableId: string; take?: number };
          this.logger.log(`Fetching up to ${take} records from table ${tableId}`);

          // Get table info
          const table = await this.prismaService.tableMeta.findUnique({
            where: { id: tableId },
            select: { dbTableName: true },
          });

          if (!table) {
            return { records: [], error: `Table ${tableId} not found` };
          }

          // Validate table name against allowlist to prevent SQL injection
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table.dbTableName)) {
            return { records: [], error: 'Invalid table name' };
          }

          // Fetch records from the table
          const records = (await this.dataPrismaService.$queryRawUnsafe(
            `SELECT id FROM "${table.dbTableName}" LIMIT $1`,
            Math.min(take as number, 100)
          )) as any[];

          return {
            records: records.map((r) => ({ id: r.id })),
            count: records.length,
          };
        }

        case 'get_record': {
          const { tableId, recordId } = toolCall.input as { tableId: string; recordId: string };
          this.logger.log(`Fetching record ${recordId} from table ${tableId}`);

          // Get table info
          const table = await this.prismaService.tableMeta.findUnique({
            where: { id: tableId },
            select: { dbTableName: true },
          });

          if (!table) {
            return { record: null, error: `Table ${tableId} not found` };
          }

          // Validate table name against allowlist to prevent SQL injection
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table.dbTableName)) {
            return { record: null, error: 'Invalid table name' };
          }

          // Fetch the specific record
          const record = await this.dataPrismaService.$queryRawUnsafe(
            `SELECT id, data FROM "${table.dbTableName}" WHERE id = $1 LIMIT 1`,
            recordId
          );

          if (!record || (record as any[]).length === 0) {
            return { record: null, found: false };
          }

          const rec = (record as any[])[0];
          return {
            record: {
              id: rec.id,
              data: rec.data,
            },
            found: true,
          };
        }

        case 'create_record': {
          const { tableId, fields } = toolCall.input as {
            tableId: string;
            fields: Record<string, unknown>;
          };
          this.logger.log(`Creating record in table ${tableId} via RecordOpenApiService`);

          const createCheck = await this.guardrailService.validateWrite(tableId, fields);
          if (!createCheck.valid) {
            return { success: false, validationErrors: createCheck.errors };
          }

          const result = await this.recordOpenApiService.multipleCreateRecords(tableId, {
            records: [{ fields }],
            fieldKeyType: FieldKeyType.Id,
          });

          const created = result.records[0];
          return {
            success: true,
            recordId: created?.id,
            fields: created?.fields,
          };
        }

        case 'update_record': {
          const { tableId, recordId, fields } = toolCall.input as {
            tableId: string;
            recordId: string;
            fields: Record<string, unknown>;
          };
          this.logger.log(`Updating record ${recordId} in table ${tableId}`);

          const updateCheck = await this.guardrailService.validateWrite(tableId, fields);
          if (!updateCheck.valid) {
            return { success: false, validationErrors: updateCheck.errors };
          }

          try {
            const updated = await this.recordOpenApiService.updateRecord(tableId, recordId, {
              record: { fields },
              fieldKeyType: FieldKeyType.Id,
            });
            return {
              success: true,
              recordId: updated.id,
              fields: updated.fields,
            };
          } catch (e) {
            this.logger.error(`update_record failed: ${(e as Error).message}`);
            return {
              error: `Record update failed: ${(e as Error).message}`,
              hint: 'Verify the recordId and field values are correct',
            };
          }
        }

        case 'delete_record': {
          const { tableId, recordId } = toolCall.input as { tableId: string; recordId: string };
          this.logger.log(`Deleting record ${recordId} from table ${tableId}`);
          try {
            await this.recordOpenApiService.deleteRecord(tableId, recordId);
            return { success: true, deletedRecordId: recordId };
          } catch (e) {
            this.logger.error(`delete_record failed: ${(e as Error).message}`);
            return {
              error: `Record deletion failed: ${(e as Error).message}`,
              hint: 'Verify the recordId exists and you have permission to delete it',
            };
          }
        }

        case 'create_comment': {
          const { tableId, recordId, content } = toolCall.input as {
            tableId: string;
            recordId: string;
            content: string;
          };
          this.logger.log(`Creating comment on record ${recordId}: "${content}"`);

          // Create a comment record (stored in metadata database)
          try {
            const comment = await this.prismaService.comment.create({
              data: {
                tableId,
                recordId,
                content,
                createdBy: ctx.userId || 'agent',
              },
            });

            return {
              success: true,
              commentId: comment.id,
              createdAt: comment.createdTime,
            };
          } catch (e) {
            // If comment creation fails, log and return partial success
            this.logger.warn(`Could not create comment: ${(e as Error).message}`);
            return {
              success: false,
              error: (e as Error).message,
              message: 'Comment creation failed',
            };
          }
        }

        case 'get_record_activity': {
          const { tableId, recordId } = toolCall.input as { tableId: string; recordId: string };
          this.logger.log(`Fetching activity for record ${recordId}`);

          // Try to fetch record history/audit log
          try {
            const activity = await this.prismaService.recordHistory.findMany({
              where: { recordId },
              orderBy: { createdTime: 'desc' },
              take: 20,
              select: {
                id: true,
                createdBy: true,
                createdTime: true,
              },
            });

            return {
              activity: activity.map((a) => ({
                id: a.id,
                createdBy: a.createdBy,
                createdAt: a.createdTime,
              })),
              count: activity.length,
            };
          } catch (e) {
            // If history model doesn't exist, return empty
            this.logger.warn(`Could not fetch activity: ${(e as Error).message}`);
            return {
              activity: [],
              message: 'Activity retrieval pending schema migration',
            };
          }
        }

        // Schema tools — query and author tables, fields, views.
        // Scoped to the agent's own baseId; routed through the OpenApi services.
        case 'list_tables':
        case 'get_table_schema':
        case 'create_table':
        case 'create_field':
        case 'create_view':
        case 'create_app': {
          return await executeSchemaTool(toolCall.name, toolCall.input, agent.baseId, {
            tableService: this.tableOpenApiService,
            fieldService: this.fieldOpenApiService,
            viewService: this.viewOpenApiService,
            appBuilderService: this.appBuilderService,
          });
        }

        // Gmail tools - require OAuth connection
        case 'read_unread_emails':
        case 'search_emails':
        case 'send_email':
        case 'get_email_details': {
          try {
            return await executeGmailTool(
              toolCall.name,
              toolCall.input,
              agent.id ?? '',
              this.gmailOAuthService,
              this.httpService,
              ctx.userId
            );
          } catch (e) {
            this.logger.error(`Gmail tool error: ${(e as Error).message}`);
            return {
              error: `Gmail operation failed: ${(e as Error).message}`,
              hint: 'Make sure Gmail account is connected via OAuth',
            };
          }
        }

        // Slack tools - require OAuth connection
        case 'list_slack_channels':
        case 'read_slack_messages':
        case 'send_slack_message':
        case 'search_slack_messages': {
          try {
            return await executeSlackTool(
              toolCall.name,
              toolCall.input,
              ctx.agentId,
              this.slackClient,
              ctx.userId
            );
          } catch (e) {
            this.logger.error(`Slack tool error: ${(e as Error).message}`);
            return {
              error: `Slack operation failed: ${(e as Error).message}`,
              hint: 'Make sure Slack workspace is connected via OAuth',
            };
          }
        }

        // GitHub tools - require OAuth connection
        case 'create_issue':
        case 'list_pull_requests':
        case 'add_comment':
        case 'get_issue_details': {
          try {
            return await executeGitHubTool(
              toolCall.name,
              toolCall.input,
              ctx.agentId,
              this.gitHubClient,
              ctx.userId
            );
          } catch (e) {
            this.logger.error(`GitHub tool error: ${(e as Error).message}`);
            return {
              error: `GitHub operation failed: ${(e as Error).message}`,
              hint: 'Make sure GitHub account is connected via OAuth',
            };
          }
        }

        case 'search_knowledge_base': {
          const { query, limit, traverseLinks, maxHops } = toolCall.input as {
            query: string;
            limit?: number;
            traverseLinks?: boolean;
            maxHops?: number;
          };
          this.logger.log(`search_knowledge_base: "${query}"`);

          // Resolve spaceId from the agent's baseId (base → space FK)
          const base = await this.prismaService.base.findUnique({
            where: { id: agent.baseId },
            select: { spaceId: true },
          });
          if (!base) {
            return { results: [], error: `Base ${agent.baseId} not found` };
          }

          // Build scope from the agent's knowledgeSources (null/absent = whole-space search)
          const ks = agent.knowledgeSources as { docIds?: string[]; folderIds?: string[] } | null;
          const scope: DocSearchScope | undefined =
            ks && ((ks.docIds?.length ?? 0) > 0 || (ks.folderIds?.length ?? 0) > 0)
              ? { docIds: ks.docIds, folderIds: ks.folderIds }
              : undefined;

          // Forward optional traversal options (D-21-03 MCP exposure of KG-03).
          const options =
            traverseLinks !== undefined || maxHops !== undefined
              ? { traverseLinks, maxHops }
              : undefined;

          const results = await this.docSearchService.hybridSearch(
            base.spaceId,
            query,
            limit ?? 5,
            scope,
            options
          );

          return {
            results: results.map((r) => ({
              docId: r.docId,
              docTitle: r.docTitle,
              excerpt: r.chunkContent,
              score: r.score,
            })),
            count: results.length,
            scoped: scope !== undefined,
          };
        }

        case 'create_knowledge_doc': {
          // T-21-16 mitigation: spaceId resolved from agent.baseId — NEVER from toolCall.input.
          const { title, rawContent, folderId } = toolCall.input as {
            title: string;
            rawContent: string;
            folderId?: string;
          };
          const spaceId = await this.resolveAgentSpaceId(agent);
          const result = await this.knowledgeDocService.createDoc({
            spaceId,
            title,
            rawContent,
            folderId,
            createdBy: this.resolveAgentCallerUserId(agent, ctx),
          });
          return {
            ...result,
            note: 'Indexing in background; doc may not be searchable for a few seconds.',
          };
        }

        case 'update_knowledge_doc': {
          const { docId, rawContent } = toolCall.input as {
            docId: string;
            rawContent: string;
          };
          const spaceId = await this.resolveAgentSpaceId(agent);
          return this.knowledgeDocService.updateDoc({
            docId,
            rawContent,
            callerSpaceId: spaceId,
            callerId: this.resolveAgentCallerUserId(agent, ctx),
          });
        }

        case 'link_docs': {
          const { fromDocId, toDocId, label } = toolCall.input as {
            fromDocId: string;
            toDocId: string;
            label?: string;
          };
          const spaceId = await this.resolveAgentSpaceId(agent);
          return this.docLinkService.linkDocs({
            fromDocId,
            toDocId,
            label,
            callerSpaceId: spaceId,
            callerId: this.resolveAgentCallerUserId(agent, ctx),
          });
        }

        case 'get_doc_links': {
          const { docId, direction = 'both' } = toolCall.input as {
            docId: string;
            direction?: 'outgoing' | 'incoming' | 'both';
          };
          const spaceId = await this.resolveAgentSpaceId(agent);
          const outgoing =
            direction !== 'incoming'
              ? await this.docLinkService.getOutgoing({ docId, callerSpaceId: spaceId })
              : [];
          const incoming =
            direction !== 'outgoing'
              ? await this.docLinkService.getIncoming({ docId, callerSpaceId: spaceId })
              : [];
          return { outgoing, incoming };
        }

        // Phase 2 — agent memory graph reads. spaceId ALWAYS from agent.baseId (T-21-16).
        case 'search_memory': {
          const { query, limit } = toolCall.input as { query: string; limit?: number };
          const spaceId = await this.resolveAgentSpaceId(agent);
          const entities = await this.docSearchService.entitySearch(spaceId, query, limit ?? 10);
          return { entities, count: entities.length };
        }

        case 'get_memory': {
          const { docId } = toolCall.input as { docId: string };
          const spaceId = await this.resolveAgentSpaceId(agent);
          const entities = await this.prismaService.memoryEntity.findMany({
            where: { sourceDocId: docId, spaceId },
            select: { id: true, name: true, type: true, summary: true },
            orderBy: { name: 'asc' },
            take: 500,
          });
          const ids = entities.map((e) => e.id);
          const relations =
            ids.length > 0
              ? await this.prismaService.memoryRelation.findMany({
                  where: {
                    spaceId,
                    OR: [{ fromEntityId: { in: ids } }, { toEntityId: { in: ids } }],
                  },
                  select: { fromEntityId: true, toEntityId: true, label: true },
                  take: 2000,
                })
              : [];
          return { entities, relations };
        }

        case 'save_memory': {
          const { content, metadata } = toolCall.input as {
            content: string;
            metadata?: object;
          };
          if (!content?.trim()) return { error: 'save_memory requires non-empty content' };
          const agentId = agent.id ?? ctx.agentId;
          await this.memoryService.saveRecent(agentId, content, metadata);
          // ponytail: fire-and-forget entity extraction — self-organising knowledge graph
          void this.extractAndStoreEntities(agent.baseId, `mem:${agentId}:${Date.now()}`, content);
          return { success: true, saved: content.slice(0, 80) };
        }

        case 'get_context_graph': {
          const nodes = await this.prismaService.baseNode.findMany({
            where: { baseId: agent.baseId },
            select: { id: true, parentId: true, resourceType: true, resourceId: true },
            take: 1000, // ponytail: bounded
          });
          const tableIds = nodes.filter((n) => n.resourceType === 'table').map((n) => n.resourceId);
          const fields = tableIds.length
            ? await this.prismaService.field.findMany({
                where: { tableId: { in: tableIds }, deletedTime: null },
                select: { id: true, tableId: true, name: true, type: true },
                take: tableIds.length * 500, // ponytail: bounded
              })
            : [];
          const fieldIds = fields.map((f) => f.id);
          const edges = fieldIds.length
            ? await this.prismaService.reference.findMany({
                where: { OR: [{ fromFieldId: { in: fieldIds } }, { toFieldId: { in: fieldIds } }] },
                select: { fromFieldId: true, toFieldId: true },
                take: fieldIds.length * 10, // ponytail: bounded
              })
            : [];
          return { nodes, fields, edges };
        }

        case 'set_preference': {
          const { key, value } = toolCall.input as { key: string; value: string };
          if (!key?.trim()) return { error: 'set_preference requires a non-empty key' };
          const agentId = agent.id ?? ctx.agentId;
          await this.memoryService.setPreference(agentId, key, String(value ?? ''));
          return { success: true, key, value };
        }

        case 'web_search': {
          const query = toolCall.input?.query as string;
          const limit = Math.min((toolCall.input?.limit as number) || 5, 10);
          if (!query?.trim()) return { error: 'web_search requires a non-empty query' };

          // Tavily API (preferred) — set TAVILY_API_KEY env var to enable
          const tavilyKey = process.env.TAVILY_API_KEY;
          if (tavilyKey) {
            try {
              const resp = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  api_key: tavilyKey,
                  query,
                  max_results: limit,
                  search_depth: 'basic',
                }),
                signal: AbortSignal.timeout(10000),
              });
              if (!resp.ok) throw new Error(`Tavily HTTP ${resp.status}`);
              const data = (await resp.json()) as {
                results?: { title: string; url: string; content: string }[];
              };
              return { results: (data.results || []).slice(0, limit), query };
            } catch (e) {
              this.logger.warn(`web_search Tavily failed: ${(e as Error).message}`);
            }
          }

          // DuckDuckGo Instant Answer API — no key required
          try {
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            const resp = await fetch(ddgUrl, {
              headers: { 'User-Agent': 'Teable/1.0' },
              signal: AbortSignal.timeout(8000),
            });
            if (!resp.ok) throw new Error(`DDG HTTP ${resp.status}`);
            const data = (await resp.json()) as {
              Abstract?: string;
              Heading?: string;
              AbstractURL?: string;
              RelatedTopics?: Array<{
                Text?: string;
                FirstURL?: string;
                Topics?: Array<{ Text?: string; FirstURL?: string }>;
              }>;
            };
            const results: { title: string; url: string; snippet: string }[] = [];
            if (data.Abstract) {
              results.push({
                title: data.Heading || query,
                url: data.AbstractURL || '',
                snippet: data.Abstract,
              });
            }
            for (const t of data.RelatedTopics || []) {
              if (results.length >= limit) break;
              if (t.Text) {
                results.push({
                  title: t.Text.split(' - ')[0] || t.Text,
                  url: t.FirstURL || '',
                  snippet: t.Text,
                });
              } else if (t.Topics) {
                for (const sub of t.Topics || []) {
                  if (results.length >= limit) break;
                  if (sub.Text)
                    results.push({
                      title: sub.Text.split(' - ')[0],
                      url: sub.FirstURL || '',
                      snippet: sub.Text,
                    });
                }
              }
            }
            if (results.length > 0) return { results, query };
          } catch (e) {
            this.logger.warn(`web_search DDG failed: ${(e as Error).message}`);
          }

          return {
            results: [],
            query,
            note: 'No results found. Set TAVILY_API_KEY env var for full web search, or try search_knowledge_base for internal data.',
          };
        }

        // Phase 22-03 / D-22-03 — Workflow / RPA dispatch.
        // baseId is ALWAYS resolved from agent.baseId — never from toolCall.input (T-21-16).
        case 'list_workflows': {
          // Defense-in-depth: any baseId field in toolCall.input is silently ignored.
          const workflows = await this.workflowService.findMany(agent.baseId);
          return { workflows, count: workflows.length };
        }

        case 'get_workflow': {
          const { workflowId } = toolCall.input as { workflowId: string };
          const workflow = await this.workflowService.findOne(agent.baseId, workflowId);
          if (!workflow) {
            // Cross-base or missing — typed error envelope, never silent success.
            return {
              error: `Workflow ${workflowId} not found in agent's base`,
              toolName: 'get_workflow',
            };
          }
          return { workflow };
        }

        case 'run_workflow': {
          const { workflowId } = toolCall.input as {
            workflowId: string;
            input?: Record<string, unknown>;
          };
          // Pre-check existence in the agent's base to convert "Workflow not found"
          // throws from the service layer into a typed cross-base error envelope.
          const wf = await this.workflowService.findOne(agent.baseId, workflowId);
          if (!wf) {
            return {
              error: `Workflow ${workflowId} not found in agent's base`,
              toolName: 'run_workflow',
            };
          }
          // NOTE: testRunWorkflow currently does not consume a per-run input arg
          // (executor uses mock trigger data). The `input` field is accepted on the
          // wire for forward-compat; tracked for plan 22-05 UAT follow-up.
          const result = await this.workflowService.testRunWorkflow(agent.baseId, workflowId);
          return result;
        }

        case 'request_human_approval': {
          const { question, context, pendingToolCall } = toolCall.input as {
            question: string;
            context?: string;
            pendingToolCall?: object;
          };
          if (!ctx.conversationId) {
            // One-shot run: HITL requires a persisted conversation
            return {
              error: 'request_human_approval requires a persisted conversation',
              hint: 'Start the agent with a conversationId.',
            };
          }
          // Persist waiting_for_approval state with full payload
          await this.conversationService.markConversationWaitingForApproval(ctx.conversationId, {
            question,
            context,
            pendingToolCall,
          });
          // Return sentinel to signal run() loop to yield hitl event and terminate
          return { __hitl: true, payload: { question, context } };
        }

        // Multi-agent orchestration — list/delegate to other agents in the SAME base.
        case 'list_agents': {
          const agents = await this.agentService.findAll(agent.baseId);
          const others = (
            agents as Array<{ id: string; name: string; description?: string | null }>
          )
            .filter((a) => a.id !== agent.id)
            .map((a) => ({ id: a.id, name: a.name, description: a.description ?? null }));
          return { agents: others, count: others.length };
        }

        case 'delegate_to_agent': {
          const { agentId: targetId, task } = toolCall.input as { agentId: string; task: string };
          const MAX_DELEGATION_DEPTH = 2;
          const depth = ctx.depth ?? 0;
          if (depth >= MAX_DELEGATION_DEPTH) {
            return {
              error: `Delegation depth limit (${MAX_DELEGATION_DEPTH}) reached; cannot delegate further`,
              toolName: 'delegate_to_agent',
            };
          }
          if (!targetId || targetId === agent.id) {
            return { error: 'An agent cannot delegate to itself', toolName: 'delegate_to_agent' };
          }
          // Target MUST be in the same base (never trust a cross-base agentId).
          const target = await this.agentService.findOne(targetId).catch(() => null);
          if (!target || target.baseId !== agent.baseId) {
            return {
              error: `Agent ${targetId} not found in this base`,
              toolName: 'delegate_to_agent',
            };
          }
          // Run the sub-agent to completion in its own conversation, collecting its answer.
          let result = '';
          let toolsUsed = 0;
          for await (const ev of this.run({
            agentId: targetId,
            trigger: 'delegated',
            triggerPayload: { task },
            userId: ctx.userId,
            depth: depth + 1,
          })) {
            if (ev.type === 'text' && ev.content) result += ev.content;
            if (ev.type === 'tool' && ev.output) toolsUsed++;
            if (ev.type === 'error' && ev.content) {
              return { error: ev.content, agentId: targetId, toolName: 'delegate_to_agent' };
            }
          }
          return {
            agentId: targetId,
            agentName: target.name,
            result: result.trim() || '(sub-agent produced no text output)',
            toolsUsed,
          };
        }

        case 'create_agent': {
          const { name, description, instructions, modelKey, isPublic } = toolCall.input as {
            name: string;
            description?: string;
            instructions?: string;
            modelKey?: string;
            isPublic?: boolean;
          };
          if (!name?.trim()) {
            return { error: 'create_agent requires a non-empty name', toolName: 'create_agent' };
          }
          const newAgent = await this.agentService.create(
            { name, description, instructions, modelKey, isPublic, baseId: agent.baseId },
            ctx.userId || 'agent'
          );
          return { agentId: newAgent.id, name: newAgent.name, baseId: newAgent.baseId };
        }

        default: {
          // Dispatch MCP-namespaced tool calls (mcp__{serverId}__{toolName}) to the aggregator.
          if (parseMcpToolName(toolCall.name)) {
            return this.mcpAggregator.executeMcpTool(ctx.agentId, toolCall.name, toolCall.input);
          }
          return { error: `Unknown tool: ${toolCall.name}` };
        }
      }
    } catch (error) {
      this.logger.error(`Tool execution failed for ${toolCall.name}: ${(error as Error).message}`);
      return {
        error: `Tool execution failed: ${(error as Error).message}`,
        toolName: toolCall.name,
      };
    }
  }
}
