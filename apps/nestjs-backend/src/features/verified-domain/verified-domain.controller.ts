import { Body, Controller, Delete, Get, Param, Post, BadRequestException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Permissions } from '../auth/decorators/permissions.decorator';
import type { IClsStore } from '../../types/cls';
import { VerifiedDomainService } from './verified-domain.service';

@Controller('api/space/:spaceId/verified-domain')
export class VerifiedDomainController {
  constructor(
    private readonly verifiedDomainService: VerifiedDomainService,
    private readonly cls: ClsService<IClsStore>
  ) {}

  @Get()
  @Permissions('space|read')
  async list(@Param('spaceId') spaceId: string) {
    return this.verifiedDomainService.list(spaceId);
  }

  @Post()
  @Permissions('space|update')
  async create(@Param('spaceId') spaceId: string, @Body() body: { domain?: string }) {
    if (!body?.domain) throw new BadRequestException('domain is required');
    const userId = this.cls.get('user')?.id ?? 'unknown';
    return this.verifiedDomainService.create(spaceId, body.domain, userId);
  }

  @Post(':id/verify')
  @Permissions('space|update')
  async verify(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return this.verifiedDomainService.verify(spaceId, id);
  }

  @Delete(':id')
  @Permissions('space|update')
  async remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    await this.verifiedDomainService.remove(spaceId, id);
    return { success: true };
  }
}
