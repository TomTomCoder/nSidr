import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService, OAuthIntegration } from '@teable/db-main-prisma';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

@Injectable()
export class OAuthIntegrationTokenService {
  private readonly key: Buffer;

  constructor(private readonly prisma: PrismaService) {
    const raw = process.env.INTEGRATION_SECRET_KEY;
    if (!raw || raw.length < 32) {
      throw new InternalServerErrorException(
        'INTEGRATION_SECRET_KEY must be at least 32 characters'
      );
    }
    this.key = Buffer.from(raw.slice(0, 32), 'utf8');
  }

  encryptToken(token: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decryptToken(encrypted: string): string {
    const [ivHex, dataHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  isTokenExpired(expiry: Date | null): boolean {
    if (!expiry) return false;
    return expiry <= new Date();
  }

  async refreshAccessToken(integration: OAuthIntegration): Promise<OAuthIntegration> {
    if (!integration.refreshToken) {
      throw new InternalServerErrorException('No refresh token available for integration');
    }
    const plainRefresh = this.decryptToken(integration.refreshToken);
    const providerRefreshUrls: Record<string, string> = {
      GMAIL: 'https://oauth2.googleapis.com/token',
      GCALENDAR: 'https://oauth2.googleapis.com/token',
      GDRIVE: 'https://oauth2.googleapis.com/token',
      GCHAT: 'https://oauth2.googleapis.com/token',
      GMEET: 'https://oauth2.googleapis.com/token',
      SLACK: 'https://slack.com/api/oauth.v2.access',
    };
    const tokenUrl = providerRefreshUrls[integration.provider];
    const params = new URLSearchParams({
      client_id: process.env[`${integration.provider}_CLIENT_ID`] ?? '',
      client_secret: process.env[`${integration.provider}_CLIENT_SECRET`] ?? '',
      refresh_token: plainRefresh,
      grant_type: 'refresh_token',
    });
    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!resp.ok) {
      throw new InternalServerErrorException(`Token refresh failed for ${integration.provider}`);
    }
    const data = (await resp.json()) as { access_token: string; expires_in?: number };
    const newExpiry = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
    return this.prisma.oAuthIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: this.encryptToken(data.access_token),
        tokenExpiry: newExpiry,
      },
    });
  }
}
