/**
 * workflow-tools.integration.spec.ts — Phase 22-04.
 *
 * Mirrors kg-tools.integration.spec.ts. Exercises the full dispatcher path
 * for the 3 new workflow tools (list_workflows, get_workflow, run_workflow)
 * with deterministic fakes for WorkflowService + WorkflowExecutorService.
 *
 * CRITICAL invariants (T-21-16, D-22-03):
 *   - baseId is resolved from agent.baseId — toolCall.input.baseId is ignored.
 *   - Cross-base workflowId attempts return a typed {error, toolName} envelope,
 *     never silent success and never an executor side-effect.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentExecutionService } from '../agent-execution.service';
import { AgentToolRegistryService } from '../agent-tool-registry.service';
import type { AgentService } from '../agent.service';
import type { AgentMemoryService } from '../agent-memory.service';
import type { AgentConversationService } from '../agent-conversation.service';
import type { PromptService } from '../../ai/prompt.service';
import type { PrismaService } from '@teable/db-main-prisma';
import type { DataPrismaService } from '@teable/db-data-prisma';
import type { GmailOAuthService } from '../oauth/gmail-oauth.service';
import type { SlackOAuthService } from '../oauth/slack-oauth.service';
import type { GitHubOAuthService } from '../oauth/github-oauth.service';
import type { HttpService } from '@nestjs/axios';
import type { SlackClient } from '../oauth/slack-client';
import type { GitHubClient } from '../oauth/github-client';
import type { McpClientAggregatorService } from './mcp-client-aggregator.service';
import type { DocSearchService } from '../../doc-search/search.service';
import type { KnowledgeDocService } from '../../doc-search/knowledge-doc.service';
import type { DocLinkService } from '../../doc-search/doc-link.service';
import type { WorkflowService } from '../../workflow/workflow.service';
import type { WorkflowExecutorService } from '../../workflow/workflow-executor.service';

// Fixture: agent lives in base-A. Workflows wf-1 + wf-2 are in base-A; wf-X is in base-B.
const AGENT = { id: 'agt1', baseId: 'base-A' };
const CTX = { agentId: 'agt1', trigger: 'mcp' as const };

const WORKFLOWS_BASE_A = [
  { id: 'wf-1', name: 'Daily report', isActive: true, baseId: 'base-A' },
  { id: 'wf-2', name: 'Welcome email', isActive: false, baseId: 'base-A' },
];

const CANNED_RUN_RESULT = {
  status: 'ok',
  trigger: { type: 'manual', config: {}, mockData: { hello: 'world' } },
  steps: [
    { type: 'log', status: 'ok', note: 'logged', output: { line: 'ran' } },
    { type: 'http', status: 'ok', note: 'dry-run skipped', output: null },
  ],
};

function buildHarness() {
  const fakeWorkflowService = {
    // findMany returns base-A workflows; for any other base returns [] (cross-base isolation)
    findMany: vi.fn(async (baseId: string) => (baseId === 'base-A' ? WORKFLOWS_BASE_A : [])),
    // findOne returns the workflow only if the baseId matches its base
    findOne: vi.fn(async (baseId: string, workflowId: string) => {
      if (baseId === 'base-A' && workflowId === 'wf-1') return WORKFLOWS_BASE_A[0];
      if (baseId === 'base-A' && workflowId === 'wf-2') return WORKFLOWS_BASE_A[1];
      // wf-X belongs to base-B — cross-base lookup must return null
      return null;
    }),
    testRunWorkflow: vi.fn(async (_baseId: string, _workflowId: string) => CANNED_RUN_RESULT),
  } as unknown as WorkflowService;

  const fakeWorkflowExecutorService = {
    executeSteps: vi.fn().mockResolvedValue(CANNED_RUN_RESULT.steps),
  } as unknown as WorkflowExecutorService;

  // Stub remaining deps with the minimal surface AgentExecutionService needs to construct.
  const agentService = {
    findOne: vi.fn().mockResolvedValue(AGENT),
  } as unknown as AgentService;
  const toolRegistry = new AgentToolRegistryService(
    {} as unknown as PrismaService,
    { getAggregatedTools: vi.fn().mockResolvedValue({ definitions: [] }) } as any
  );
  const memoryService = {
    getRecent: vi.fn().mockResolvedValue([]),
    getPreferences: vi.fn().mockResolvedValue({}),
    saveRecent: vi.fn().mockResolvedValue(undefined),
  } as unknown as AgentMemoryService;
  const conversationService = {} as unknown as AgentConversationService;
  const aiService = { getAIConfig: vi.fn(), getModelInstance: vi.fn() };
  const promptService = { get: vi.fn() } as unknown as PromptService;
  const prismaService = {
    base: { findUnique: vi.fn() },
    agent: { findUnique: vi.fn().mockResolvedValue({ ...AGENT, knowledgeSources: null }) },
  } as unknown as PrismaService;
  const dataPrismaService = {} as unknown as DataPrismaService;
  const gmailOAuthService = {} as unknown as GmailOAuthService;
  const slackOAuthService = {} as unknown as SlackOAuthService;
  const slackClient = {} as unknown as SlackClient;
  const gitHubOAuthService = {} as unknown as GitHubOAuthService;
  const gitHubClient = {} as unknown as GitHubClient;
  const httpService = {} as unknown as HttpService;
  const mcpAggregator = { executeMcpTool: vi.fn() } as unknown as McpClientAggregatorService;
  const docSearchService = { hybridSearch: vi.fn() } as unknown as DocSearchService;
  const knowledgeDocService = {} as unknown as KnowledgeDocService;
  const docLinkService = {} as unknown as DocLinkService;

  const service = new AgentExecutionService(
    agentService,
    toolRegistry,
    memoryService,
    {} as never, // planner (unused — these tests call executeToolCall directly)
    conversationService,
    aiService as any,
    promptService,
    prismaService,
    dataPrismaService,
    {} as any,
    gmailOAuthService,
    slackOAuthService,
    slackClient,
    gitHubOAuthService,
    gitHubClient,
    httpService,
    mcpAggregator,
    docSearchService,
    knowledgeDocService,
    docLinkService,
    fakeWorkflowService,
    fakeWorkflowExecutorService,
    {} as never, // tableOpenApiService
    {} as never, // fieldOpenApiService
    {} as never, // viewOpenApiService
    {} as never, // appBuilderService
    {} as never // guardrailService
  );

  return { service, fakeWorkflowService, fakeWorkflowExecutorService, toolRegistry };
}

describe('workflow-tools end-to-end (Phase 22-04)', () => {
  let h: ReturnType<typeof buildHarness>;
  beforeEach(() => {
    h = buildHarness();
  });

  describe('tool registration (tools/list)', () => {
    it('exposes all 3 workflow tools alongside the prior built-ins', () => {
      const tools = h.toolRegistry.getBuiltInTools();
      const names = tools.map((t) => t.function.name);
      expect(names).toContain('list_workflows');
      expect(names).toContain('get_workflow');
      expect(names).toContain('run_workflow');
      // Built-in count is intentionally not pinned — it grows as tools are added.
      expect(tools.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('tools/call list_workflows', () => {
    it('returns canned workflows scoped to agent.baseId', async () => {
      const result: any = await (h.service as any).executeToolCall(
        { name: 'list_workflows', input: {} },
        AGENT,
        CTX
      );
      expect(h.fakeWorkflowService.findMany).toHaveBeenCalledWith('base-A');
      expect(result.workflows).toEqual(WORKFLOWS_BASE_A);
      expect(result.count).toBe(2);
    });

    it('ignores baseId field in arguments (defense-in-depth — T-21-16)', async () => {
      const result: any = await (h.service as any).executeToolCall(
        { name: 'list_workflows', input: { baseId: 'base-B' } },
        AGENT,
        CTX
      );
      // Must call with agent.baseId, NEVER with the injected base-B.
      expect(h.fakeWorkflowService.findMany).toHaveBeenCalledWith('base-A');
      expect(h.fakeWorkflowService.findMany).not.toHaveBeenCalledWith('base-B');
      // Returned data is still scoped to base-A workflows.
      expect(result.workflows).toEqual(WORKFLOWS_BASE_A);
    });
  });

  describe('tools/call get_workflow', () => {
    it('returns full record for valid workflowId in agent base', async () => {
      const result: any = await (h.service as any).executeToolCall(
        { name: 'get_workflow', input: { workflowId: 'wf-1' } },
        AGENT,
        CTX
      );
      expect(h.fakeWorkflowService.findOne).toHaveBeenCalledWith('base-A', 'wf-1');
      expect(result.workflow).toEqual(WORKFLOWS_BASE_A[0]);
      expect(result.error).toBeUndefined();
    });

    it('returns typed error envelope for cross-base workflowId', async () => {
      const result: any = await (h.service as any).executeToolCall(
        { name: 'get_workflow', input: { workflowId: 'wf-X' } },
        AGENT,
        CTX
      );
      expect(h.fakeWorkflowService.findOne).toHaveBeenCalledWith('base-A', 'wf-X');
      expect(result.workflow).toBeUndefined();
      expect(result.error).toMatch(/not found/);
      expect(result.toolName).toBe('get_workflow');
    });
  });

  describe('tools/call run_workflow', () => {
    it('returns {status, trigger, steps} envelope for valid workflowId', async () => {
      const result: any = await (h.service as any).executeToolCall(
        { name: 'run_workflow', input: { workflowId: 'wf-1' } },
        AGENT,
        CTX
      );
      expect(h.fakeWorkflowService.findOne).toHaveBeenCalledWith('base-A', 'wf-1');
      expect(h.fakeWorkflowService.testRunWorkflow).toHaveBeenCalledWith('base-A', 'wf-1');
      expect(result).toEqual(CANNED_RUN_RESULT);
      expect(result.steps).toHaveLength(2);
    });

    it('rejects cross-base workflowId with typed error (executor never called)', async () => {
      const result: any = await (h.service as any).executeToolCall(
        { name: 'run_workflow', input: { workflowId: 'wf-X' } },
        AGENT,
        CTX
      );
      expect(h.fakeWorkflowService.findOne).toHaveBeenCalledWith('base-A', 'wf-X');
      expect(h.fakeWorkflowService.testRunWorkflow).not.toHaveBeenCalled();
      expect(result.error).toMatch(/not found/);
      expect(result.toolName).toBe('run_workflow');
    });

    it('accepts optional `input` arg without crashing (pass-through, currently unused)', async () => {
      const result: any = await (h.service as any).executeToolCall(
        { name: 'run_workflow', input: { workflowId: 'wf-1', input: { custom: 'payload' } } },
        AGENT,
        CTX
      );
      expect(h.fakeWorkflowService.testRunWorkflow).toHaveBeenCalledWith('base-A', 'wf-1');
      expect(result).toEqual(CANNED_RUN_RESULT);
    });
  });
});
