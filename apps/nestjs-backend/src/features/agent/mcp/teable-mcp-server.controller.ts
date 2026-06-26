/**
 * teable-mcp-server.controller.ts
 *
 * NestJS controller that bridges incoming HTTP requests to the MCP server service.
 * Endpoint: POST /api/agent/mcp/:agentId  (StreamableHTTP)
 *
 * Auth: protected by AgentPermissionGuard (same guard as AgentController).
 *   - The guard looks up the agent record → resolves baseId → checks PermissionService.
 *   - CLS is populated with user.id before our handler runs.
 *
 * Transport: StreamableHTTP (stateless per session per BOOT-OOM guidance).
 *   - A fresh transport + Server instance is created for every request.
 *   - No background threads or long-lived process state.
 */

import { Controller, All, Param, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../../types/cls';
import { AgentPermissionGuard } from '../agent-permission.guard';
import { DisabledPermission } from '../../auth/decorators/disabled-permission.decorator';
import { TeableMcpServerService } from './teable-mcp-server.service';

@Controller('api/agent/mcp')
@UseGuards(AgentPermissionGuard)
@DisabledPermission()
export class TeableMcpServerController {
  constructor(
    private readonly mcpService: TeableMcpServerService,
    private readonly cls: ClsService<IClsStore>
  ) {}

  /**
   * StreamableHTTP endpoint for all MCP protocol methods (POST from client).
   * The MCP client sends JSON-RPC requests as HTTP POST.
   */
  @All(':id')
  async handleMcpRequest(
    @Param('id') agentId: string,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const userId = this.cls.get('user.id') ?? 'anonymous';

    await this.mcpService.handleRequest(
      req as unknown as import('node:http').IncomingMessage,
      res as unknown as import('node:http').ServerResponse,
      agentId,
      userId
    );
  }
}
