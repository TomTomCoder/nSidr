import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  Req,
  HttpCode,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import { TokenAccess } from '../auth/decorators/token.decorator';
import { ActionProposalService } from './action-proposal.service';
import { AppBlueprintService } from './app-blueprint.service';
import { UnifiedAiService, UnifiedChatContext } from './unified-ai.service';

@Controller('api/spaces/:spaceId/ai')
export class UnifiedAiController {
  private readonly logger = new Logger(UnifiedAiController.name);

  constructor(
    private readonly unifiedAiService: UnifiedAiService,
    private readonly actionProposalService: ActionProposalService,
    private readonly appBlueprintService: AppBlueprintService,
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>
  ) {}

  /** Set SSE headers FIRST — before any write (shared by every SSE endpoint on this controller). */
  private setSseHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  /**
   * POST /api/spaces/:spaceId/ai/chat
   * Streams SSE events to the browser.
   * Sets SSE headers BEFORE any res.write() call (T-10-06 mitigation).
   * Handles client disconnect to avoid memory leaks (T-10-06).
   */
  @TokenAccess()
  @Post('chat')
  async chat(
    @Param('spaceId') spaceId: string,
    @Body()
    body: {
      message: string;
      conversationId?: string;
      modelKey: string;
      baseId?: string;
      activeBaseId?: string;
      attachments?: { url: string; name: string; mimetype: string }[];
      targetType?: 'table' | 'interface' | 'automation' | 'agent' | 'app' | 'mock_data' | 'docs';
      pageContext?: { tableId?: string; tableName?: string };
    },
    @Res() res: Response,
    @Req() req: Request
  ) {
    this.setSseHeaders(res);

    // Client disconnect flag (T-10-06: SSE connection never closed on client disconnect)
    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    const userId = this.cls.get('user.id');
    const ctx: UnifiedChatContext = {
      spaceId,
      userId,
      message: body.message,
      conversationId: body.conversationId,
      modelKey: body.modelKey,
      activeBaseId: body.activeBaseId ?? body.baseId,
      attachments: body.attachments,
      targetType: body.targetType,
      pageContext: body.pageContext,
    };

    try {
      for await (const event of this.unifiedAiService.chat(ctx)) {
        if (clientDisconnected) {
          break;
        }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      this.logger.error(`chat error: ${(err as Error).message}\n${(err as Error).stack}`);
      res.write(`data: ${JSON.stringify({ type: 'error', content: (err as Error).message })}\n\n`);
    }

    res.end();
  }

  /**
   * POST /api/spaces/:spaceId/ai/full-app
   * Phase 6.1 — bootstraps a full app (analysis → blueprint → table proposals) as its own
   * SSE stream, separate from /chat (see AI-GENERATION-ROADMAP.md for the architecture decision).
   */
  @TokenAccess()
  @Post('full-app')
  async fullApp(
    @Param('spaceId') spaceId: string,
    @Body() body: { baseId: string; prompt: string; modelKey: string; conversationId?: string },
    @Res() res: Response,
    @Req() req: Request
  ) {
    this.setSseHeaders(res);

    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    const userId = this.cls.get('user.id');

    try {
      if (!body.baseId) throw new Error('baseId is required to generate a full app');

      let conversationId = body.conversationId;
      if (!conversationId) {
        const conversation = await this.prismaService.workspaceConversation.create({
          data: { spaceId, createdBy: userId, status: 'in_progress' },
        });
        conversationId = conversation.id;
      }

      for await (const event of this.appBlueprintService.generateFullApp({
        spaceId,
        userId,
        baseId: body.baseId,
        prompt: body.prompt,
        modelKey: body.modelKey,
        conversationId,
      })) {
        if (clientDisconnected) break;
        res.write(`data: ${JSON.stringify({ ...event, conversationId })}\n\n`);
      }
    } catch (err) {
      this.logger.error(`full-app error: ${(err as Error).message}\n${(err as Error).stack}`);
      res.write(`data: ${JSON.stringify({ type: 'error', content: (err as Error).message })}\n\n`);
    }

    res.end();
  }

  /**
   * POST /api/spaces/:spaceId/ai/full-app/:conversationId/continue
   * Advances the saga to its next stage (subgenerators → agents → report). Call this once the
   * user has accepted every proposal from the previous stage — see AppBlueprintService's class
   * doc for why this can't just be a continuation of the original /full-app stream.
   */
  @TokenAccess()
  @Post('full-app/:conversationId/continue')
  async continueFullApp(
    @Param('spaceId') spaceId: string,
    @Param('conversationId') conversationId: string,
    @Res() res: Response,
    @Req() req: Request
  ) {
    this.setSseHeaders(res);

    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    try {
      const conversation = await this.prismaService.workspaceConversation.findUnique({
        where: { id: conversationId },
        select: { spaceId: true },
      });
      if (!conversation || conversation.spaceId !== spaceId) {
        throw new ForbiddenException('Conversation does not belong to this space');
      }

      for await (const event of this.appBlueprintService.continueFullApp(conversationId)) {
        if (clientDisconnected) break;
        res.write(`data: ${JSON.stringify({ ...event, conversationId })}\n\n`);
      }
    } catch (err) {
      this.logger.error(
        `full-app continue error: ${(err as Error).message}\n${(err as Error).stack}`
      );
      res.write(`data: ${JSON.stringify({ type: 'error', content: (err as Error).message })}\n\n`);
    }

    res.end();
  }

  /**
   * POST /api/spaces/:spaceId/ai/accept-proposal
   * Executes the accepted proposal action. Returns JSON result.
   * Validates conversation.spaceId === req.params.spaceId before execution (T-10-10).
   */
  @TokenAccess()
  @Post('accept-proposal')
  @HttpCode(200)
  async acceptProposal(
    @Param('spaceId') spaceId: string,
    @Body() body: { proposalId: string; conversationId: string }
  ) {
    const userId = this.cls.get('user.id');
    this.logger.log(
      `acceptProposal → proposalId=${body.proposalId} conversationId=${body.conversationId} spaceId=${spaceId} userId=${userId}`
    );

    // Cross-space authorization check (T-10-10 mitigation)
    const conversation = await this.prismaService.workspaceConversation.findUnique({
      where: { id: body.conversationId },
      select: { spaceId: true },
    });

    if (!conversation || conversation.spaceId !== spaceId) {
      this.logger.warn(
        `acceptProposal REJECTED — conversation ${body.conversationId} not found or spaceId mismatch (expected ${spaceId}, got ${conversation?.spaceId})`
      );
      throw new ForbiddenException('Conversation does not belong to this space');
    }

    this.logger.log(`acceptProposal EXECUTING proposalId=${body.proposalId}`);
    return this.actionProposalService.acceptProposal(body.proposalId, userId);
  }

  /**
   * GET /api/spaces/:spaceId/ai/conversations
   * Returns paginated WorkspaceConversation list (latest first, limit 20).
   * Scoped to both the space AND the requesting user (no cross-user data leakage).
   */
  @TokenAccess()
  @Get('conversations')
  async getConversations(@Param('spaceId') spaceId: string) {
    const userId = this.cls.get('user.id');

    const conversations = await this.prismaService.workspaceConversation.findMany({
      where: { spaceId, createdBy: userId },
      orderBy: { createdTime: 'desc' },
      take: 20,
      select: {
        id: true,
        spaceId: true,
        title: true,
        status: true,
        createdTime: true,
        updatedTime: true,
        createdBy: true,
      },
    });

    return { conversations };
  }

  /**
   * GET /api/spaces/:spaceId/ai/conversations/:conversationId
   * Returns the conversation with its messages for history replay.
   */
  @TokenAccess()
  @Get('conversations/:conversationId')
  async getConversation(
    @Param('spaceId') spaceId: string,
    @Param('conversationId') conversationId: string
  ) {
    const userId = this.cls.get('user.id');
    const conversation = await this.prismaService.workspaceConversation.findFirst({
      where: { id: conversationId, spaceId, createdBy: userId },
      include: { messages: { orderBy: { createdTime: 'asc' } } },
    });
    if (!conversation) throw new ForbiddenException();
    return conversation;
  }
}
