import type { OnApplicationBootstrap } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { DataPrismaService } from '@teable/db-data-prisma';
import { PrismaService } from '@teable/db-main-prisma';

/**
 * Validates database infrastructure at boot so problems surface as one loud,
 * actionable log line instead of HTTP 500s on the first user mutation.
 *
 * Discovered the hard way (2026-06-11): the app booted "successfully" with
 * pending migrations and a missing `__undo_log` table — every table creation
 * and record mutation then failed with an opaque 500.
 *
 * Set STARTUP_VALIDATION_STRICT=true to make these checks fatal.
 */
@Injectable()
export class StartupValidationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupValidationService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly dataPrismaService: DataPrismaService
  ) {}

  async onApplicationBootstrap() {
    const problems: string[] = [];

    try {
      problems.push(...(await this.checkMigrations()));
      problems.push(...(await this.checkUndoCaptureInfra()));
    } catch (e) {
      this.logger.warn(`Startup validation could not run: ${(e as Error).message}`);
      return;
    }

    if (!problems.length) {
      this.logger.log('Startup validation passed (migrations + undo-capture infra)');
      return;
    }

    for (const p of problems) {
      this.logger.error(`STARTUP VALIDATION: ${p}`);
    }
    if (process.env.STARTUP_VALIDATION_STRICT === 'true') {
      throw new Error(`Startup validation failed: ${problems.join(' | ')}`);
    }
  }

  private async checkMigrations(): Promise<string[]> {
    const rows = await this.prismaService.$queryRawUnsafe<
      { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]
    >(
      `SELECT migration_name, finished_at, rolled_back_at
       FROM _prisma_migrations
       WHERE finished_at IS NULL AND rolled_back_at IS NULL`
    );
    return rows.map(
      (r) =>
        `Migration "${r.migration_name}" is recorded as started but never finished — ` +
        `resolve it (prisma migrate resolve) and run migrate deploy.`
    );
  }

  private async checkUndoCaptureInfra(): Promise<string[]> {
    const problems: string[] = [];
    const [tableExists] = await this.dataPrismaService.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = '__undo_log'
       ) AS "exists"`
    );
    const [fnExists] = await this.dataPrismaService.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM pg_proc
         WHERE proname = '__teable_capture_undo_row' AND pronamespace = 'public'::regnamespace
       ) AS "exists"`
    );
    if (!tableExists?.exists || !fnExists?.exists) {
      problems.push(
        `Undo-capture infrastructure incomplete (table __undo_log: ${Boolean(
          tableExists?.exists
        )}, function __teable_capture_undo_row: ${Boolean(fnExists?.exists)}). ` +
          `Record mutations WILL fail with 500. Apply migration 20260406000000_add_v2_undo_capture_infra ` +
          `to the data database.`
      );
    }
    return problems;
  }
}
