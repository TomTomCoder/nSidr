import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { PromptService } from '../ai/prompt.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly promptService: PromptService
  ) {}

  async create(dto: CreateAgentDto, createdBy: string) {
    const agent = await this.prismaService.agent.create({
      data: {
        name: dto.name,
        description: dto.description,
        baseId: dto.baseId,
        instructions: dto.instructions,
        modelKey: dto.modelKey,
        isPublic: dto.isPublic ?? false,
        knowledgeSources: (dto.knowledgeSources ?? undefined) as object | undefined,
        planningEnabled: dto.planningEnabled,
        reflectionEnabled: dto.reflectionEnabled,
        maxReflections: dto.maxReflections,
        maxIterations: dto.maxIterations,
        respondToMentions: dto.respondToMentions,
        allowDirectMessage: dto.allowDirectMessage,
        memoryEnabled: dto.memoryEnabled,
        createdBy,
      },
    });

    // If instructions are provided, upsert the prompt override
    if (dto.instructions) {
      await this.upsertPrompt(agent.id, dto.instructions);
    }

    return agent;
  }

  async findAll(baseId: string) {
    return this.prismaService.agent.findMany({
      where: { baseId, isActive: true },
    });
  }

  async findOne(agentId: string) {
    const agent = await this.prismaService.agent.findUnique({
      where: { id: agentId },
    });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }
    return agent;
  }

  async update(agentId: string, dto: UpdateAgentDto, modifiedBy: string) {
    const data: any = { lastModifiedBy: modifiedBy };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.instructions !== undefined) data.instructions = dto.instructions;
    if (dto.modelKey !== undefined) data.modelKey = dto.modelKey;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;
    if ('knowledgeSources' in dto) data.knowledgeSources = dto.knowledgeSources ?? null;
    if (dto.respondToMentions !== undefined) data.respondToMentions = dto.respondToMentions;
    if (dto.allowDirectMessage !== undefined) data.allowDirectMessage = dto.allowDirectMessage;
    if (dto.memoryEnabled !== undefined) data.memoryEnabled = dto.memoryEnabled;

    const agent = await this.prismaService.agent.update({
      where: { id: agentId },
      data,
    });

    // If instructions are provided, upsert the prompt override
    if (dto.instructions) {
      await this.upsertPrompt(agentId, dto.instructions);
    }

    return agent;
  }

  async remove(agentId: string): Promise<void> {
    await this.prismaService.baseNode.deleteMany({
      where: { resourceId: agentId, resourceType: 'agent' },
    });
    await this.prismaService.agent.delete({ where: { id: agentId } });
  }

  async upsertPrompt(agentId: string, instructions: string): Promise<void> {
    const promptKey = `agent:${agentId}.system`;
    await this.promptService.upsertOverride(promptKey, instructions);
  }
}
