import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import type { Prisma, UserIntegration } from '@teable/db-main-prisma';
import { UserIntegrationProvider } from '@teable/openapi';
import type { IUserIntegrationItemVo } from '@teable/openapi';
import { OAuthIntegrationTokenService } from '../oauth-integration/token.service';
import { PROVIDER_CONFIG, resolveEnv } from './user-integration.constants';
import type { IProviderConfig } from './user-integration.constants';

interface ITokenExchangeResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scopes: string[];
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class UserIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    // Reuse the existing AES-256 token crypto (INTEGRATION_SECRET_KEY).
    private readonly tokenCrypto: OAuthIntegrationTokenService
  ) {}

  private getConfig(provider: string): IProviderConfig {
    const cfg = PROVIDER_CONFIG[provider as UserIntegrationProvider];
    if (!cfg) {
      throw new BadRequestException(`Unsupported integration provider: ${provider}`);
    }
    return cfg;
  }

  // Per-integration "bring your own" OAuth app credentials take priority over
  // the server-configured env credentials.
  private resolveCredentials(
    cfg: IProviderConfig,
    row?: { clientId?: string | null; clientSecret?: string | null }
  ): { clientId: string; clientSecret: string } {
    if (row?.clientId && row?.clientSecret) {
      return {
        clientId: row.clientId,
        clientSecret: this.tokenCrypto.decryptToken(row.clientSecret),
      };
    }
    const clientId = resolveEnv(cfg.clientIdEnvs);
    const clientSecret = resolveEnv(cfg.clientSecretEnvs);
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        `Integration provider is not configured. Provide a client ID and secret, or set ${cfg.clientIdEnvs[0]} / ${cfg.clientSecretEnvs[0]} on the server.`
      );
    }
    return { clientId, clientSecret };
  }

  /** Create a pending integration (no tokens yet), optionally with custom creds. */
  async createPending(
    userId: string,
    ro: { provider: string; name?: string; clientId?: string; clientSecret?: string }
  ): Promise<IUserIntegrationItemVo> {
    this.getConfig(ro.provider); // validate provider
    const row = await this.prisma.userIntegration.create({
      data: {
        userId,
        provider: ro.provider,
        name: ro.name?.trim() || ro.provider,
        clientId: ro.clientId?.trim() || null,
        clientSecret: ro.clientSecret?.trim()
          ? this.tokenCrypto.encryptToken(ro.clientSecret.trim())
          : null,
        scopes: [],
        isActive: false,
      },
    });
    return this.toVo(row);
  }

  toVo(row: UserIntegration): IUserIntegrationItemVo {
    return {
      id: row.id,
      userId: row.userId,
      provider: row.provider as UserIntegrationProvider,
      name: row.name,
      lastUsedTime: row.lastUsedTime?.toISOString(),
      createdTime: row.createdTime.toISOString(),
      connectedTime: (row.connectedTime ?? row.createdTime).toISOString(),
      lastModifiedTime: row.lastModifiedTime?.toISOString(),
      hasSecret: Boolean(row.accessToken),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: (row.metadata ?? undefined) as any,
    };
  }

  async listForUser(
    userId: string,
    provider?: UserIntegrationProvider
  ): Promise<IUserIntegrationItemVo[]> {
    const rows = await this.prisma.userIntegration.findMany({
      where: { userId, isActive: true, ...(provider ? { provider } : {}) },
      orderBy: { createdTime: 'desc' },
    });
    return rows.map((r) => this.toVo(r));
  }

  async getOwned(
    id: string,
    userId: string,
    opts?: { allowInactive?: boolean }
  ): Promise<UserIntegration> {
    const row = await this.prisma.userIntegration.findUnique({ where: { id } });
    if (!row || (!row.isActive && !opts?.allowInactive)) {
      throw new NotFoundException(`UserIntegration ${id} not found`);
    }
    if (row.userId !== userId) {
      throw new ForbiddenException('Not authorized for this integration');
    }
    return row;
  }

  async rename(id: string, userId: string, name: string): Promise<void> {
    await this.getOwned(id, userId);
    await this.prisma.userIntegration.update({ where: { id }, data: { name } });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getOwned(id, userId, { allowInactive: true });
    await this.prisma.userIntegration.delete({ where: { id } });
  }

  /** Return a valid access token, refreshing it first if expired. */
  async getValidToken(id: string, userId: string): Promise<string> {
    let row = await this.getOwned(id, userId);
    if (!row.accessToken) {
      throw new BadRequestException('Integration is not connected yet');
    }
    if (row.tokenExpiry && row.tokenExpiry <= new Date() && row.refreshToken) {
      row = await this.refreshToken(row);
    }
    await this.prisma.userIntegration.update({
      where: { id },
      data: { lastUsedTime: new Date() },
    });
    return this.tokenCrypto.decryptToken(row.accessToken!);
  }

  private async refreshToken(row: UserIntegration): Promise<UserIntegration> {
    const cfg = this.getConfig(row.provider);
    const { clientId, clientSecret } = this.resolveCredentials(cfg, row);
    const refresh = this.tokenCrypto.decryptToken(row.refreshToken!);
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    });
    const resp = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: params.toString(),
    });
    if (!resp.ok) {
      throw new InternalServerErrorException(`Token refresh failed for ${row.provider}`);
    }
    const data = (await resp.json()) as { access_token: string; expires_in?: number };
    const tokenExpiry = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
    return this.prisma.userIntegration.update({
      where: { id: row.id },
      data: { accessToken: this.tokenCrypto.encryptToken(data.access_token), tokenExpiry },
    });
  }

  // ---- OAuth connect flow ----

  buildAuthorizationUrl(
    provider: string,
    state: string,
    codeChallenge: string,
    redirectUri: string,
    row?: { clientId?: string | null; clientSecret?: string | null }
  ): string {
    const cfg = this.getConfig(provider);
    const { clientId } = this.resolveCredentials(cfg, row);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: cfg.scopes.join(cfg.scopeSeparator),
      state,
    });
    if (cfg.userScopes?.length) {
      params.set('user_scope', cfg.userScopes.join(cfg.scopeSeparator));
    }
    if (cfg.usePkce) {
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }
    if (cfg.family === 'google') {
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    }
    return `${cfg.authUrl}?${params.toString()}`;
  }

  async exchangeAndPersist(opts: {
    provider: string;
    code: string;
    codeVerifier?: string;
    redirectUri: string;
    userId: string;
    name?: string;
    integrationId?: string;
  }): Promise<UserIntegration> {
    const cfg = this.getConfig(opts.provider);
    // A pending/existing row (created via the connect dialog or a reconnect)
    // may carry the user's own OAuth credentials.
    const existing = opts.integrationId
      ? await this.getOwned(opts.integrationId, opts.userId, { allowInactive: true })
      : undefined;
    const tokens = await this.exchangeCode(cfg, opts, existing);

    const tokenExpiry = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null;
    const baseData = {
      accessToken: this.tokenCrypto.encryptToken(tokens.accessToken),
      refreshToken: tokens.refreshToken ? this.tokenCrypto.encryptToken(tokens.refreshToken) : null,
      tokenExpiry,
      scopes: tokens.scopes,
      metadata: tokens.metadata ?? undefined,
      isActive: true,
      connectedTime: new Date(),
    };

    // Activate the pending row (or refresh tokens on a reconnect).
    if (existing) {
      return this.prisma.userIntegration.update({ where: { id: existing.id }, data: baseData });
    }

    return this.prisma.userIntegration.create({
      data: {
        userId: opts.userId,
        provider: opts.provider,
        name: opts.name?.trim() || opts.provider,
        ...baseData,
      },
    });
  }

  private async exchangeCode(
    cfg: IProviderConfig,
    opts: { provider: string; code: string; codeVerifier?: string; redirectUri: string },
    row?: { clientId?: string | null; clientSecret?: string | null }
  ): Promise<ITokenExchangeResult> {
    const { clientId, clientSecret } = this.resolveCredentials(cfg, row);
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: opts.code,
      redirect_uri: opts.redirectUri,
      grant_type: 'authorization_code',
    });
    if (cfg.usePkce && opts.codeVerifier) {
      body.set('code_verifier', opts.codeVerifier);
    }
    const resp = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    const data = (await resp.json()) as Record<string, unknown>;

    if (cfg.family === 'slack') {
      return this.handleSlackToken(data);
    }

    const accessToken = data['access_token'] as string | undefined;
    if (!accessToken) {
      throw new BadRequestException(`Token exchange failed for ${opts.provider}`);
    }
    const scopeRaw = (data['scope'] as string) ?? '';
    const scopes = scopeRaw.split(/[ ,]+/).filter(Boolean);
    const metadata = await this.fetchMetadata(cfg, accessToken);
    return {
      accessToken,
      refreshToken: data['refresh_token'] as string | undefined,
      expiresIn: data['expires_in'] as number | undefined,
      scopes,
      metadata,
    };
  }

  private async handleSlackToken(data: Record<string, unknown>): Promise<ITokenExchangeResult> {
    if (!data['ok']) {
      throw new BadRequestException(`Slack token exchange failed: ${String(data['error'])}`);
    }
    const authedUser = data['authed_user'] as
      | { id?: string; access_token?: string; scope?: string }
      | undefined;
    const team = data['team'] as { id?: string; name?: string } | undefined;
    const accessToken = authedUser?.access_token ?? (data['access_token'] as string);
    if (!accessToken) {
      throw new BadRequestException('Slack token exchange returned no user access token');
    }
    let metadata: Prisma.InputJsonValue | undefined;
    try {
      const identityResp = await fetch('https://slack.com/api/users.identity', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const identity = (await identityResp.json()) as {
        ok?: boolean;
        user?: { id?: string; name?: string; email?: string };
        team?: { id?: string; name?: string };
      };
      metadata = {
        userInfo: {
          id: identity.user?.id ?? authedUser?.id ?? '',
          name: identity.user?.name ?? '',
          email: identity.user?.email ?? '',
        },
        teamInfo: {
          id: identity.team?.id ?? team?.id ?? '',
          name: identity.team?.name ?? team?.name ?? '',
        },
      };
    } catch {
      metadata = team ? { teamInfo: { id: team.id ?? '', name: team.name ?? '' } } : undefined;
    }
    return {
      accessToken,
      scopes: (authedUser?.scope ?? '').split(',').filter(Boolean),
      metadata,
    };
  }

  /** Best-effort identity fetch for the "email" metadata shape. Never throws. */
  private async fetchMetadata(
    cfg: IProviderConfig,
    accessToken: string
  ): Promise<Prisma.InputJsonValue | undefined> {
    if (cfg.metadataKind !== 'email' || !cfg.userInfoUrl) return undefined;
    // GitHub's API rejects requests without a User-Agent; harmless for others.
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'Teable',
    };
    try {
      const resp = await fetch(cfg.userInfoUrl, { headers });
      if (!resp.ok) return undefined;
      const u = (await resp.json()) as Record<string, unknown>;
      let email =
        (u['email'] as string) ?? (u['mail'] as string) ?? (u['userPrincipalName'] as string) ?? '';
      const name =
        (u['name'] as string) ??
        (u['displayName'] as string) ??
        (u['login'] as string) ??
        (u['username'] as string) ??
        '';
      // GitHub hides the email on /user when it's private — fall back to /user/emails.
      if (!email && cfg.family === 'github') {
        try {
          const emailsResp = await fetch('https://api.github.com/user/emails', { headers });
          if (emailsResp.ok) {
            const emails = (await emailsResp.json()) as Array<{
              email: string;
              primary?: boolean;
              verified?: boolean;
            }>;
            email =
              (emails.find((e) => e.primary) ?? emails.find((e) => e.verified) ?? emails[0])
                ?.email ?? '';
          }
        } catch {
          // ignore — email stays empty
        }
      }
      return { userInfo: { email, name } };
    } catch {
      return undefined;
    }
  }
}
