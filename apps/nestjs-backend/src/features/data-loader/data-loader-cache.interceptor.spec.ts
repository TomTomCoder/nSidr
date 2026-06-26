import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataLoaderCacheInterceptor } from './data-loader-cache.interceptor';

/**
 * Spec for DataLoaderCacheInterceptor.
 *
 * Contract: at request entry, register ['table','field'] in
 * `dataLoaderCache.cacheKeys` so the per-request loader cache is active
 * regardless of call order — UNLESS CLS is inactive or the cache was explicitly
 * disabled (table-duplicate opt-out). Must merge (never clobber existing keys)
 * and must always forward to next.handle().
 */
const buildCls = (store: Record<string, unknown>) => {
  const cls = {
    isActive: vi.fn(() => store.__active !== false),
    get: vi.fn((key: string) => store[key]),
    set: vi.fn((key: string, value: unknown) => {
      store[key] = value;
    }),
  };
  return cls;
};

const run = (cls: ReturnType<typeof buildCls>) => {
  const interceptor = new DataLoaderCacheInterceptor(cls as never);
  const next: CallHandler = { handle: vi.fn(() => of('downstream')) };
  const result = interceptor.intercept({} as ExecutionContext, next);
  return { result, next };
};

describe('DataLoaderCacheInterceptor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets ["table","field"] when CLS is active and not disabled', () => {
    const store: Record<string, unknown> = {};
    const cls = buildCls(store);
    run(cls);
    expect(cls.set).toHaveBeenCalledWith('dataLoaderCache.cacheKeys', ['table', 'field']);
  });

  it('does NOT touch cacheKeys when dataLoaderCache.disabled is true', () => {
    const store: Record<string, unknown> = { 'dataLoaderCache.disabled': true };
    const cls = buildCls(store);
    run(cls);
    expect(cls.set).not.toHaveBeenCalled();
  });

  it('does NOT touch cacheKeys when CLS is inactive', () => {
    const store: Record<string, unknown> = { __active: false };
    const cls = buildCls(store);
    run(cls);
    expect(cls.set).not.toHaveBeenCalled();
  });

  it('merges with existing keys without duplicating (e.g. "view" already present)', () => {
    const store: Record<string, unknown> = { 'dataLoaderCache.cacheKeys': ['view', 'field'] };
    const cls = buildCls(store);
    run(cls);
    expect(cls.set).toHaveBeenCalledWith('dataLoaderCache.cacheKeys', ['view', 'field', 'table']);
  });

  it('is idempotent — no write when table+field already registered', () => {
    const store: Record<string, unknown> = { 'dataLoaderCache.cacheKeys': ['table', 'field'] };
    const cls = buildCls(store);
    run(cls);
    expect(cls.set).not.toHaveBeenCalled();
  });

  it('always forwards to next.handle()', () => {
    const store: Record<string, unknown> = {};
    const { next } = run(buildCls(store));
    expect(next.handle).toHaveBeenCalledTimes(1);
  });
});
