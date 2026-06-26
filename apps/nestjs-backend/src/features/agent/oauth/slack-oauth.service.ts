import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '@teable/db-main-prisma';
import { randomBytes } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { createCipheriv, createDecipheriv } from 'crypto';

interface SlackToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

@Injectable()
export class SlackOAuthService {
  private readonly logger = new Logger(SlackOAuthService.name);
  private readonly SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
  private readonly SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';

  constructor(
    private readonly httpService: HttpService,
    private readonly prismaService: PrismaService
  ) {}

  generateAuthorizationUrl(agentId: string): string {
    const clientId = process.env.OAUTH_SLACK_CLIENT_ID;
    if (!clientId) {
      throw new Error('OAUTH_SLACK_CLIENT_ID environment variable not set');
    }

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    const redirectUri = `${appBaseUrl}/api/agent/oauth/callback`;
    const state = Buffer.from(JSON.stringify({ agentId, provider: 'slack' })).toString('base64');
    const scopes = ['chat:write', 'channels:read', 'users:read', 'team:read', 'emoji:read'];

    const params = new URLSearchParams({
      client_id: clientId,
      scope: scopes.join(','),
      redirect_uri: redirectUri,
      state,
      user_scope: 'emoji:read',
    });

    return `${this.SLACK_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, agentId: string): Promise<SlackToken> {
    const clientId = process.env.OAUTH_SLACK_CLIENT_ID;
    const clientSecret = process.env.OAUTH_SLACK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Slack OAuth credentials not configured');
    }

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    const redirectUri = `${appBaseUrl}/api/agent/oauth/callback`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<any>(this.SLACK_TOKEN_URL, {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        })
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      const token: SlackToken = {
        accessToken: response.data.access_token,
      };

      // Store encrypted token
      const encryptedToken = this.encryptToken(token);
      await this.prismaService.agentConnection.upsert({
        where: { agentId_provider: { agentId, provider: 'slack' } },
        update: { encryptedToken, isEnabled: true },
        create: {
          agentId,
          provider: 'slack',
          encryptedToken,
          scopes: ['chat:write', 'channels:read', 'users:read', 'team:read'],
          isEnabled: true,
        },
      });

      this.logger.log(`Slack token exchanged and stored for agent ${agentId}`);
      return token;
    } catch (error) {
      this.logger.error(`Failed to exchange Slack code for token: ${(error as Error).message}`);
      throw error;
    }
  }

  async getValidToken(agentId: string, userId?: string): Promise<SlackToken> {
    let connection: { encryptedToken: string | null } | null = null;

    if (userId) {
      // Prefer user-scoped token when userId is provided
      connection = await this.prismaService.agentConnection.findFirst({
        where: { agentId, provider: 'slack', userId },
      });
    }

    if (!connection?.encryptedToken) {
      // Fall back to agent-level token (userId IS NULL row)
      connection = await this.prismaService.agentConnection.findUnique({
        where: { agentId_provider: { agentId, provider: 'slack' } },
      });
    }

    if (!connection?.encryptedToken) {
      throw new BadRequestException('Slack not connected for this agent');
    }

    return this.decryptToken(connection.encryptedToken);
  }

  async revokeAccess(agentId: string): Promise<void> {
    await this.prismaService.agentConnection.deleteMany({
      where: { agentId, provider: 'slack' },
    });
    this.logger.log(`Slack access revoked for agent ${agentId}`);
  }

  private encryptToken(token: SlackToken): string {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable not set');
    }

    const key = Buffer.from(encryptionKey, 'hex').slice(0, 32);
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const encrypted = cipher.update(JSON.stringify(token), 'utf-8', 'hex') + cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decryptToken(encryptedData: string): SlackToken {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable not set');
    }

    const [ivHex, encrypted] = encryptedData.split(':');
    const key = Buffer.from(encryptionKey, 'hex').slice(0, 32);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = decipher.update(encrypted, 'hex', 'utf-8') + decipher.final('utf-8');
    return JSON.parse(decrypted);
  }
}
