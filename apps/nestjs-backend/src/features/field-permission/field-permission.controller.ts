import { Body, Controller, Delete, Get, Param, Put, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { ClsService } from 'nestjs-cls';
import { Permissions } from '../auth/decorators/permissions.decorator';
import type { IClsStore } from '../../types/cls';
import { FieldPermissionService } from './field-permission.service';
import type { FieldAction } from './field-permission.service';

@Controller('api/table/:tableId/field/:fieldId/permission')
export class FieldPermissionController {
  constructor(
    private readonly fieldPermissionService: FieldPermissionService,
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>
  ) {}

  @Get()
  @Permissions('field|read')
  async list(@Param('fieldId') fieldId: string) {
    return this.fieldPermissionService.list(fieldId);
  }

  @Put()
  @Permissions('table|update')
  async set(
    @Param('fieldId') fieldId: string,
    @Body() body: { principal: string; action: FieldAction; allowed: boolean }
  ) {
    if (!body?.principal || !body?.action || typeof body.allowed !== 'boolean') {
      throw new ForbiddenException('principal, action and allowed are required');
    }
    const userId = this.cls.get('user')?.id ?? 'unknown';
    return this.fieldPermissionService.set(
      fieldId,
      body.principal,
      body.action,
      body.allowed,
      userId
    );
  }

  @Delete(':id')
  @Permissions('table|update')
  async remove(@Param('id') id: string) {
    await this.fieldPermissionService.remove(id);
    return { success: true };
  }
}
