import { Injectable } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { IPromptRepository, IAiPromptOverride } from './prompt.repository';

/**
 * Prisma-based implementation of IPromptRepository.
 *
 * This is the ONLY place that knows about the aiPromptOverride table schema.
 * All database queries go through this repository.
 */
@Injectable()
export class PrismaPromptRepository implements IPromptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOverridesByKey(key: string): Promise<IAiPromptOverride[]> {
    return this.prisma.aiPromptOverride.findMany({
      where: { promptKey: key, isActive: true },
    });
  }

  async findOverride(key: string, modelPattern: string | null): Promise<IAiPromptOverride | null> {
    return this.prisma.aiPromptOverride.findFirst({
      where: { promptKey: key, modelPattern: modelPattern ?? null },
    });
  }

  async upsertOverride(
    key: string,
    content: string,
    modelPattern: string | null,
    createdBy: string
  ): Promise<void> {
    const mp = modelPattern ?? null;
    const existing = await this.prisma.aiPromptOverride.findFirst({
      where: { promptKey: key, modelPattern: mp },
    });

    if (existing) {
      await this.prisma.aiPromptOverride.update({
        where: { id: existing.id },
        data: { content },
      });
    } else {
      await this.prisma.aiPromptOverride.create({
        data: { promptKey: key, modelPattern: mp, content, isActive: true, createdBy },
      });
    }
  }
}
