import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  Headers,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  UseGuards,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Response } from 'express';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import { PrismaService } from '@teable/db-main-prisma';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgentService } from './agent.service';
import { AgentExecutionService, AgentRunContext } from './agent-execution.service';
import { AgentMemoryService } from './agent-memory.service';
import { AgentConversationService } from './agent-conversation.service';
import { AgentTriggerService } from './agent-trigger.service';
import { GmailOAuthService } from './oauth/gmail-oauth.service';
import { SlackOAuthService } from './oauth/slack-oauth.service';
import { GitHubOAuthService } from './oauth/github-oauth.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { AgentPermissionGuard } from './agent-permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ResourceMeta } from '../auth/decorators/resource_meta.decorator';
import { DisabledPermission } from '../auth/decorators/disabled-permission.decorator';

@Controller('api/agent')
@UseGuards(AgentPermissionGuard)
@DisabledPermission()
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly executionService: AgentExecutionService,
    private readonly memoryService: AgentMemoryService,
    private readonly conversationService: AgentConversationService,
    private readonly triggerService: AgentTriggerService,
    private readonly gmailOAuthService: GmailOAuthService,
    private readonly slackOAuthService: SlackOAuthService,
    private readonly gitHubOAuthService: GitHubOAuthService,
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  @Post()
  @Permissions('base|create')
  @ResourceMeta('baseId', 'body')
  async create(@Body() dto: CreateAgentDto) {
    return this.agentService.create(dto, this.cls.get('user.id'));
  }

  @Get()
  @Permissions('base|read')
  @ResourceMeta('baseId', 'query')
  async listAgents(@Query('baseId') baseId: string) {
    if (!baseId) {
      throw new Error('baseId query parameter is required');
    }
    return this.agentService.findAll(baseId);
  }

  @Get(':id')
  @Permissions('base|read')
  async getAgent(@Param('id') id: string) {
    return this.agentService.findOne(id);
  }

  @Patch(':id')
  @Permissions('base|create')
  async updateAgent(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agentService.update(id, dto, this.cls.get('user.id'));
  }

  @Delete(':id')
  @Permissions('base|create')
  async removeAgent(@Param('id') id: string) {
    await this.agentService.remove(id);
    return { success: true };
  }

  @Post(':id/run')
  @Permissions('base|create')
  async runAgent(@Param('id') id: string, @Body() body: any, @Res() res: Response) {
    const ctx: AgentRunContext = {
      agentId: id,
      trigger: body.trigger || 'manual',
      triggerPayload: body.triggerPayload,
      conversationId: body.conversationId,
      userId: this.cls.get('user')?.id,
      pageContext: body.pageContext,
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const event of this.executionService.run(ctx)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write(`data: {"type":"done"}\n\n`);
    } catch (error) {
      res.write(`data: {"type":"error","content":"${(error as Error).message}"}\n\n`);
    }

    res.end();
  }

  /**
   * DM endpoint: send a direct message to an agent.
   * Emits `agent.dm` so AgentEventListener.handleAgentDm → AgentTriggerService.handleDm fires.
   * fromUserId is resolved from the authenticated session (T-11-06: never trusted from client body).
   * Guard: @Permissions('base|create') — scoped to owning base (T-11-07).
   */
  @Post(':id/message')
  @Permissions('base|create')
  async sendMessage(
    @Param('id') id: string,
    @Body() body: { message: string; conversationId?: string }
  ) {
    const fromUserId = this.cls.get('user')?.id;
    const payload = {
      agentId: id,
      message: body.message,
      fromUserId,
      conversationId: body.conversationId,
    };
    this.eventEmitter.emit('agent.dm', payload);
    return { accepted: true };
  }

  @Get(':id/tools')
  @Permissions('base|read')
  async listTools(@Param('id') id: string) {
    return this.prismaService.agentTool.findMany({
      where: { agentId: id },
      select: { toolName: true, isEnabled: true },
    });
  }

  @Patch(':id/tools/:toolName')
  @Permissions('base|create')
  async toggleTool(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Body() body: { isEnabled: boolean }
  ) {
    await this.prismaService.agentTool.upsert({
      where: { agentId_toolName: { agentId: id, toolName } },
      update: { isEnabled: body.isEnabled },
      create: { agentId: id, toolName, isEnabled: body.isEnabled },
    });
    return { success: true };
  }

  // ─── Trigger CRUD ────────────────────────────────────────────────────────────

  @Get(':id/triggers')
  @Permissions('base|read')
  async listTriggers(@Param('id') id: string) {
    return this.triggerService.listTriggers(id);
  }

  @Post(':id/triggers')
  @Permissions('base|create')
  async createTrigger(
    @Param('id') id: string,
    @Body() body: { triggerType: string; config: Record<string, unknown> }
  ) {
    return this.triggerService.createTrigger(id, body);
  }

  @Patch(':id/triggers/:triggerId')
  @Permissions('base|create')
  async toggleTriggerActive(
    @Param('triggerId') triggerId: string,
    @Body() body: { isActive: boolean }
  ) {
    return this.triggerService.toggleTrigger(triggerId, body.isActive);
  }

  @Delete(':id/triggers/:triggerId')
  @Permissions('base|create')
  async deleteTrigger(@Param('triggerId') triggerId: string) {
    await this.triggerService.deleteTrigger(triggerId);
    return { success: true };
  }

  // ─── Webhook trigger (inbound) ───────────────────────────────────────────────

  /**
   * Webhook endpoint: intentionally public (no @Permissions).
   * Authentication is handled by the X-Agent-Secret header check below.
   */
  @Post(':id/webhook')
  @Public()
  async agentWebhook(
    @Param('id') id: string,
    @Headers('x-agent-secret') secret: string,
    @Body() body: Record<string, unknown>
  ) {
    const trigger = await this.prismaService.agentTrigger.findFirst({
      where: { agentId: id, triggerType: 'webhook', isActive: true },
    });
    const storedSecret = (trigger?.config as { secret?: string } | null)?.secret;
    const secretMatches =
      trigger &&
      storedSecret &&
      secret &&
      storedSecret.length === secret.length &&
      timingSafeEqual(Buffer.from(storedSecret), Buffer.from(secret));
    if (!secretMatches) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
    const ctx: AgentRunContext = {
      agentId: id,
      trigger: 'webhook',
      triggerPayload: body,
    };
    void (async () => {
      for await (const _ of this.executionService.run(ctx)) {
        /* fire and forget */
      }
    })();
    return { received: true };
  }

  // ─── Memories ────────────────────────────────────────────────────────────────

  @Get(':id/memories')
  @Permissions('base|read')
  async getMemories(@Param('id') id: string) {
    return this.memoryService.listAll(id);
  }

  /**
   * Get OAuth authorization URL for connecting external services
   * User visits this URL and grants permission, then is redirected to /api/agent/oauth/callback
   */
  @Get('oauth/:provider')
  @Permissions('base|read')
  async getOAuthUrl(@Param('provider') provider: string, @Query('agentId') agentId: string) {
    if (!agentId) {
      throw new BadRequestException('agentId query parameter is required');
    }

    if (provider === 'gmail') {
      const authUrl = this.gmailOAuthService.generateAuthorizationUrl(agentId);
      return { provider, authUrl };
    }

    if (provider === 'slack') {
      const authUrl = this.slackOAuthService.generateAuthorizationUrl(agentId);
      return { provider, authUrl };
    }

    if (provider === 'github') {
      const authUrl = this.gitHubOAuthService.generateAuthorizationUrl(agentId);
      return { provider, authUrl };
    }

    throw new BadRequestException(`Provider '${provider}' is not supported`);
  }

  /**
   * OAuth callback endpoint — called by the OAuth provider after user grants permission.
   * Must be public: the caller is the OAuth provider redirect, not an authenticated user.
   */
  @Get('oauth/callback')
  @Public()
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response
  ) {
    if (error) {
      return res.redirect(`/agent/oauth-error?error=${error}`);
    }

    if (!code || !state) {
      return res.redirect(`/agent/oauth-error?error=missing_parameters`);
    }

    try {
      const { agentId, provider } = JSON.parse(Buffer.from(state, 'base64').toString());

      if (provider === 'gmail') {
        await this.gmailOAuthService.exchangeCodeForToken(code, agentId);
        return res.redirect(`/agent/${agentId}/settings?oauth_connected=true`);
      }

      if (provider === 'slack') {
        await this.slackOAuthService.exchangeCodeForToken(code, agentId);
        return res.redirect(`/agent/${agentId}/settings?oauth_connected=true`);
      }

      if (provider === 'github') {
        await this.gitHubOAuthService.exchangeCodeForToken(code, agentId);
        return res.redirect(`/agent/${agentId}/settings?oauth_connected=true`);
      }

      return res.redirect(`/agent/oauth-error?error=unsupported_provider`);
    } catch (error) {
      return res.redirect(`/agent/oauth-error?error=${(error as Error).message}`);
    }
  }

  /**
   * Get connection status for an agent
   * Returns which OAuth providers are connected
   */
  @Get(':id/oauth/status')
  @Permissions('base|read')
  async getOAuthStatus(@Param('id') agentId: string) {
    const [gmailConnection, slackConnection, gitHubConnection] = await Promise.all([
      this.prismaService.agentConnection.findUnique({
        where: { agentId_provider: { agentId, provider: 'gmail' } },
      }),
      this.prismaService.agentConnection.findUnique({
        where: { agentId_provider: { agentId, provider: 'slack' } },
      }),
      this.prismaService.agentConnection.findUnique({
        where: { agentId_provider: { agentId, provider: 'github' } },
      }),
    ]);

    return {
      providers: {
        gmail: {
          isConnected: !!gmailConnection?.encryptedToken,
          isEnabled: gmailConnection?.isEnabled ?? false,
          scopes: gmailConnection?.scopes || [],
        },
        slack: {
          isConnected: !!slackConnection?.encryptedToken,
          isEnabled: slackConnection?.isEnabled ?? false,
          scopes: slackConnection?.scopes || [],
        },
        github: {
          isConnected: !!gitHubConnection?.encryptedToken,
          isEnabled: gitHubConnection?.isEnabled ?? false,
          scopes: gitHubConnection?.scopes || [],
        },
      },
    };
  }

  /**
   * Disconnect OAuth provider for an agent
   */
  @Post(':id/oauth/:provider/disconnect')
  @Permissions('base|create')
  async disconnectOAuth(@Param('id') agentId: string, @Param('provider') provider: string) {
    if (provider === 'gmail') {
      await this.gmailOAuthService.revokeAccess(agentId);
      return { success: true, message: 'Gmail access revoked' };
    }

    if (provider === 'slack') {
      await this.slackOAuthService.revokeAccess(agentId);
      return { success: true, message: 'Slack access revoked' };
    }

    if (provider === 'github') {
      await this.gitHubOAuthService.revokeAccess(agentId);
      return { success: true, message: 'GitHub access revoked' };
    }

    throw new BadRequestException(`Provider '${provider}' is not supported`);
  }

  /**
   * ARH-03 HITL approve/reject endpoint.
   * T-24-05-01: verifies conversation ownership before any state change.
   * T-24-05-02: rejects with 409 unless conversation.status === 'waiting_for_approval'.
   */
  @Post(':id/conversation/:conversationId/approve')
  @Permissions('base|create')
  async approveConversation(
    @Param('id') _id: string,
    @Param('conversationId') conversationId: string,
    @Body() body: { decision: 'accept' | 'reject'; reason?: string }
  ) {
    const userId = this.cls.get('user')?.id;

    const conversation = await this.conversationService.findConversation(conversationId);
    if (!conversation) {
      throw new ForbiddenException('Conversation not found');
    }
    if (conversation.createdBy !== userId) {
      throw new ForbiddenException('You do not own this conversation');
    }
    if (conversation.status !== 'waiting_for_approval') {
      throw new ConflictException(
        `Conversation is not waiting for approval (status: ${conversation.status})`
      );
    }

    if (body.decision === 'accept') {
      const approvalPayload = conversation.approvalPayload as { question?: string } | null;
      const question = approvalPayload?.question ?? '';
      await this.conversationService.clearApprovalState(conversationId, 'in_progress');
      // Start a new run on the same conversationId with the synthetic approval message
      void (async () => {
        for await (const _ of this.executionService.run({
          agentId: _id,
          trigger: 'manual',
          conversationId,
          userId,
          syntheticUserMessage: `Approved: ${question}`,
        })) {
          /* fire and resume */
        }
      })();
      return { accepted: true };
    } else {
      // reject: mark failed, optionally persist reason as final assistant message
      await this.conversationService.markConversationFailed(conversationId);
      if (body.reason) {
        await this.conversationService.saveMessage({
          conversationId,
          role: 'assistant',
          type: 'text',
          content: `Rejected: ${body.reason}`,
        });
      }
      return { rejected: true, reason: body.reason };
    }
  }

  // ─── MCP Server CRUD ─────────────────────────────────────────────────────────

  @Get(':id/mcp-servers')
  @Permissions('base|read')
  async listMcpServers(@Param('id') id: string) {
    return this.prismaService.agentMcpServer.findMany({
      where: { agentId: id },
      orderBy: { createdTime: 'asc' },
    });
  }

  @Post(':id/mcp-servers')
  @Permissions('base|create')
  async addMcpServer(
    @Param('id') id: string,
    @Body() body: { name: string; url: string; transport?: string }
  ) {
    return this.prismaService.agentMcpServer.create({
      data: {
        agentId: id,
        name: body.name.trim(),
        url: body.url.trim(),
        transport: body.transport ?? 'streamable-http',
      },
    });
  }

  @Patch(':id/mcp-servers/:serverId')
  @Permissions('base|create')
  async updateMcpServer(
    @Param('id') id: string,
    @Param('serverId') serverId: string,
    @Body() body: { enabled?: boolean; name?: string }
  ) {
    await this.prismaService.agentMcpServer.updateMany({
      where: { id: serverId, agentId: id },
      data: {
        ...(body.enabled !== undefined && { enabled: body.enabled }),
        ...(body.name && { name: body.name }),
      },
    });
    return { success: true };
  }

  @Delete(':id/mcp-servers/:serverId')
  @Permissions('base|create')
  async deleteMcpServer(@Param('id') id: string, @Param('serverId') serverId: string) {
    await this.prismaService.agentMcpServer.deleteMany({ where: { id: serverId, agentId: id } });
    return { success: true };
  }

  /**
   * Get conversation history for an agent
   */
  @Get(':id/conversations')
  @Permissions('base|read')
  async listConversations(@Param('id') agentId: string, @Query('limit') limit: string = '50') {
    return this.conversationService.listConversations(agentId, parseInt(limit, 10));
  }

  /**
   * Get specific conversation with all messages
   */
  @Get(':id/conversations/:conversationId')
  @Permissions('base|read')
  async getConversation(@Param('conversationId') conversationId: string) {
    return this.conversationService.getConversationHistory(conversationId);
  }

  /**
   * Get conversation summary (for listing/preview)
   */
  @Get(':id/conversations/:conversationId/summary')
  @Permissions('base|read')
  async getConversationSummary(@Param('conversationId') conversationId: string) {
    return this.conversationService.getConversationSummary(conversationId);
  }
}
