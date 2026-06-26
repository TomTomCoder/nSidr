import { Module } from '@nestjs/common';
import { PrismaModule } from '@teable/db-main-prisma';
import { AuditLogController } from './audit-log.controller';
import { AuditLogListener } from './audit-log.listener';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditLogListener],
  exports: [AuditLogService],
})
export class AuditLogModule {}
