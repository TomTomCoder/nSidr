/* eslint-disable sonarjs/no-duplicate-string */
import { BadRequestException } from '@nestjs/common';
import { vi } from 'vitest';
import { ExternalPgConnectorService } from './external-pg-connector.service';

// ---------------------------------------------------------------------------
// Minimal fake PrismaClient used for unit tests
// ---------------------------------------------------------------------------

interface IFakePrismaClient {
  $connect: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
}

function makeFakePrismaClient(connectError?: Error): IFakePrismaClient {
  return {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRawUnsafe: vi.fn().mockImplementation(() => {
      if (connectError) return Promise.reject(connectError);
      return Promise.resolve([{ '?column?': 1 }]);
    }),
  };
}

// ---------------------------------------------------------------------------
// Fake ExternalConnectionService
// ---------------------------------------------------------------------------

function makeConnectionService(config: Record<string, unknown> = {}) {
  return {
    get: vi.fn().mockResolvedValue({
      id: 'conn-1',
      spaceId: 'space-1',
      type: 'postgres',
      name: 'test-pg',
      config: {
        host: 'pg.example.com',
        port: 5432,
        database: 'extdb',
        user: 'readonly',
        password: 'secret',
        ...config,
      },
      enabled: true,
      createdBy: 'user-1',
      createdTime: new Date(),
      lastModifiedTime: null,
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExternalPgConnectorService', () => {
  let svc: ExternalPgConnectorService;
  let fakePrisma: IFakePrismaClient;

  beforeEach(() => {
    fakePrisma = makeFakePrismaClient();

    // Inject a factory that returns our fake PrismaClient
    const connSvc = makeConnectionService() as never;
    svc = new ExternalPgConnectorService(connSvc, () => fakePrisma as never);
  });

  afterEach(() => {
    // Ensure we always dispose clients to avoid leaks
    vi.restoreAllMocks();
  });

  // ── connect ────────────────────────────────────────────────────────────────

  it('connect() validates the connection with SELECT 1', async () => {
    await svc.connect('space-1', 'conn-1');

    expect(fakePrisma.$connect).toHaveBeenCalledTimes(1);
    expect(fakePrisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
  });

  it('connect() reuses the same client on a second call (pooling)', async () => {
    await svc.connect('space-1', 'conn-1');
    await svc.connect('space-1', 'conn-1');

    // Client factory should only be called once
    expect(fakePrisma.$connect).toHaveBeenCalledTimes(1);
  });

  it('connect() throws BadRequestException when SELECT 1 fails', async () => {
    const badPrisma = makeFakePrismaClient(new Error('connection refused'));
    const connSvc = makeConnectionService() as never;
    const badSvc = new ExternalPgConnectorService(connSvc, () => badPrisma as never);

    await expect(badSvc.connect('space-1', 'conn-1')).rejects.toThrow(BadRequestException);
  });

  // ── query ──────────────────────────────────────────────────────────────────

  it('query() passes SELECT through to the client', async () => {
    await svc.connect('space-1', 'conn-1');
    fakePrisma.$queryRawUnsafe.mockClear();

    await svc.query('conn-1', 'SELECT id FROM users');

    expect(fakePrisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT id FROM users');
  });

  it('query() rejects INSERT (write attempt blocked by statement filter)', async () => {
    await svc.connect('space-1', 'conn-1');

    await expect(svc.query('conn-1', "INSERT INTO users (name) VALUES ('evil')")).rejects.toThrow(
      /read-only/i
    );

    // The underlying client must NOT have been called
    const callsAfterConnect = fakePrisma.$queryRawUnsafe.mock.calls.filter(
      (c) => c[0] !== 'SELECT 1'
    );
    expect(callsAfterConnect).toHaveLength(0);
  });

  it('query() rejects multi-statement SQL', async () => {
    await svc.connect('space-1', 'conn-1');

    await expect(svc.query('conn-1', 'SELECT 1; DROP TABLE users')).rejects.toThrow(
      /read-only|multi-statement/i
    );
  });

  it('query() rejects CTE ending in DELETE', async () => {
    await svc.connect('space-1', 'conn-1');

    await expect(
      svc.query(
        'conn-1',
        'WITH x AS (SELECT id FROM t) DELETE FROM t WHERE id IN (SELECT id FROM x)'
      )
    ).rejects.toThrow(/read-only/i);
  });

  // ── dispose ────────────────────────────────────────────────────────────────

  it('dispose() disconnects the client for the given connectionId', async () => {
    await svc.connect('space-1', 'conn-1');
    await svc.dispose('conn-1');

    expect(fakePrisma.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('dispose() is idempotent (no error if already disconnected)', async () => {
    await svc.dispose('conn-1'); // no connection opened
    // should not throw
  });

  // ── DSN building ──────────────────────────────────────────────────────────

  it('buildDsn() constructs a postgresql URL from config fields', () => {
    // Access via the static-ish helper exposed for testing
    const dsn = ExternalPgConnectorService.buildDsn({
      host: 'pg.example.com',
      port: 5432,
      database: 'mydb',
      user: 'ro',
      password: 'pass',
    });
    expect(dsn).toMatch(/^postgresql:\/\//);
    expect(dsn).toContain('pg.example.com');
    expect(dsn).toContain('mydb');
    expect(dsn).toContain('ro');
  });

  it('buildDsn() URL-encodes special characters in password', () => {
    const dsn = ExternalPgConnectorService.buildDsn({
      host: 'h',
      port: 5432,
      database: 'db',
      user: 'u',
      password: 'p@ss!word',
    });
    // '@' and '!' must be percent-encoded
    expect(dsn).not.toContain(':p@ss!word@');
    expect(dsn).toContain('p%40ss');
  });
});
