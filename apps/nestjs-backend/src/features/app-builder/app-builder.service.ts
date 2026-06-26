import { Injectable } from '@nestjs/common';
import { generateAppId } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import type { Response } from 'express';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import { AiService } from '../ai/ai.service';

export interface IAppVo {
  id: string;
  name: string;
  baseId: string;
}

@Injectable()
export class AppBuilderService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>,
    private readonly aiService: AiService
  ) {}

  private getUserId(): string {
    return this.cls.get('user.id');
  }

  async createApp(baseId: string, name: string): Promise<IAppVo> {
    const id = generateAppId();
    const userId = this.getUserId();
    const app = await this.prismaService.txClient().app.create({
      data: { id, name, baseId, createdBy: userId },
    });
    return { id: app.id, name: app.name, baseId: app.baseId };
  }

  async findMany(baseId: string): Promise<IAppVo[]> {
    const apps = await this.prismaService.txClient().app.findMany({
      where: { baseId },
      orderBy: { createdTime: 'asc' },
    });
    return apps.map((a) => ({ id: a.id, name: a.name, baseId: a.baseId }));
  }

  async findOne(baseId: string, appId: string): Promise<IAppVo | null> {
    const app = await this.prismaService.txClient().app.findFirst({
      where: { id: appId, baseId },
    });
    if (!app) return null;
    return { id: app.id, name: app.name, baseId: app.baseId };
  }

  async renameApp(baseId: string, appId: string, name: string): Promise<void> {
    const userId = this.getUserId();
    await this.prismaService.txClient().app.update({
      where: { id: appId },
      data: { name, lastModifiedBy: userId },
    });
  }

  async duplicateApp(baseId: string, appId: string): Promise<IAppVo> {
    const userId = this.getUserId();
    const source = await this.prismaService.txClient().app.findFirstOrThrow({
      where: { id: appId, baseId },
    });
    const newId = generateAppId();
    const app = await this.prismaService.txClient().app.create({
      data: {
        id: newId,
        name: `${source.name} (copy)`,
        baseId,
        content: source.content ?? undefined,
        createdBy: userId,
      },
    });
    return { id: app.id, name: app.name, baseId: app.baseId };
  }

  async deleteApp(baseId: string, appId: string): Promise<void> {
    await this.prismaService.txClient().app.deleteMany({
      where: { id: appId, baseId },
    });
  }

  async getAppContent(baseId: string, appId: string): Promise<unknown> {
    const app = await this.prismaService.txClient().app.findFirst({
      where: { id: appId, baseId },
      select: { content: true },
    });
    return app?.content ?? { widgets: [], layout: [] };
  }

  async updateAppContent(baseId: string, appId: string, content: unknown): Promise<void> {
    const userId = this.getUserId();
    await this.prismaService.txClient().app.upsert({
      where: { id: appId },
      update: { content: content as object, lastModifiedBy: userId },
      create: {
        id: appId,
        name: 'Generated App',
        baseId,
        content: content as object,
        createdBy: userId,
      },
    });
  }

  async generateAppStream(
    baseId: string,
    appId: string,
    prompt: string,
    response: Response,
    modelKey?: string
  ): Promise<void> {
    response.setHeader('Content-Type', 'application/x-ndjson');
    response.setHeader('Cache-Control', 'no-cache, no-transform');

    const sendEvent = (event: object) => {
      response.write(JSON.stringify(event) + '\n');
    };

    const app = await this.prismaService.txClient().app.findFirst({
      where: { id: appId, baseId },
      select: { content: true },
    });
    const existingContent = (app?.content as { files?: Record<string, string> } | null) ?? {};
    const files: Record<string, string> = existingContent.files ?? {};

    try {
      await this.aiService.generateAppCodeStream(baseId, prompt, files, sendEvent, modelKey);
    } finally {
      const userId = this.getUserId();
      // ponytail: upsert so generation survives stale frontend URLs pointing to deleted/missing apps
      await this.prismaService.txClient().app.upsert({
        where: { id: appId },
        update: { content: { files } as object, lastModifiedBy: userId },
        create: {
          id: appId,
          name: 'Generated App',
          baseId,
          content: { files } as object,
          createdBy: userId,
        },
      });
      response.end();
    }
  }
}
