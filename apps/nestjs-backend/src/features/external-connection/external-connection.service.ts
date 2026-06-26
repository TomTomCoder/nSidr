import * as crypto from 'crypto';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { ExternalConnectionType } from '@teable/db-main-prisma';
import { PrismaService } from '@teable/db-main-prisma';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import { SsrfBlockedError, SsrfGuardService } from './ssrf-guard.service';

// Mirror the random-IV pattern from oauth-integration/token.service.ts
// to prevent IV-reuse attacks when many credentials share the same key.
const encryptionAlgorithm = 'aes-256-cbc';
const ivLength = 16;

// ── DTO shapes ────────────────────────────────────────────────────────────────

export interface IExternalConnectionConfig {
  host?: string;
  port?: number;
  apiKey?: string;
  url?: string;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  [key: string]: unknown;
}

export interface ICreateExternalConnectionDto {
  name: string;
  type: 'qdrant' | 'postgres';
  config: IExternalConnectionConfig;
}

export interface IExternalConnectionDto {
  id: string;
  spaceId: string;
  type: 'qdrant' | 'postgres';
  name: string;
  config: IExternalConnectionConfig;
  enabled: boolean;
  createdBy: string;
  createdTime: Date;
  lastModifiedTime: Date | null;
}

export interface ITestConnectionInput {
  type: 'qdrant' | 'postgres';
  config: IExternalConnectionConfig;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ExternalConnectionService {
  private readonly key: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ssrfGuard: SsrfGuardService,
    private readonly cls: ClsService<IClsStore>
  ) {
    const raw = process.env.INTEGRATION_SECRET_KEY;
    if (!raw || raw.length < 32) {
      throw new InternalServerErrorException(
        'INTEGRATION_SECRET_KEY must be at least 32 characters'
      );
    }
    this.key = Buffer.from(raw.slice(0, 32), 'utf8');
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(
    spaceId: string,
    dto: ICreateExternalConnectionDto
  ): Promise<IExternalConnectionDto> {
    const userId = this.cls.get('user.id');
    const host = this.extractHost(dto.config);

    // SSRF guard — MUST run before any persist or outbound call
    await this.assertSsrfSafe(host);

    const encryptedConfig = this.encryptConfig(dto.config);

    const record = await this.prisma.externalConnection.create({
      data: {
        spaceId,
        type: dto.type as ExternalConnectionType,
        name: dto.name,
        encryptedConfig,
        enabled: true,
        createdBy: userId,
      },
    });

    return this.toDto(record, dto.config);
  }

  async list(spaceId: string): Promise<IExternalConnectionDto[]> {
    const records = await this.prisma.externalConnection.findMany({
      where: { spaceId },
      orderBy: { createdTime: 'asc' },
    });

    return records.map((r) => {
      const config = this.decryptConfig(r.encryptedConfig);
      return this.toDto(r, config);
    });
  }

  async get(spaceId: string, id: string): Promise<IExternalConnectionDto> {
    const record = await this.prisma.externalConnection.findFirstOrThrow({
      where: { id, spaceId },
    });
    const config = this.decryptConfig(record.encryptedConfig);
    return this.toDto(record, config);
  }

  async remove(spaceId: string, id: string): Promise<void> {
    await this.prisma.externalConnection.delete({
      where: { id, spaceId },
    });
  }

  // ── Test connection ────────────────────────────────────────────────────────

  async testConnection(
    input: ITestConnectionInput
  ): Promise<{ success: boolean; message: string }> {
    const host = this.extractHost(input.config);
    await this.assertSsrfSafe(host);

    if (input.type === 'qdrant') {
      return this.testQdrant(input.config);
    } else if (input.type === 'postgres') {
      return this.testPostgres(input.config);
    }

    throw new BadRequestException(`Unsupported connection type: ${input.type}`);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Run the SSRF guard and convert SsrfBlockedError → BadRequestException.
   */
  private async assertSsrfSafe(host: string): Promise<void> {
    try {
      await this.ssrfGuard.assertHostAllowed(host);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  /**
   * Encrypt a config object with a random IV per call.
   * Format: "<iv-hex>:<ciphertext-hex>"
   */
  private encryptConfig(config: IExternalConnectionConfig): string {
    const iv = crypto.randomBytes(ivLength);
    const cipher = crypto.createCipheriv(encryptionAlgorithm, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(config), 'utf8'),
      cipher.final(),
    ]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypt a config from "<iv-hex>:<ciphertext-hex>" format.
   */
  private decryptConfig(ciphertext: string): IExternalConnectionConfig {
    const [ivHex, dataHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(encryptionAlgorithm, this.key, iv);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    return JSON.parse(plain) as IExternalConnectionConfig;
  }

  /**
   * Extract the host for SSRF checking.
   * Handles both explicit `host` field and `url` field (postgres DSN or Qdrant URL).
   */
  private extractHost(config: IExternalConnectionConfig): string {
    if (config.host) return config.host;
    if (config.url) {
      try {
        return new URL(config.url).hostname;
      } catch {
        return config.url;
      }
    }
    throw new BadRequestException('Connection config must include a host or url field');
  }

  /**
   * Map a Prisma record + decrypted config to the DTO shape.
   */
  private toDto(
    record: {
      id: string;
      spaceId: string;
      type: ExternalConnectionType;
      name: string;
      enabled: boolean;
      createdBy: string;
      createdTime: Date;
      lastModifiedTime: Date | null;
    },
    config: IExternalConnectionConfig
  ): IExternalConnectionDto {
    return {
      id: record.id,
      spaceId: record.spaceId,
      type: record.type as 'qdrant' | 'postgres',
      name: record.name,
      config,
      enabled: record.enabled,
      createdBy: record.createdBy,
      createdTime: record.createdTime,
      lastModifiedTime: record.lastModifiedTime,
    };
  }

  // ── Protocol-specific test implementations ────────────────────────────────

  private async testQdrant(
    config: IExternalConnectionConfig
  ): Promise<{ success: boolean; message: string }> {
    const base = config.url ?? `http://${config.host}:${config.port ?? 6333}`;
    const url = `${base.replace(/\/$/, '')}/`;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      headers['api-key'] = config.apiKey;
    }

    let resp: Response;
    try {
      resp = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(5000) });
    } catch (err) {
      return { success: false, message: `Qdrant unreachable: ${(err as Error).message}` };
    }

    if (!resp.ok && resp.status !== 200) {
      return { success: false, message: `Qdrant returned HTTP ${resp.status}` };
    }

    return { success: true, message: 'Qdrant connection successful' };
  }

  private async testPostgres(
    config: IExternalConnectionConfig
  ): Promise<{ success: boolean; message: string }> {
    // Dynamic import to avoid bringing pg into the module graph at boot
    const pg = await import('pg');
    const client = new pg.Client({
      host: config.host,
      port: config.port ?? 5432,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return { success: true, message: 'Postgres connection successful' };
    } catch (err) {
      await client.end().catch(() => void 0);
      return { success: false, message: `Postgres error: ${(err as Error).message}` };
    }
  }
}
