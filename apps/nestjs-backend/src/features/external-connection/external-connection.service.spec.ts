import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@teable/db-main-prisma';
import { ClsService } from 'nestjs-cls';
import { ExternalConnectionService } from './external-connection.service';
import { SsrfBlockedError, SsrfGuardService } from './ssrf-guard.service';

/* eslint-disable sonarjs/no-duplicate-string */

// ── Minimal mock types ────────────────────────────────────────────────────────

const mockPrisma = {
  externalConnection: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
    delete: vi.fn(),
  },
};

const mockSsrfGuard = {
  assertHostAllowed: vi.fn(),
};

// ── Encryption helpers (mirror the service logic) ─────────────────────────────

const encryptionAlgorithm = 'aes-256-cbc';
const ivLength = 16;

function makeKey(): Buffer {
  const raw = 'testsecretkey1234567890123456789'; // 32+ chars
  return Buffer.from(raw.slice(0, 32), 'utf8');
}

function decryptConfig(ciphertext: string, key: Buffer): object {
  const [ivHex, dataHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(encryptionAlgorithm, key, iv);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  return JSON.parse(plain) as object;
}

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('ExternalConnectionService', () => {
  let service: ExternalConnectionService;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.INTEGRATION_SECRET_KEY = 'testsecretkey1234567890123456789';

    const mockCls = { get: vi.fn().mockReturnValue('user-1') };

    const module = await Test.createTestingModule({
      providers: [
        ExternalConnectionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SsrfGuardService, useValue: mockSsrfGuard },
        { provide: ClsService, useValue: mockCls },
      ],
    }).compile();

    service = module.get(ExternalConnectionService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.INTEGRATION_SECRET_KEY;
  });

  // ── create() ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls SSRF guard before persisting', async () => {
      mockSsrfGuard.assertHostAllowed.mockResolvedValue(undefined);
      mockPrisma.externalConnection.create.mockResolvedValue({ id: 'conn-1' });

      await service.create('space-1', {
        name: 'My Qdrant',
        type: 'qdrant',
        config: { host: 'qdrant.example.com', port: 6333, apiKey: 's3cr3t' },
      });

      expect(mockSsrfGuard.assertHostAllowed).toHaveBeenCalledWith('qdrant.example.com');
    });

    it('stores encrypted config (never plaintext) in the DB', async () => {
      mockSsrfGuard.assertHostAllowed.mockResolvedValue(undefined);
      mockPrisma.externalConnection.create.mockResolvedValue({ id: 'conn-1' });

      await service.create('space-1', {
        name: 'My Qdrant',
        type: 'qdrant',
        config: { host: 'qdrant.example.com', port: 6333, apiKey: 'supersecret' },
      });

      const createCall = mockPrisma.externalConnection.create.mock.calls[0][0];
      const stored = createCall.data.encryptedConfig as string;

      // Must not contain the plaintext API key
      expect(stored).not.toContain('supersecret');
      // Must be in iv:ciphertext hex format
      expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);

      // Must decrypt back to the original config
      const key = makeKey();
      const decoded = decryptConfig(stored, key) as { host: string; apiKey: string };
      expect(decoded.apiKey).toBe('supersecret');
      expect(decoded.host).toBe('qdrant.example.com');
    });

    it('uses a different IV per call (random IV)', async () => {
      mockSsrfGuard.assertHostAllowed.mockResolvedValue(undefined);
      mockPrisma.externalConnection.create.mockResolvedValue({ id: 'conn-1' });

      const config = { host: 'qdrant.example.com', port: 6333, apiKey: 'key' };

      await service.create('space-1', { name: 'A', type: 'qdrant', config });
      const cipher1 = mockPrisma.externalConnection.create.mock.calls[0][0].data
        .encryptedConfig as string;

      await service.create('space-1', { name: 'B', type: 'qdrant', config });
      const cipher2 = mockPrisma.externalConnection.create.mock.calls[1][0].data
        .encryptedConfig as string;

      // The IVs (first segment before ':') should differ
      const iv1 = cipher1.split(':')[0];
      const iv2 = cipher2.split(':')[0];
      expect(iv1).not.toBe(iv2);
    });

    it('surfaces SSRF rejection as BadRequestException (not 500)', async () => {
      mockSsrfGuard.assertHostAllowed.mockRejectedValue(
        new SsrfBlockedError('169.254.169.254', 'link-local address')
      );

      await expect(
        service.create('space-1', {
          name: 'Bad',
          type: 'qdrant',
          config: { host: '169.254.169.254', port: 6333 },
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('does NOT call prisma.create when SSRF check fails', async () => {
      mockSsrfGuard.assertHostAllowed.mockRejectedValue(
        new SsrfBlockedError('127.0.0.1', 'loopback')
      );

      await expect(
        service.create('space-1', {
          name: 'Bad',
          type: 'qdrant',
          config: { host: '127.0.0.1', port: 6333 },
        })
      ).rejects.toThrow();

      expect(mockPrisma.externalConnection.create).not.toHaveBeenCalled();
    });
  });

  // ── list() ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('returns connections with decrypted config', async () => {
      // Encrypt a config as the service would store it
      const key = makeKey();
      const iv = crypto.randomBytes(ivLength);
      const config = { host: 'qdrant.example.com', port: 6333, apiKey: 'mysecret' };
      const cipher = crypto.createCipheriv(encryptionAlgorithm, key, iv);
      const encrypted =
        iv.toString('hex') +
        ':' +
        Buffer.concat([cipher.update(JSON.stringify(config), 'utf8'), cipher.final()]).toString(
          'hex'
        );

      mockPrisma.externalConnection.findMany.mockResolvedValue([
        {
          id: 'conn-1',
          spaceId: 'space-1',
          type: 'qdrant',
          name: 'My Qdrant',
          encryptedConfig: encrypted,
          enabled: true,
          createdBy: 'user-1',
          createdTime: new Date(),
          lastModifiedTime: new Date(),
        },
      ]);

      const result = await service.list('space-1');
      expect(result).toHaveLength(1);
      expect(result[0].config.host).toBe('qdrant.example.com');
      expect(result[0].config.apiKey).toBe('mysecret');
      // The encryptedConfig field must NOT be in the response
      expect((result[0] as unknown as Record<string, unknown>).encryptedConfig).toBeUndefined();
    });
  });

  // ── remove() ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('deletes the connection by id+spaceId', async () => {
      mockPrisma.externalConnection.delete.mockResolvedValue({ id: 'conn-1' });

      await service.remove('space-1', 'conn-1');

      expect(mockPrisma.externalConnection.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'conn-1' }),
        })
      );
    });
  });

  // ── testConnection() ─────────────────────────────────────────────────────────

  describe('testConnection() SSRF guard', () => {
    it('calls SSRF guard before any outbound test connection', async () => {
      mockSsrfGuard.assertHostAllowed.mockRejectedValue(
        new SsrfBlockedError('127.0.0.1', 'loopback')
      );

      await expect(
        service.testConnection({ type: 'qdrant', config: { host: '127.0.0.1', port: 6333 } })
      ).rejects.toThrow(BadRequestException);

      // No real network call should happen
      expect(mockSsrfGuard.assertHostAllowed).toHaveBeenCalledWith('127.0.0.1');
    });
  });
});
