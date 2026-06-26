import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { CoreEvent } from '../../event-emitter/events/core-event';
import { Events } from '../../event-emitter/events/event.enum';
import { AuditLogService } from './audit-log.service';

type AnyTrackedEvent = CoreEvent<
  Record<string, unknown> & {
    spaceId?: string;
    baseId?: string;
    id?: string;
    tableId?: string;
  }
>;

@Injectable()
export class AuditLogListener {
  constructor(private readonly auditLogService: AuditLogService) {}

  @OnEvent(Events.SPACE_CREATE, { async: true })
  @OnEvent(Events.SPACE_UPDATE, { async: true })
  @OnEvent(Events.SPACE_DELETE, { async: true })
  @OnEvent(Events.BASE_CREATE, { async: true })
  @OnEvent(Events.BASE_UPDATE, { async: true })
  @OnEvent(Events.BASE_DELETE, { async: true })
  @OnEvent(Events.BASE_PERMISSION_UPDATE, { async: true })
  @OnEvent(Events.BASE_NODE_CREATE, { async: true })
  @OnEvent(Events.BASE_NODE_UPDATE, { async: true })
  @OnEvent(Events.BASE_NODE_DELETE, { async: true })
  @OnEvent(Events.TABLE_CREATE, { async: true })
  @OnEvent(Events.TABLE_UPDATE, { async: true })
  @OnEvent(Events.TABLE_DELETE, { async: true })
  async onTrackedEvent(event: AnyTrackedEvent) {
    const baseId = event.payload?.baseId;
    const resourceId =
      (event.payload?.id as string | undefined) || (event.payload?.tableId as string | undefined);

    await this.auditLogService.write({
      event: event.name,
      userId: event.context?.user?.id,
      spaceId: event.payload?.spaceId,
      baseId,
      resourceType: String(event.name).split('.')[0],
      resourceId,
    });
  }
}
