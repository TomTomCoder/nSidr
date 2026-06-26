import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Res,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import * as crypto from 'crypto';
import { OAuthIntegrationService } from './oauth-integration.service';
import { OAuthIntegrationTokenService } from './token.service';
import { OAuthIntegrationProvider } from '@teable/db-main-prisma';

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

@Controller('api/integrations')
export class OAuthController {
  constructor(
    private readonly integrationService: OAuthIntegrationService,
    private readonly tokenService: OAuthIntegrationTokenService
  ) {}

  /** Step 1: Redirect user to provider OAuth2 consent screen */
  @Get('oauth/authorize/:provider')
  authorize(@Param('provider') provider: string, @Req() req: Request, @Res() res: Response) {
    const upperProvider = provider.toUpperCase() as OAuthIntegrationProvider;
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/oauth/callback/${provider}`;

    // Store verifier + state in session/cookie for callback verification
    // Using signed cookie pattern (httpOnly, sameSite=lax)
    res.cookie(`oauth_state_${state}`, codeVerifier, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    const url = this.integrationService.getAuthorizationUrl(
      upperProvider,
      state,
      codeChallenge,
      redirectUri
    );
    return res.json({ url, state });
  }

  /** Step 2: Exchange authorization code for tokens, store in DB */
  @Get('oauth/callback/:provider')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const codeVerifier = req.cookies[`oauth_state_${state}`];
    if (!codeVerifier) {
      return res.status(400).json({ error: 'Invalid or expired OAuth state' });
    }
    res.clearCookie(`oauth_state_${state}`);

    const upperProvider = provider.toUpperCase() as OAuthIntegrationProvider;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/oauth/callback/${provider}`;
    const isGoogle = upperProvider !== 'SLACK';

    const tokenUrl = isGoogle
      ? 'https://oauth2.googleapis.com/token'
      : 'https://slack.com/api/oauth.v2.access';

    const clientId = process.env[isGoogle ? 'GOOGLE_CLIENT_ID' : 'SLACK_CLIENT_ID'] ?? '';
    const clientSecret =
      process.env[isGoogle ? 'GOOGLE_CLIENT_SECRET' : 'SLACK_CLIENT_SECRET'] ?? '';

    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });

    const tokenResp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const tokenData = (await tokenResp.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'Token exchange failed', detail: tokenData });
    }

    // req.user is populated by Teable's existing auth middleware
    const userId = (req as any).user?.id ?? 'unknown';
    const spaceId = (req.query.spaceId as string) ?? '';

    const scopes = (tokenData.scope ?? '').split(/[, ]+/).filter(Boolean);

    await this.integrationService.createFromOAuth(spaceId, userId, upperProvider, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scopes,
    });

    // Close popup and signal parent window
    return res.send(
      `<script>window.opener?.postMessage({ type: 'oauth_success', provider: '${provider}' }, '*'); window.close();</script>`
    );
  }

  /** List integrations for a space */
  @Get('list')
  async listIntegrations(@Query('spaceId') spaceId: string) {
    return this.integrationService.listForSpace(spaceId);
  }

  /** Revoke + soft-delete an integration */
  @Delete(':integrationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param('integrationId') integrationId: string, @Req() req: Request): Promise<void> {
    const callerId = (req as any).user?.id ?? '';
    const integration = await this.integrationService.getById(integrationId);
    // Attempt provider-side revocation (best-effort, don't fail if it errors)
    try {
      const accessToken = this.tokenService.decryptToken(integration.accessToken);
      const isGoogle = integration.provider !== 'SLACK';
      if (isGoogle) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
          method: 'POST',
        });
      } else {
        await fetch('https://slack.com/api/auth.revoke', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    } catch {
      // Revocation is best-effort
    }
    await this.integrationService.deactivate(integrationId, callerId);
  }
}
