import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService, OAuthIntegrationProvider, OAuthIntegration } from '@teable/db-main-prisma';
import { OAuthIntegrationTokenService } from './token.service';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';

const PROVIDER_SCOPES: Record<OAuthIntegrationProvider, string[]> = {
  GMAIL: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  GCALENDAR: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  GDRIVE: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
  ],
  GCHAT: [
    'https://www.googleapis.com/auth/chat.messages',
    'https://www.googleapis.com/auth/chat.spaces.readonly',
  ],
  GMEET: [
    'https://www.googleapis.com/auth/meetings.space.created',
    'https://www.googleapis.com/auth/meetings.space.readonly',
  ],
  SLACK: ['channels:read', 'chat:write', 'search:read', 'users:read'],
};

const PROVIDER_CLIENT_IDS: Partial<Record<OAuthIntegrationProvider, string>> = {
  GMAIL: process.env.GOOGLE_CLIENT_ID ?? '',
  GCALENDAR: process.env.GOOGLE_CLIENT_ID ?? '',
  GDRIVE: process.env.GOOGLE_CLIENT_ID ?? '',
  GCHAT: process.env.GOOGLE_CLIENT_ID ?? '',
  GMEET: process.env.GOOGLE_CLIENT_ID ?? '',
  SLACK: process.env.SLACK_CLIENT_ID ?? '',
};

@Injectable()
export class OAuthIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: OAuthIntegrationTokenService
  ) {}

  getAuthorizationUrl(
    provider: OAuthIntegrationProvider,
    state: string,
    codeChallenge: string,
    redirectUri: string
  ): string {
    const isSlack = provider === 'SLACK';
    const baseUrl = isSlack ? SLACK_AUTH_URL : GOOGLE_AUTH_URL;
    const clientId = PROVIDER_CLIENT_IDS[provider] ?? '';
    const scopes = PROVIDER_SCOPES[provider];
    if (!scopes) {
      throw new Error(
        `Unsupported OAuth provider: ${provider}. Valid values: ${Object.keys(PROVIDER_SCOPES).join(', ')}`
      );
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(isSlack ? ',' : ' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline', // Google: get refresh token
      prompt: 'consent', // Google: always show consent to guarantee refresh token
    });
    return `${baseUrl}?${params.toString()}`;
  }

  async createFromOAuth(
    spaceId: string,
    userId: string,
    provider: OAuthIntegrationProvider,
    tokens: { accessToken: string; refreshToken?: string; expiresIn?: number; scopes: string[] }
  ): Promise<OAuthIntegration> {
    const expiry = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null;
    return this.prisma.oAuthIntegration.create({
      data: {
        spaceId,
        userId,
        provider,
        accessToken: this.tokenService.encryptToken(tokens.accessToken),
        refreshToken: tokens.refreshToken
          ? this.tokenService.encryptToken(tokens.refreshToken)
          : null,
        tokenExpiry: expiry,
        scopes: tokens.scopes,
        isActive: true,
      },
    });
  }

  async listForSpace(spaceId: string): Promise<OAuthIntegration[]> {
    return this.prisma.oAuthIntegration.findMany({
      where: { spaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string): Promise<OAuthIntegration> {
    const integration = await this.prisma.oAuthIntegration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`OAuthIntegration ${id} not found`);
    return integration;
  }

  async deactivate(id: string, callerId: string): Promise<void> {
    const integration = await this.prisma.oAuthIntegration.findUniqueOrThrow({
      where: { id },
    });
    // Only the user who created the integration can deactivate it
    if (integration.userId !== callerId) {
      throw new ForbiddenException('Not authorized to delete this integration');
    }
    await this.prisma.oAuthIntegration.update({ where: { id }, data: { isActive: false } });
  }
}
