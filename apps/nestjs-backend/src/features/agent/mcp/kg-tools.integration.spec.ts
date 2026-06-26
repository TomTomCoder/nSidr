/**
 * kg-tools.integration.spec.ts — Phase 21-05 Task 2.
 *
 * Verifies the 4 new KG tool dispatch cases in AgentExecutionService.executeToolCall:
 *   - create_knowledge_doc
 *   - update_knowledge_doc
 *   - link_docs
 *   - get_doc_links
 * and the new traverseLinks/maxHops forwarding in `search_knowledge_base`.
 *
 * The CRITICAL invariant under test (T-21-16): the spaceId passed to KG services
 * is ALWAYS resolved from `agent.baseId → base.spaceId` — never from the agent-supplied
 * tool args. The tests inject a malicious `spaceId: 'OTHER'` (and `createdBy: 'attacker'`)
 * into toolCall.input and assert the dispatcher ignores those fields.
 *
 * Mock-shape drift hedge (Phase 17.1 bug-3): mocks are bound to the real service types
 * via `as unknown as <ServiceType>` — no `as any` on the service surface itself.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentExecutionService } from '../agent-execution.service';
import type { AgentService } from '../agent.service';
import type { AgentToolRegistryService } from '../agent-tool-registry.service';
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

interface BuildOpts {
  resolvedSpaceId?: string;
  baseFound?: boolean;
}

function buildHarness(opts: BuildOpts = {}) {
  const resolvedSpaceId = opts.resolvedSpaceId ?? 'space-canonical';
  const baseFound = opts.baseFound !== false;

  const agentService = {
    findOne: vi.fn().mockResolvedValue({ id: 'agt1', baseId: 'base1' }),
  } as unknown as AgentService;

  const toolRegistry = {
    getToolsForAgent: vi.fn().mockResolvedValue([]),
  } as unknown as AgentToolRegistryService;

  const memoryService = {
    getRecent: vi.fn().mockResolvedValue([]),
    getPreferences: vi.fn().mockResolvedValue({}),
    saveRecent: vi.fn().mockResolvedValue(undefined),
  } as unknown as AgentMemoryService;

  const conversationService = {
    createConversation: vi.fn(),
    findConversation: vi.fn(),
    getConversationHistory: vi.fn(),
    saveMessage: vi.fn(),
    markConversationComplete: vi.fn(),
    markConversationFailed: vi.fn(),
  } as unknown as AgentConversationService;

  const aiService = {
    getAIConfig: vi.fn(),
    getModelInstance: vi.fn(),
  };

  const promptService = { get: vi.fn() } as unknown as PromptService;

  const prismaService = {
    base: {
      findUnique: vi.fn().mockResolvedValue(baseFound ? { spaceId: resolvedSpaceId } : null),
    },
    agent: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 'agt1', baseId: 'base1', knowledgeSources: null }),
    },
  } as unknown as PrismaService;

  const dataPrismaService = {} as unknown as DataPrismaService;
  const gmailOAuthService = {} as unknown as GmailOAuthService;
  const slackOAuthService = {} as unknown as SlackOAuthService;
  const slackClient = {} as unknown as SlackClient;
  const gitHubOAuthService = {} as unknown as GitHubOAuthService;
  const gitHubClient = {} as unknown as GitHubClient;
  const httpService = {} as unknown as HttpService;
  const mcpAggregator = {
    executeMcpTool: vi.fn(),
  } as unknown as McpClientAggregatorService;

  const docSearchService = {
    hybridSearch: vi.fn().mockResolvedValue([]),
  } as unknown as DocSearchService;

  const knowledgeDocService = {
    createDoc: vi.fn().mockResolvedValue({ docId: 'doc-new', status: 'pending' }),
    updateDoc: vi.fn().mockResolvedValue({ docId: 'doc-up', status: 'pending' }),
  } as unknown as KnowledgeDocService;

  const docLinkService = {
    linkDocs: vi
      .fn()
      .mockResolvedValue({ linkId: 'lnk1', fromDocId: 'a', toDocId: 'b', label: 'cites' }),
    getOutgoing: vi
      .fn()
      .mockResolvedValue([
        { linkId: 'l1', toDocId: 'd2', toTitle: 'Two', label: 'cites', createdAt: new Date() },
      ]),
    getIncoming: vi.fn().mockResolvedValue([
      {
        linkId: 'l2',
        fromDocId: 'd3',
        fromTitle: 'Three',
        label: 'cites',
        createdAt: new Date(),
      },
    ]),
  } as unknown as DocLinkService;

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
    {} as any, // recordOpenApiService
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
    // Phase 22-03: workflow services added to constructor — stubbed here since KG tests don't exercise them.
    { findMany: vi.fn(), findOne: vi.fn(), testRunWorkflow: vi.fn() } as any,
    { executeSteps: vi.fn() } as any,
    {} as never, // tableOpenApiService
    {} as never, // fieldOpenApiService
    {} as never, // viewOpenApiService
    {} as never, // appBuilderService
    {} as never // guardrailService
  );

  return {
    service,
    knowledgeDocService,
    docLinkService,
    docSearchService,
    prismaService,
    resolvedSpaceId,
  };
}

// The agent acts as its owner user: write dispatchers resolve the caller id via
// `resolveAgentCallerUserId(agent, ctx)` → `ctx.userId ?? agent.createdBy ?? 'system'`.
// `createdBy` is the owner user the agent writes as (FK-valid against the users table);
// `agent.id` is NOT a valid user id (Phase 21 lesson — `imported_doc_createdBy_fkey`).
const agent = { id: 'agt1', baseId: 'base1', createdBy: 'usr-owner' };
const ctx = { agentId: 'agt1', trigger: 'manual' as const };

describe('AgentExecutionService — KG tool dispatch (Phase 21-05)', () => {
  let h: ReturnType<typeof buildHarness>;
  beforeEach(() => {
    h = buildHarness();
  });

  describe('create_knowledge_doc', () => {
    it('resolves spaceId from base FK and forwards the resolved owner user as createdBy', async () => {
      await (h.service as any).executeToolCall(
        {
          name: 'create_knowledge_doc',
          input: { title: 'T', rawContent: 'C', folderId: 'fld1' },
        },
        agent,
        ctx
      );

      expect(h.knowledgeDocService.createDoc).toHaveBeenCalledTimes(1);
      expect(h.knowledgeDocService.createDoc).toHaveBeenCalledWith({
        spaceId: h.resolvedSpaceId,
        title: 'T',
        rawContent: 'C',
        folderId: 'fld1',
        createdBy: 'usr-owner',
      });
    });

    it('IGNORES agent-supplied spaceId in toolCall.input (T-21-16)', async () => {
      await (h.service as any).executeToolCall(
        {
          name: 'create_knowledge_doc',
          input: {
            title: 'T',
            rawContent: 'C',
            // Attacker fields — must be ignored by the dispatcher.
            spaceId: 'OTHER-SPACE',
            createdBy: 'attacker',
          },
        },
        agent,
        ctx
      );

      const call = (h.knowledgeDocService.createDoc as any).mock.calls[0][0];
      expect(call.spaceId).toBe(h.resolvedSpaceId);
      expect(call.spaceId).not.toBe('OTHER-SPACE');
      expect(call.createdBy).toBe('usr-owner');
      expect(call.createdBy).not.toBe('attacker');
    });

    it('appends a pending-index note to the result', async () => {
      const result: any = await (h.service as any).executeToolCall(
        { name: 'create_knowledge_doc', input: { title: 'T', rawContent: 'C' } },
        agent,
        ctx
      );
      expect(result.docId).toBe('doc-new');
      expect(result.status).toBe('pending');
      expect(result.note).toMatch(/Indexing in background/);
    });
  });

  describe('update_knowledge_doc', () => {
    it('passes resolved callerSpaceId + agent.id (T-21-16)', async () => {
      await (h.service as any).executeToolCall(
        {
          name: 'update_knowledge_doc',
          input: {
            docId: 'doc-X',
            rawContent: 'new body',
            // Attacker injection:
            callerSpaceId: 'OTHER',
            callerId: 'attacker',
          },
        },
        agent,
        ctx
      );

      const call = (h.knowledgeDocService.updateDoc as any).mock.calls[0][0];
      expect(call.callerSpaceId).toBe(h.resolvedSpaceId);
      expect(call.callerSpaceId).not.toBe('OTHER');
      expect(call.callerId).toBe('usr-owner');
      expect(call.callerId).not.toBe('attacker');
      expect(call.docId).toBe('doc-X');
      expect(call.rawContent).toBe('new body');
    });
  });

  describe('link_docs', () => {
    it('passes resolved callerSpaceId (T-21-16) and forwards label', async () => {
      await (h.service as any).executeToolCall(
        {
          name: 'link_docs',
          input: {
            fromDocId: 'd1',
            toDocId: 'd2',
            label: 'cites',
            // Attacker injection:
            callerSpaceId: 'OTHER',
          },
        },
        agent,
        ctx
      );

      const call = (h.docLinkService.linkDocs as any).mock.calls[0][0];
      expect(call.callerSpaceId).toBe(h.resolvedSpaceId);
      expect(call.callerSpaceId).not.toBe('OTHER');
      expect(call.callerId).toBe('usr-owner');
      expect(call.fromDocId).toBe('d1');
      expect(call.toDocId).toBe('d2');
      expect(call.label).toBe('cites');
    });
  });

  describe('get_doc_links', () => {
    it('returns both outgoing and incoming when direction=both (default)', async () => {
      const result: any = await (h.service as any).executeToolCall(
        { name: 'get_doc_links', input: { docId: 'doc-X' } },
        agent,
        ctx
      );
      expect(h.docLinkService.getOutgoing).toHaveBeenCalledWith({
        docId: 'doc-X',
        callerSpaceId: h.resolvedSpaceId,
      });
      expect(h.docLinkService.getIncoming).toHaveBeenCalledWith({
        docId: 'doc-X',
        callerSpaceId: h.resolvedSpaceId,
      });
      expect(result.outgoing).toHaveLength(1);
      expect(result.incoming).toHaveLength(1);
    });

    it('returns only outgoing when direction=outgoing', async () => {
      const result: any = await (h.service as any).executeToolCall(
        { name: 'get_doc_links', input: { docId: 'doc-X', direction: 'outgoing' } },
        agent,
        ctx
      );
      expect(h.docLinkService.getOutgoing).toHaveBeenCalled();
      expect(h.docLinkService.getIncoming).not.toHaveBeenCalled();
      expect(result.outgoing).toHaveLength(1);
      expect(result.incoming).toEqual([]);
    });

    it('returns only incoming when direction=incoming', async () => {
      const result: any = await (h.service as any).executeToolCall(
        { name: 'get_doc_links', input: { docId: 'doc-X', direction: 'incoming' } },
        agent,
        ctx
      );
      expect(h.docLinkService.getOutgoing).not.toHaveBeenCalled();
      expect(h.docLinkService.getIncoming).toHaveBeenCalled();
      expect(result.incoming).toHaveLength(1);
      expect(result.outgoing).toEqual([]);
    });
  });

  describe('search_knowledge_base — traverseLinks forwarding (D-21-03 MCP exposure)', () => {
    it('forwards {traverseLinks, maxHops} as 5th arg to hybridSearch', async () => {
      await (h.service as any).executeToolCall(
        {
          name: 'search_knowledge_base',
          input: { query: 'q', traverseLinks: true, maxHops: 2 },
        },
        { ...agent, knowledgeSources: { docIds: ['d1'] } },
        ctx
      );
      expect(h.docSearchService.hybridSearch).toHaveBeenCalledWith(
        h.resolvedSpaceId,
        'q',
        5,
        { docIds: ['d1'], folderIds: undefined },
        { traverseLinks: true, maxHops: 2 }
      );
    });

    it('omits options object when traverseLinks + maxHops absent (back-compat)', async () => {
      await (h.service as any).executeToolCall(
        { name: 'search_knowledge_base', input: { query: 'q' } },
        { ...agent, knowledgeSources: null },
        ctx
      );
      expect(h.docSearchService.hybridSearch).toHaveBeenCalledWith(
        h.resolvedSpaceId,
        'q',
        5,
        undefined,
        undefined
      );
    });
  });
});
