import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import type { Observable } from 'rxjs';
import type { IClsStore } from '../../types/cls';

/**
 * Activates the per-request field/table DataLoader cache for every request.
 *
 * Root cause this fixes: the loaders in `resource/*-loader.service.ts` only
 * consult their per-request cache when `dataLoaderCache.cacheKeys` contains the
 * matching key. Previously the ONLY thing populating that was the private
 * `enableTableDomainDataLoader()` in `table-domain-query.service.ts`, called
 * solely from `getTableDomainById`/`getTableDomainsByIds`. Any `field.load()`
 * that ran before — or on a path without — those calls bypassed the cache and
 * issued a fresh full `field.findMany(tableId)` (observed ~10–18% hit rate).
 *
 * Setting the keys at request entry makes the cache deterministic regardless of
 * call order. The `dataLoaderCache.disabled` opt-out (set by
 * `table-duplicate.service.ts`, which mutates fields mid-request and needs
 * fresh reads) is still respected.
 */
@Injectable()
export class DataLoaderCacheInterceptor implements NestInterceptor {
  // DataLoaderService only wires `field` + `table` (view loader is unused).
  private static readonly REQUIRED_KEYS = ['table', 'field'] as const;

  constructor(private readonly cls: ClsService<IClsStore>) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.cls.isActive() && !this.cls.get('dataLoaderCache.disabled')) {
      const cacheKeys = this.cls.get('dataLoaderCache.cacheKeys') ?? [];
      const missingKeys = DataLoaderCacheInterceptor.REQUIRED_KEYS.filter(
        (key) => !cacheKeys.includes(key)
      );
      if (missingKeys.length) {
        this.cls.set('dataLoaderCache.cacheKeys', [...cacheKeys, ...missingKeys]);
      }
    }
    return next.handle();
  }
}
