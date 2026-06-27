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
import { Request, Response } from 'express';
import { PrismaService } from '@teable/db-main-prisma';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import { TokenAccess } from '../auth/decorators/token.decorator';
import { UnifiedAiService, UnifiedChatContext } from './unified-ai.service';
import { ActionProposalService } from './action-proposal.service';

@Controller('api/spaces/:spaceId/ai')
export class UnifiedAiController {
  private readonly logger = new Logger(UnifiedAiController.name);

  constructor(
    private readonly unifiedAiService: UnifiedAiService,
    private readonly actionProposalService: ActionProposalService,
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>
  ) {}

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
    },
    @Res() res: Response,
    @Req() req: Request
  ) {
    // Set SSE headers FIRST — before any write
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

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
