import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '@teable/db-main-prisma';
import { randomBytes } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { createCipheriv, createDecipheriv } from 'crypto';

interface GitHubToken {
  accessToken: string;
}

@Injectable()
export class GitHubOAuthService {
  private readonly logger = new Logger(GitHubOAuthService.name);
  private readonly GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
  private readonly GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

  constructor(
    private readonly httpService: HttpService,
    private readonly prismaService: PrismaService
  ) {}

  generateAuthorizationUrl(agentId: string): string {
    const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
    if (!clientId) {
      throw new Error('OAUTH_GITHUB_CLIENT_ID environment variable not set');
    }

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    const redirectUri = `${appBaseUrl}/api/agent/oauth/callback`;
    const state = Buffer.from(JSON.stringify({ agentId, provider: 'github' })).toString('base64');
    const scopes = ['repo', 'user:email', 'read:user'];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      state,
      allow_signup: 'true',
    });

    return `${this.GITHUB_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, agentId: string): Promise<GitHubToken> {
    const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
    const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth credentials not configured');
    }

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    const redirectUri = `${appBaseUrl}/api/agent/oauth/callback`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<any>(
          this.GITHUB_TOKEN_URL,
          {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
          },
          {
            headers: { Accept: 'application/json' },
          }
        )
      );

      if (response.data.error) {
        throw new Error(`GitHub API error: ${response.data.error}`);
      }

      const token: GitHubToken = {
        accessToken: response.data.access_token,
      };

      // Store encrypted token
      const encryptedToken = this.encryptToken(token);
      await this.prismaService.agentConnection.upsert({
        where: { agentId_provider: { agentId, provider: 'github' } },
        update: { encryptedToken, isEnabled: true },
        create: {
          agentId,
          provider: 'github',
          encryptedToken,
          scopes: ['repo', 'user:email', 'read:user'],
          isEnabled: true,
        },
      });

      this.logger.log(`GitHub token exchanged and stored for agent ${agentId}`);
      return token;
    } catch (error) {
      this.logger.error(`Failed to exchange GitHub code for token: ${(error as Error).message}`);
      throw error;
    }
  }

  async getValidToken(agentId: string, userId?: string): Promise<GitHubToken> {
    let connection: { encryptedToken: string | null } | null = null;

    if (userId) {
      // Prefer user-scoped token when userId is provided
      connection = await this.prismaService.agentConnection.findFirst({
        where: { agentId, provider: 'github', userId },
      });
    }

    if (!connection?.encryptedToken) {
      // Fall back to agent-level token (userId IS NULL row)
      connection = await this.prismaService.agentConnection.findUnique({
        where: { agentId_provider: { agentId, provider: 'github' } },
      });
    }

    if (!connection?.encryptedToken) {
      throw new BadRequestException('GitHub not connected for this agent');
    }

    return this.decryptToken(connection.encryptedToken);
  }

  async revokeAccess(agentId: string): Promise<void> {
    await this.prismaService.agentConnection.deleteMany({
      where: { agentId, provider: 'github' },
    });
    this.logger.log(`GitHub access revoked for agent ${agentId}`);
  }

  private encryptToken(token: GitHubToken): string {
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

  private decryptToken(encryptedData: string): GitHubToken {
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
