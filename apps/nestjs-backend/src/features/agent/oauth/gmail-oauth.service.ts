import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { PrismaService } from '@teable/db-main-prisma';

export interface GmailToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export interface GmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Gmail OAuth 2.0 Service
 * Handles complete OAuth flow: authorization -> token exchange -> token refresh
 * Stores tokens encrypted in database.
 *
 * Template for implementing other OAuth providers (Slack, GitHub, etc.)
 */
@Injectable()
export class GmailOAuthService {
  private readonly logger = new Logger(GmailOAuthService.name);
  private readonly config: GmailOAuthConfig;

  constructor(
    private readonly httpService: HttpService,
    private readonly prismaService: PrismaService
  ) {
    this.config = {
      clientId: process.env.OAUTH_GMAIL_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GMAIL_CLIENT_SECRET || '',
      redirectUri: `${process.env.APP_BASE_URL || 'http://localhost:3001'}/api/agent/oauth/callback`,
    };
  }

  /**
   * Generate authorization URL for user to visit
   * User will be prompted to grant permissions and redirected back with code
   */
  generateAuthorizationUrl(agentId: string, scopes: string[] = []): string {
    const defaultScopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ];

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: [...defaultScopes, ...scopes].join(' '),
      access_type: 'offline', // Request refresh token
      state: Buffer.from(JSON.stringify({ agentId, provider: 'gmail' })).toString('base64'),
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * Called after user grants permission and is redirected back
   */
  async exchangeCodeForToken(code: string, agentId: string): Promise<GmailToken> {
    try {
      this.logger.log(`Exchanging code for token (agentId: ${agentId})`);

      const response = await firstValueFrom(
        this.httpService.post<GmailToken>('https://oauth2.googleapis.com/token', {
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
        })
      );

      const token = response.data;
      this.logger.log(`Token exchange successful, expires in ${token.expires_in}s`);

      // Store encrypted token in database
      const encryptedToken = this.encryptToken(token);
      await this.prismaService.agentConnection.upsert({
        where: { agentId_provider: { agentId, provider: 'gmail' } },
        update: {
          encryptedToken,
          isEnabled: true,
          scopes: ['gmail.readonly', 'gmail.send'],
        },
        create: {
          agentId,
          provider: 'gmail',
          encryptedToken,
          scopes: ['gmail.readonly', 'gmail.send'],
          isEnabled: true,
        },
      });

      return token;
    } catch (error) {
      this.logger.error(`Token exchange failed: ${(error as Error).message}`);
      throw new Error(`Gmail OAuth token exchange failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get valid access token (refresh if expired)
   * When userId is provided, tries the user-scoped row first and falls back
   * to the agent-level row (userId IS NULL) for backward compatibility.
   * When userId is absent, uses the legacy agent-level lookup only.
   */
  async getValidToken(agentId: string, userId?: string): Promise<GmailToken> {
    let connection: { encryptedToken: string | null } | null = null;

    if (userId) {
      // Prefer user-scoped token when userId is provided
      connection = await this.prismaService.agentConnection.findFirst({
        where: { agentId, provider: 'gmail', userId },
      });
    }

    if (!connection || !connection.encryptedToken) {
      // Fall back to agent-level token (userId IS NULL row)
      connection = await this.prismaService.agentConnection.findUnique({
        where: { agentId_provider: { agentId, provider: 'gmail' } },
      });
    }

    if (!connection || !connection.encryptedToken) {
      throw new Error(`No Gmail connection found for agent ${agentId}`);
    }

    const token = this.decryptToken(connection.encryptedToken);

    // Check if token is expired (refresh 5 minutes early for safety)
    const expiresAt = token.expiresAt || Date.now() + token.expires_in * 1000;
    if (Date.now() + 5 * 60 * 1000 > expiresAt) {
      this.logger.log(`Token expired, refreshing (agentId: ${agentId})`);
      return this.refreshToken(agentId, token.refresh_token);
    }

    return token as GmailToken;
  }

  /**
   * Refresh access token using refresh token
   * Google provides refresh tokens that don't expire (unless revoked)
   */
  async refreshToken(agentId: string, refreshToken?: string): Promise<GmailToken> {
    try {
      const connection = await this.prismaService.agentConnection.findUnique({
        where: { agentId_provider: { agentId, provider: 'gmail' } },
      });

      if (!connection || !connection.encryptedToken) {
        throw new Error(`No Gmail connection found for agent ${agentId}`);
      }

      const currentToken = this.decryptToken(connection.encryptedToken);
      const tokenToUse = refreshToken || (currentToken as any).refresh_token;

      if (!tokenToUse) {
        throw new Error('No refresh token available');
      }

      this.logger.log(`Refreshing token for agent ${agentId}`);

      const response = await firstValueFrom(
        this.httpService.post<GmailToken>('https://oauth2.googleapis.com/token', {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: tokenToUse,
          grant_type: 'refresh_token',
        })
      );

      const newToken: any = {
        ...response.data,
        refresh_token: tokenToUse, // Google doesn't return refresh token on refresh
        expiresAt: Date.now() + response.data.expires_in * 1000,
      };

      // Store updated token
      const encryptedToken = this.encryptToken(newToken);
      await this.prismaService.agentConnection.update({
        where: { agentId_provider: { agentId, provider: 'gmail' } },
        data: { encryptedToken },
      });

      this.logger.log(`Token refreshed successfully for agent ${agentId}`);
      return newToken;
    } catch (error) {
      this.logger.error(`Token refresh failed: ${(error as Error).message}`);
      throw new Error(`Gmail token refresh failed: ${(error as Error).message}`);
    }
  }

  /**
   * Revoke access to Gmail (disconnect agent)
   */
  async revokeAccess(agentId: string): Promise<void> {
    try {
      const connection = await this.prismaService.agentConnection.findUnique({
        where: { agentId_provider: { agentId, provider: 'gmail' } },
      });

      if (!connection || !connection.encryptedToken) {
        return;
      }

      const token = this.decryptToken(connection.encryptedToken);

      // Revoke token with Google
      await firstValueFrom(
        this.httpService.get(
          `https://oauth2.googleapis.com/revoke?token=${(token as any).access_token}`
        )
      );

      // Remove from database
      await this.prismaService.agentConnection.update({
        where: { agentId_provider: { agentId, provider: 'gmail' } },
        data: { isEnabled: false, encryptedToken: null },
      });

      this.logger.log(`Gmail access revoked for agent ${agentId}`);
    } catch (error) {
      this.logger.error(`Revoke failed: ${(error as Error).message}`);
    }
  }

  /**
   * Encrypt token for secure storage
   * Uses AES-256-CBC with random IV
   */
  private encryptToken(token: any): string {
    const key = Buffer.from(
      process.env.ENCRYPTION_KEY || randomBytes(32).toString('hex'),
      'hex'
    ).slice(0, 32);
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);

    const json = JSON.stringify({
      ...token,
      expiresAt: Date.now() + token.expires_in * 1000,
    });

    return iv.toString('hex') + ':' + cipher.update(json, 'utf8', 'hex') + cipher.final('hex');
  }

  /**
   * Decrypt token from storage
   */
  private decryptToken(encrypted: string): any {
    const key = Buffer.from(
      process.env.ENCRYPTION_KEY || randomBytes(32).toString('hex'),
      'hex'
    ).slice(0, 32);
    const [iv, ciphertext] = encrypted.split(':');
    const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));

    const decrypted = decipher.update(ciphertext, 'hex', 'utf8') + decipher.final('utf8');
    return JSON.parse(decrypted);
  }
}
