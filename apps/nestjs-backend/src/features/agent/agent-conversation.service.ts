import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaService } from '@teable/db-main-prisma';

export interface SaveMessageInput {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  type: 'text' | 'tool' | 'think' | 'progress' | 'error';
  content: string;
  toolName?: string;
  toolInput?: object;
  toolOutput?: object;
  metadata?: object;
}

@Injectable()
export class AgentConversationService {
  private readonly logger = new Logger(AgentConversationService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async createConversation(
    agentId: string,
    userId: string,
    trigger: string = 'manual'
  ): Promise<string> {
    const conversation = await this.prismaService.agentConversation.create({
      data: {
        agentId,
        createdBy: userId,
        trigger,
        status: 'in_progress',
      },
    });
    return conversation.id;
  }

  async saveMessage(input: SaveMessageInput): Promise<void> {
    try {
      await this.prismaService.agentConversationMessage.create({
        data: {
          conversationId: input.conversationId,
          role: input.role,
          type: input.type,
          content: input.content,
          toolName: input.toolName,
          toolInput: input.toolInput,
          toolOutput: input.toolOutput,
          metadata: input.metadata,
        },
      });

      // Auto-title the conversation from the first user message
      if (input.role === 'user' && input.type === 'text') {
        const conversation = await this.prismaService.agentConversation.findUnique({
          where: { id: input.conversationId },
          select: { title: true },
        });
        if (!conversation?.title) {
          const title = input.content.slice(0, 80).trim();
          await this.prismaService.agentConversation.update({
            where: { id: input.conversationId },
            data: { title },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to save message: ${(error as Error).message}`);
      throw error;
    }
  }

  async markConversationComplete(conversationId: string): Promise<void> {
    await this.prismaService.agentConversation.update({
      where: { id: conversationId },
      data: { status: 'completed' },
    });
  }

  async markConversationFailed(conversationId: string): Promise<void> {
    await this.prismaService.agentConversation.update({
      where: { id: conversationId },
      data: { status: 'failed' },
    });
  }

  async markConversationWaitingForApproval(
    conversationId: string,
    approvalPayload: object
  ): Promise<void> {
    await this.prismaService.agentConversation.update({
      where: { id: conversationId },
      data: { status: 'waiting_for_approval', approvalPayload },
    });
  }

  async clearApprovalState(
    conversationId: string,
    nextStatus: 'in_progress' | 'failed'
  ): Promise<void> {
    await this.prismaService.agentConversation.update({
      where: { id: conversationId },
      data: { status: nextStatus, approvalPayload: Prisma.JsonNull },
    });
  }

  async findConversation(conversationId: string) {
    return this.prismaService.agentConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, createdBy: true, status: true, approvalPayload: true },
    });
  }

  async getConversationHistory(conversationId: string, maxMessages = 200) {
    const conversation = await this.prismaService.agentConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdTime: 'asc' },
          take: maxMessages,
        },
      },
    });
    return conversation;
  }

  async listConversations(agentId: string, limit: number = 50) {
    const conversations = await this.prismaService.agentConversation.findMany({
      where: { agentId },
      orderBy: { createdTime: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        trigger: true,
        status: true,
        createdTime: true,
        createdBy: true,
      },
    });
    return conversations;
  }

  async getConversationSummary(conversationId: string) {
    const conversation = await this.prismaService.agentConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          select: {
            type: true,
            content: true,
          },
          orderBy: { createdTime: 'asc' },
        },
      },
    });

    if (!conversation) return null;

    const messageCount = conversation.messages.length;
    const toolCount = conversation.messages.filter((m) => m.type === 'tool').length;
    const hasErrors = conversation.messages.some((m) => m.type === 'error');

    return {
      id: conversation.id,
      messageCount,
      toolCount,
      hasErrors,
      status: conversation.status,
      createdTime: conversation.createdTime,
    };
  }
}
