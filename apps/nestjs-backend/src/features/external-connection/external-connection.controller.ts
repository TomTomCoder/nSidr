/* eslint-disable sonarjs/no-duplicate-string */
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions.decorator';
import type {
  ICreateExternalConnectionDto,
  IExternalConnectionDto,
  ITestConnectionInput,
} from './external-connection.service';
import { ExternalConnectionService } from './external-connection.service';

@Controller('api/space/:spaceId/external-connection')
export class ExternalConnectionController {
  constructor(private readonly externalConnectionService: ExternalConnectionService) {}

  @Permissions('space|read')
  @Get()
  async list(@Param('spaceId') spaceId: string): Promise<IExternalConnectionDto[]> {
    return this.externalConnectionService.list(spaceId);
  }

  @Permissions('space|update')
  @Post()
  async create(
    @Param('spaceId') spaceId: string,
    @Body() body: ICreateExternalConnectionDto
  ): Promise<IExternalConnectionDto> {
    return this.externalConnectionService.create(spaceId, body);
  }

  @Permissions('space|update')
  @Post('test')
  async testConnection(@Body() body: ITestConnectionInput): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.externalConnectionService.testConnection(body);
  }

  @Permissions('space|update')
  @Delete(':connectionId')
  async remove(
    @Param('spaceId') spaceId: string,
    @Param('connectionId') connectionId: string
  ): Promise<void> {
    await this.externalConnectionService.remove(spaceId, connectionId);
  }
}
