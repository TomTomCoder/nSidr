import { Controller, Get, Query, ForbiddenException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import { AuditLogService } from './audit-log.service';

@Controller('api/audit-log')
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly cls: ClsService<IClsStore>
  ) {}

  // ponytail: admin-only at the route level; per-space scoping can be added once a
  // dedicated permission action exists ("space|audit:read").
  @Get('list')
  async list(
    @Query('spaceId') spaceId?: string,
    @Query('baseId') baseId?: string,
    @Query('userId') userId?: string,
    @Query('event') event?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string
  ) {
    const user = this.cls.get('user');
    if (!user?.isAdmin) {
      throw new ForbiddenException('Audit log access requires admin');
    }
    return this.auditLogService.list({
      spaceId,
      baseId,
      userId,
      event,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }
}
