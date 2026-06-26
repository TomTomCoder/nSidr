import { Module } from '@nestjs/common';
import { ExternalConnectionController } from './external-connection.controller';
import { ExternalConnectionService } from './external-connection.service';
import {
  defaultPrismaFactory,
  EXTERNAL_PRISMA_FACTORY,
  ExternalPgConnectorService,
} from './postgres/external-pg-connector.service';
import {
  PG_INTROSPECTION_CONNECTOR,
  PG_INTROSPECTION_TTL_MS,
  PgIntrospectionService,
} from './postgres/pg-introspection.service';
import { SsrfGuardService } from './ssrf-guard.service';
import { VirtualTableController } from './virtual-table/virtual-table.controller';
import {
  VIRTUAL_TABLE_CONNECTOR,
  VIRTUAL_TABLE_INTROSPECTION,
  VirtualTableService,
} from './virtual-table/virtual-table.service';

@Module({
  controllers: [ExternalConnectionController, VirtualTableController],
  providers: [
    ExternalConnectionService,
    SsrfGuardService,
    { provide: EXTERNAL_PRISMA_FACTORY, useValue: defaultPrismaFactory },
    ExternalPgConnectorService,
    {
      provide: PG_INTROSPECTION_CONNECTOR,
      useExisting: ExternalPgConnectorService,
    },
    { provide: PG_INTROSPECTION_TTL_MS, useValue: 5 * 60 * 1000 },
    PgIntrospectionService,
    {
      provide: VIRTUAL_TABLE_INTROSPECTION,
      useExisting: PgIntrospectionService,
    },
    {
      provide: VIRTUAL_TABLE_CONNECTOR,
      useExisting: ExternalPgConnectorService,
    },
    VirtualTableService,
  ],
  exports: [
    ExternalConnectionService,
    SsrfGuardService,
    ExternalPgConnectorService,
    PgIntrospectionService,
  ],
})
export class ExternalConnectionModule {}
