/* eslint-disable sonarjs/no-duplicate-string */
import { Body, Controller, Delete, Get, Param, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import type { IAppVo } from './app-builder.service';
import { AppBuilderService } from './app-builder.service';

@Controller('api/base/:baseId/app')
export class AppBuilderController {
  constructor(private readonly appBuilderService: AppBuilderService) {}

  @Get()
  @Permissions('base|read')
  async list(@Param('baseId') baseId: string): Promise<IAppVo[]> {
    return this.appBuilderService.findMany(baseId);
  }

  @Post()
  @Permissions('base|update')
  async create(@Param('baseId') baseId: string, @Body() body: { name?: string }): Promise<IAppVo> {
    return this.appBuilderService.createApp(baseId, body.name ?? 'Untitled app');
  }

  @Delete(':appId')
  @Permissions('base|update')
  async delete(
    @Param('baseId') baseId: string,
    @Param('appId') appId: string
  ): Promise<{ success: boolean }> {
    await this.appBuilderService.deleteApp(baseId, appId);
    return { success: true };
  }

  @Patch(':appId/name')
  @Permissions('base|update')
  async rename(
    @Param('baseId') baseId: string,
    @Param('appId') appId: string,
    @Body() body: { name: string }
  ): Promise<{ success: boolean }> {
    await this.appBuilderService.renameApp(baseId, appId, body.name);
    return { success: true };
  }

  @Post(':appId/duplicate')
  @Permissions('base|update')
  async duplicate(@Param('baseId') baseId: string, @Param('appId') appId: string): Promise<IAppVo> {
    return this.appBuilderService.duplicateApp(baseId, appId);
  }

  @Get(':appId/content')
  @Permissions('base|read')
  async getContent(@Param('baseId') baseId: string, @Param('appId') appId: string) {
    return this.appBuilderService.getAppContent(baseId, appId);
  }

  @Patch(':appId/content')
  @Permissions('base|update')
  async updateContent(
    @Param('baseId') baseId: string,
    @Param('appId') appId: string,
    @Body() body: { content: unknown }
  ) {
    await this.appBuilderService.updateAppContent(baseId, appId, body.content);
    return { success: true };
  }

  @Post(':appId/generate-stream')
  @Permissions('base|update')
  async generateStream(
    @Param('baseId') baseId: string,
    @Param('appId') appId: string,
    @Body() body: { prompt: string; modelKey?: string },
    @Res() res: Response
  ) {
    await this.appBuilderService.generateAppStream(baseId, appId, body.prompt, res, body.modelKey);
  }
}
