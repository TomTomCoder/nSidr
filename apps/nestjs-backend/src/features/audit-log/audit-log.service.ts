import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { randomUUID } from 'crypto';

export interface AuditLogEntry {
  event: string;
  userId?: string;
  spaceId?: string;
  baseId?: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  payload?: Record<string, unknown>;
}

export interface AuditLogQuery {
  spaceId?: string;
  baseId?: string;
  userId?: string;
  event?: string;
  limit?: number;
  cursor?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async write(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prismaService.auditLog.create({
        data: {
          id: randomUUID(),
          event: entry.event,
          userId: entry.userId,
          spaceId: entry.spaceId,
          baseId: entry.baseId,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          ip: entry.ip,
          payload: (entry.payload ?? undefined) as object | undefined,
        },
      });
    } catch (err) {
      // ponytail: audit write must never break the user request
      this.logger.warn(`audit_log write failed: ${(err as Error).message}`);
    }
  }

  async list(q: AuditLogQuery) {
    const limit = Math.min(q.limit ?? 50, 200);
    return this.prismaService.auditLog.findMany({
      where: {
        spaceId: q.spaceId,
        baseId: q.baseId,
        userId: q.userId,
        event: q.event,
      },
      orderBy: { createdTime: 'desc' },
      take: limit,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
  }
}
