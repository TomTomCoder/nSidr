import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { aiGenerateRoSchema, IAiGenerateRo } from '@teable/openapi';
import type { Response } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../../zod.validation.pipe';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TablePipe } from '../table/open-api/table.pipe';
import { AiService } from './ai.service';

const agentMessageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string() });
const buildRoSchema = z.object({ prompt: z.string(), modelKey: z.string().optional() });
const agentRoSchema = z.object({
  prompt: z.string(),
  modelKey: z.string().optional(),
  messages: z.array(agentMessageSchema).optional(),
});

@Controller('api/:baseId/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('/generate-stream')
  @Permissions('base|read')
  async generateStream(
    @Param('baseId') baseId: string,
    @Body(new ZodValidationPipe(aiGenerateRoSchema), TablePipe) aiGenerateRo: IAiGenerateRo,
    @Res() res: Response
  ) {
    await this.aiService.generateStream(baseId, aiGenerateRo, res);
  }

  @Post('/build-stream')
  @Permissions('base|create')
  async buildStream(
    @Param('baseId') baseId: string,
    @Body(new ZodValidationPipe(buildRoSchema)) body: { prompt: string },
    @Res() res: Response
  ) {
    await this.aiService.generateBuildStream(baseId, body.prompt, res);
  }

  @Get('/config')
  @Permissions('base|read')
  async getAIConfig(@Param('baseId') baseId: string) {
    return await this.aiService.getSimplifiedAIConfig(baseId);
  }

  @Post('/agent-stream')
  @Permissions('base|create')
  async agentStream(
    @Param('baseId') baseId: string,
    @Body(new ZodValidationPipe(agentRoSchema))
    body: {
      prompt: string;
      modelKey?: string;
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
    @Res() res: Response
  ) {
    await this.aiService.generateAgentStream(
      baseId,
      body.prompt,
      res,
      body.modelKey,
      body.messages
    );
  }

  @Post('/generate-workflow')
  @Permissions('base|update')
  async generateWorkflow(
    @Param('baseId') baseId: string,
    @Body() body: { prompt: string; modelKey?: string },
    @Res() res: Response
  ) {
    const sendEvent = (event: object) => res.write(JSON.stringify(event) + '\n');
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    await this.aiService.generateWorkflowConfig(baseId, body.prompt, sendEvent, body.modelKey);
    res.end();
  }

  @Post('/import-analyze')
  @Permissions('base|create')
  async importAnalyze(
    @Param('baseId') baseId: string,
    @Body() body: { prompt: string; worksheets: Record<string, unknown>; modelKey?: string },
    @Res() res: Response
  ) {
    await this.aiService.generateImportAnalysis(
      baseId,
      body.prompt,
      body.worksheets,
      res,
      body.modelKey
    );
  }

  @Post('/create-table-stream')
  @Permissions('base|create')
  async createTableStream(
    @Param('baseId') baseId: string,
    @Body() body: { prompt: string; modelKey?: string },
    @Res() res: Response
  ) {
    const sendEvent = (event: object) => res.write(JSON.stringify(event) + '\n');
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    await this.aiService.generateTableCreationStream(baseId, body.prompt, sendEvent, body.modelKey);
    res.end();
  }

  @Post('/generate-view')
  @Permissions('base|create')
  async generateView(
    @Param('baseId') baseId: string,
    @Body() body: { tableId: string; prompt: string; modelKey?: string }
  ) {
    return this.aiService.generateViewConfig(baseId, body.tableId, body.prompt, body.modelKey);
  }

  @Get('/disable-ai-actions')
  @Permissions('base|read')
  async getAIDisableAIActions(@Param('baseId') baseId: string) {
    return await this.aiService.getAIDisableAIActions(baseId);
  }
}
