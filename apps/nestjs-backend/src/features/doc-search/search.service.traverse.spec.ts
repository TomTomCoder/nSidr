import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { DocSearchService } from './search.service';

/**
 * KG-03 / D-21-03 traverseLinks coverage.
 *
 * We don't run real Postgres here — the recursive CTE itself is exercised
 * in the live UAT (21-07). These tests assert:
 *  - hybridSearch routing logic
 *  - SQL shape (CTE present when expected; absent when not)
 *  - Parameterisation (Prisma.Sql.values is a flat parameter array; no string interpolation of docIds)
 *  - maxHops clamp validation
 *  - Backward-compat with Phase 17.1/17.5 callers
 *
 * Prisma.Sql tagged-template result exposes:
 *   - `.text`  → '$1, $2, ...' placeholders
 *   - `.sql`   → '?, ?, ...' placeholders
 *   - `.strings` → the raw template segments
 *   - `.values`  → FLAT parameter array (nested Prisma.sql/Prisma.join is flattened)
 * (See `Prisma.sql` docs — `Sql.values` is always a flat array of primitives.)
 */

type SqlLike = {
  sql?: string;
  text?: string;
  strings: readonly string[];
  values: readonly unknown[];
};

function sqlText(sql: SqlLike | readonly string[]): string {
  // Prisma `$queryRaw` invoked as a tagged template passes a
  // TemplateStringsArray as the first arg. Handle both shapes.
  if (Array.isArray(sql)) return (sql as readonly string[]).join('?');
  const obj = sql as SqlLike;
  return obj.sql ?? obj.text ?? obj.strings?.join('?') ?? '';
}
function isCteQuery(sql: SqlLike | readonly string[]): boolean {
  return sqlText(sql).includes('WITH RECURSIVE neighbors');
}
function isChunkSearch(sql: SqlLike | readonly string[]): boolean {
  return sqlText(sql).includes('FROM "doc_chunk"');
}

interface Fixture {
  /** Adjacency for outgoing links: from → [to, to, ...] */
  links: Record<string, string[]>;
}

function expandFixture(fixture: Fixture, start: string[], maxHops: number): string[] {
  const out = new Set<string>(start);
  const queue: Array<{ id: string; depth: number }> = start.map((id) => ({ id, depth: 0 }));
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxHops) continue;
    const outs = fixture.links[id] ?? [];
    for (const to of outs) {
      if (!out.has(to)) {
        out.add(to);
        queue.push({ id: to, depth: depth + 1 });
      }
    }
    for (const [from, tos] of Object.entries(fixture.links)) {
      if (tos.includes(id) && !out.has(from)) {
        out.add(from);
        queue.push({ id: from, depth: depth + 1 });
      }
    }
  }
  return Array.from(out);
}

function makeSvc(fixture: Fixture) {
  const cteCalls: SqlLike[] = [];
  const chunkCalls: SqlLike[] = [];

  // Flatten any nested Prisma.Sql values (produced by Prisma.join) into the
  // underlying primitive values. The traverse CTE uses Prisma.join(docIds),
  // which wraps the docIds in a Prisma.Sql whose `values` holds the real ids.
  const flattenValues = (values: readonly unknown[]): unknown[] => {
    const out: unknown[] = [];
    for (const v of values) {
      const maybeSql = v as { values?: readonly unknown[]; strings?: readonly string[] };
      if (
        v !== null &&
        typeof v === 'object' &&
        Array.isArray(maybeSql.values) &&
        Array.isArray(maybeSql.strings)
      ) {
        out.push(...flattenValues(maybeSql.values));
      } else {
        out.push(v);
      }
    }
    return out;
  };

  // Prisma `$queryRaw` is invoked as a tagged template, so the mock receives
  // (strings: TemplateStringsArray, ...values: unknown[]). Normalize both
  // representations into a single SqlLike record used by the assertions.
  const $queryRaw = vi.fn(async (...args: unknown[]) => {
    const first = args[0];
    let sqlLike: SqlLike;
    if (Array.isArray(first) && typeof (first as readonly string[])[0] === 'string') {
      const strings = first as readonly string[];
      const rawValues = args.slice(1);
      const values = flattenValues(rawValues);
      sqlLike = { strings, values, sql: strings.join('?'), text: strings.join('?') };
    } else {
      const sqlObj = first as SqlLike;
      sqlLike = { ...sqlObj, values: flattenValues(sqlObj.values ?? []) };
    }
    if (isCteQuery(sqlLike)) {
      cteCalls.push(sqlLike);
      // values layout for our CTE (after flattening Prisma.join):
      //   [docId1, docId2, ..., spaceId, maxHops, maxHops]
      const values = sqlLike.values;
      const maxHops = values[values.length - 1] as number;
      // The last value is maxHops, second-to-last is also maxHops, third-to-last is spaceId.
      const docIds = values.slice(0, values.length - 3) as string[];
      return expandFixture(fixture, docIds, maxHops).map((id) => ({ id }));
    }
    if (isChunkSearch(sqlLike)) {
      chunkCalls.push(sqlLike);
      return [];
    }
    return [];
  });

  const prismaMock = { $queryRaw } as never;
  const embeddingService = { generateEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]) } as never;
  const svc = new DocSearchService(prismaMock, embeddingService);
  return { svc, cteCalls, chunkCalls };
}

function extractStringValues(values: readonly unknown[], pattern: RegExp): string[] {
  return values.filter((v) => typeof v === 'string' && pattern.test(v as string)) as string[];
}

describe('DocSearchService.hybridSearch — traverseLinks (KG-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('backward-compat: no options → no CTE fired', async () => {
    const { svc, cteCalls } = makeSvc({ links: {} });
    await svc.hybridSearch('space-A', 'q', 10, { docIds: ['A'] });
    expect(cteCalls.length).toBe(0);
  });

  it('traverseLinks=false → no CTE fired', async () => {
    const { svc, cteCalls } = makeSvc({ links: {} });
    await svc.hybridSearch('space-A', 'q', 10, { docIds: ['A'] }, { traverseLinks: false });
    expect(cteCalls.length).toBe(0);
  });

  it('traverseLinks=true with no scope.docIds → no CTE fired', async () => {
    const { svc, cteCalls } = makeSvc({ links: {} });
    await svc.hybridSearch('space-A', 'q', 10, undefined, { traverseLinks: true });
    expect(cteCalls.length).toBe(0);
  });

  it('maxHops=1, fixture {A→B, B→C}: from [A] returns [A,B] (NOT C)', async () => {
    const { svc, cteCalls, chunkCalls } = makeSvc({ links: { A: ['B'], B: ['C'] } });
    await svc.hybridSearch(
      'space-A',
      'q',
      10,
      { docIds: ['A'] },
      { traverseLinks: true, maxHops: 1 }
    );
    expect(cteCalls.length).toBe(1);
    expect(chunkCalls.length).toBeGreaterThan(0);
    const ids = extractStringValues(chunkCalls[0]!.values, /^[A-Z]$/);
    expect(new Set(ids)).toEqual(new Set(['A', 'B']));
  });

  it('maxHops=2, same fixture: from [A] returns [A,B,C]', async () => {
    const { svc, cteCalls, chunkCalls } = makeSvc({ links: { A: ['B'], B: ['C'] } });
    await svc.hybridSearch(
      'space-A',
      'q',
      10,
      { docIds: ['A'] },
      { traverseLinks: true, maxHops: 2 }
    );
    expect(cteCalls.length).toBe(1);
    const ids = extractStringValues(chunkCalls[0]!.values, /^[A-Z]$/);
    expect(new Set(ids)).toEqual(new Set(['A', 'B', 'C']));
  });

  it('maxHops=0 → BadRequestException', async () => {
    const { svc } = makeSvc({ links: {} });
    await expect(
      svc.hybridSearch('space-A', 'q', 10, { docIds: ['A'] }, { traverseLinks: true, maxHops: 0 })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maxHops=4 → BadRequestException', async () => {
    const { svc } = makeSvc({ links: {} });
    await expect(
      svc.hybridSearch('space-A', 'q', 10, { docIds: ['A'] }, { traverseLinks: true, maxHops: 4 })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bidirectional: fixture {A→B}, expand from [B], maxHops=1 → [A,B]', async () => {
    const { svc, chunkCalls } = makeSvc({ links: { A: ['B'] } });
    await svc.hybridSearch(
      'space-A',
      'q',
      10,
      { docIds: ['B'] },
      { traverseLinks: true, maxHops: 1 }
    );
    const ids = extractStringValues(chunkCalls[0]!.values, /^[A-Z]$/);
    expect(new Set(ids)).toEqual(new Set(['A', 'B']));
  });

  it('CTE SQL uses parameterized placeholders (no string-interpolated docIds)', async () => {
    const { svc, cteCalls } = makeSvc({ links: {} });
    await svc.hybridSearch(
      'space-A',
      'q',
      10,
      { docIds: ['DOC-XYZ'] },
      { traverseLinks: true, maxHops: 1 }
    );
    expect(cteCalls.length).toBe(1);
    // SQL text should NOT contain the raw docId — Prisma uses ? or $1 placeholders.
    expect(sqlText(cteCalls[0]!)).not.toContain('DOC-XYZ');
    // And `.values` should contain the docId as a parameter.
    expect(cteCalls[0]!.values).toContain('DOC-XYZ');
  });
});
