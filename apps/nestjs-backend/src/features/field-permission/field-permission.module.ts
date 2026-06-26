import { Module } from '@nestjs/common';
import { PrismaModule } from '@teable/db-main-prisma';
import { PermissionModule } from '../auth/permission.module';
import { FieldPermissionController } from './field-permission.controller';
import { FieldPermissionService } from './field-permission.service';

@Module({
  imports: [PrismaModule, PermissionModule],
  controllers: [FieldPermissionController],
  providers: [FieldPermissionService],
  exports: [FieldPermissionService],
})
export class FieldPermissionModule {}
