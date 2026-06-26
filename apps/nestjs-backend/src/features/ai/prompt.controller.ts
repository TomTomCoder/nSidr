import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PROMPT_DEFAULTS, PROMPT_KEY, PromptKey } from './prompt.service';

interface IPromptOverrideVo {
  key: string;
  defaultContent: string;
  override: {
    content: string;
    modelPattern: string | null;
    isActive: boolean;
  } | null;
}

interface IUpsertPromptRo {
  content: string;
  modelPattern?: string | null;
}

@Controller('api/admin/ai/prompts')
export class PromptController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  @Permissions('instance|read')
  async listPrompts(): Promise<IPromptOverrideVo[]> {
    const keys = Object.values(PROMPT_KEY) as PromptKey[];
    const overrides = await this.prismaService.aiPromptOverride.findMany({
      where: { promptKey: { in: keys }, isActive: true, modelPattern: null },
    });

    const overrideMap = new Map(overrides.map((o) => [o.promptKey, o]));

    return keys.map((key) => {
      const override = overrideMap.get(key) ?? null;
      return {
        key,
        defaultContent: PROMPT_DEFAULTS[key],
        override: override
          ? {
              content: override.content,
              modelPattern: override.modelPattern,
              isActive: override.isActive,
            }
          : null,
      };
    });
  }

  @Put(':key')
  @Permissions('instance|update')
  async upsertPrompt(
    @Param('key') key: string,
    @Body() body: IUpsertPromptRo
  ): Promise<IPromptOverrideVo> {
    const modelPattern = body.modelPattern ?? null;
    // Prisma rejects null in compound unique `where`, so use findFirst + create/update
    const existing = await this.prismaService.aiPromptOverride.findFirst({
      where: { promptKey: key, modelPattern },
    });
    const override = existing
      ? await this.prismaService.aiPromptOverride.update({
          where: { id: existing.id },
          data: { content: body.content, isActive: true, lastModifiedBy: 'admin' },
        })
      : await this.prismaService.aiPromptOverride.create({
          data: {
            promptKey: key,
            modelPattern,
            content: body.content,
            isActive: true,
            createdBy: 'admin',
          },
        });

    return {
      key,
      defaultContent: PROMPT_DEFAULTS[key as PromptKey] ?? '',
      override: {
        content: override.content,
        modelPattern: override.modelPattern,
        isActive: override.isActive,
      },
    };
  }

  @Delete(':key')
  @Permissions('instance|update')
  async deletePromptOverride(@Param('key') key: string): Promise<{ deleted: number }> {
    const result = await this.prismaService.aiPromptOverride.deleteMany({
      where: { promptKey: key, modelPattern: null },
    });
    return { deleted: result.count };
  }
}
