import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import type { IVirtualTable } from './virtual-table-mapper';
import { VirtualTableService } from './virtual-table.service';

/**
 * VirtualTableController
 *
 * Exposes READ-ONLY federated access to external Postgres tables.
 * All routes are scoped to space|read permission.
 * There are NO write endpoints (T-18-05-T).
 *
 * Routes:
 *   GET /api/space/:spaceId/external-connection/:connectionId/virtual-table
 *     -> list virtual tables
 *
 *   GET /api/space/:spaceId/external-connection/:connectionId/virtual-table/:schema/:tableName/rows
 *     -> paginated rows from one virtual table
 */
@Controller('api/space/:spaceId/external-connection/:connectionId/virtual-table')
export class VirtualTableController {
  constructor(private readonly virtualTableService: VirtualTableService) {}

  /**
   * List all virtual tables (introspected tables mapped to descriptors).
   * Read-only; scoped to space|read.
   */
  @Permissions('space|read')
  @Get()
  async list(@Param('connectionId') connectionId: string): Promise<IVirtualTable[]> {
    return this.virtualTableService.listVirtualTables(connectionId);
  }

  /**
   * Fetch a page of rows from an external table via query-through.
   * Read-only; scoped to space|read.
   *
   * @query page      1-based page number (default: 1)
   * @query pageSize  Number of rows per page (default: 20, max: 100)
   */
  @Permissions('space|read')
  @Get(':schema/:tableName/rows')
  async getRows(
    @Param('spaceId') spaceId: string,
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('tableName') tableName: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number
  ): Promise<Record<string, unknown>[]> {
    return this.virtualTableService.getRows(
      spaceId,
      connectionId,
      schema,
      tableName,
      page,
      pageSize
    );
  }
}
