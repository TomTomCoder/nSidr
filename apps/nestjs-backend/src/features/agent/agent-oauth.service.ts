import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { PrismaService } from '@teable/db-main-prisma';

type OAuthProvider = 'gmail' | 'gcal' | 'gdrive' | 'gchat' | 'slack';

const OAUTH_CONFIG: Record<OAuthProvider, { authUrl: string; tokenUrl: string; scopes: string[] }> = {
  gmail: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
  },
  gcal: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
  },
  gdrive: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  },
  gchat: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/chat.messages'],
  },
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['channels:read', 'chat:write', 'search:read'],
  },
};

@Injectable()
export class AgentOAuthService {
  constructor(private readonly prismaService: PrismaService) {}

  // Build OAuth2 redirect URL for a provider
  getAuthUrl(provider: OAuthProvider, agentId: string, baseUrl: string): string {
    const config = OAUTH_CONFIG[provider];
    const clientId = process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_ID`] || '';
    const redirectUri = `${baseUrl}/api/agent/oauth/callback`;
    const state = Buffer.from(JSON.stringify({ agentId, provider })).toString('base64');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      access_type: 'offline',
    });
    return `${config.authUrl}?${params.toString()}`;
  }

  // Handle OAuth2 callback: exchange code for token, encrypt, store in AgentConnection
  async handleCallback(code: string, state: string): Promise<{ agentId: string; provider: string }> {
    const { agentId, provider } = JSON.parse(
      Buffer.from(state, 'base64').toString(),
    ) as { agentId: string; provider: OAuthProvider };

    // NOTE: Full token exchange requires client_secret — defer to Phase 6 for full implementation
    // For Phase 4: store the code as placeholder encrypted token to prove the flow works
    const encryptedToken = this.encrypt(
      JSON.stringify({ code, provider, storedAt: new Date().toISOString() }),
    );
    await this.prismaService.agentConnection.upsert({
      where: { agentId_provider: { agentId, provider } },
      update: { encryptedToken, isEnabled: true, scopes: OAUTH_CONFIG[provider].scopes },
      create: {
        agentId,
        provider,
        encryptedToken,
        scopes: OAUTH_CONFIG[provider].scopes,
        isEnabled: true,
      },
    });
    return { agentId, provider };
  }

  // Check connection status without exposing token
  async getConnectionStatus(
    agentId: string,
  ): Promise<Array<{ provider: string; isEnabled: boolean; isConnected: boolean }>> {
    const connections = await this.prismaService.agentConnection.findMany({
      where: { agentId },
      select: { provider: true, isEnabled: true, encryptedToken: true },
    });
    return Object.keys(OAUTH_CONFIG).map((provider) => {
      const conn = connections.find((c) => c.provider === provider);
      return { provider, isEnabled: conn?.isEnabled ?? false, isConnected: !!conn?.encryptedToken };
    });
  }

  private encrypt(text: string): string {
    const key = Buffer.from(
      process.env.ENCRYPTION_KEY || randomBytes(32).toString('hex'),
      'hex',
    ).slice(0, 32);
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  }
}
