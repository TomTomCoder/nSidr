import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';

/**
 * Phase 4 — "memify": the agentic, self-improving pass over the memory graph. Runs
 * periodically (and on demand) to refine what ingestion produced:
 *
 *   1. Supersede duplicate entities — entities sharing a name (case-insensitive) in a space
 *      collapse to one survivor (highest version, newest). Losers get supersededById set, which
 *      removes them from entitySearch (`supersededById IS NULL`) without deleting provenance.
 *   2. Reweight relations — each relation's weight becomes the number of times the same
 *      (from, to, label) edge was asserted across documents, so corroborated relations rank
 *      higher than one-off mentions.
 *
 * Pure SQL, idempotent, space-scoped. No LLM — safe to run unattended.
 */
@Injectable()
export class MemifyService {
  private readonly logger = new Logger(MemifyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async memify(spaceId: string): Promise<{ superseded: number; reweighted: number }> {
    // 1. Collapse duplicate entities by lower(name) → survivor = max(version, createdAt).
    const superseded = await this.prisma.$executeRaw`
      WITH ranked AS (
        SELECT id,
          row_number() OVER (
            PARTITION BY "spaceId", lower(name) ORDER BY version DESC, "createdAt" DESC
          ) AS rn,
          first_value(id) OVER (
            PARTITION BY "spaceId", lower(name) ORDER BY version DESC, "createdAt" DESC
          ) AS survivor
        FROM "memory_entity"
        WHERE "spaceId" = ${spaceId} AND "supersededById" IS NULL
      )
      UPDATE "memory_entity" me
         SET "supersededById" = ranked.survivor
        FROM ranked
       WHERE me.id = ranked.id AND ranked.rn > 1
    `;

    // 2. Reweight relations by corroboration count over (from, to, label).
    const reweighted = await this.prisma.$executeRaw`
      UPDATE "memory_relation" mr
         SET weight = agg.cnt
        FROM (
          SELECT "fromEntityId", "toEntityId", label, count(*)::float AS cnt
            FROM "memory_relation"
           WHERE "spaceId" = ${spaceId}
           GROUP BY "fromEntityId", "toEntityId", label
        ) agg
       WHERE mr."spaceId" = ${spaceId}
         AND mr."fromEntityId" = agg."fromEntityId"
         AND mr."toEntityId" = agg."toEntityId"
         AND mr.label = agg.label
         AND mr.weight <> agg.cnt
    `;

    if (superseded > 0 || reweighted > 0) {
      this.logger.log(`memify(${spaceId}): superseded ${superseded}, reweighted ${reweighted}`);
    }
    return { superseded, reweighted };
  }

  /** Run memify for every space that has memory entities. Used by the scheduled job. */
  async memifyAllSpaces(): Promise<void> {
    const spaces = await this.prisma.$queryRaw<Array<{ spaceId: string }>>`
      SELECT DISTINCT "spaceId" FROM "memory_entity"
    `;
    for (const { spaceId } of spaces) {
      try {
        await this.memify(spaceId);
      } catch (err) {
        this.logger.warn(
          `memify failed for space ${spaceId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }
}
