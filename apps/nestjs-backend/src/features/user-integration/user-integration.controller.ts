import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Response, Request } from 'express';
import { ClsService } from 'nestjs-cls';
import { UserIntegrationProvider } from '@teable/openapi';
import type {
  IUserIntegrationItemVo,
  IUserIntegrationListVo,
  IUserIntegrationTokenVo,
} from '@teable/openapi';
import type { IClsStore } from '../../types/cls';
import { UserIntegrationService } from './user-integration.service';

interface ICreateUserIntegrationBody {
  provider: string;
  name?: string;
  clientId?: string;
  clientSecret?: string;
}

interface IOAuthCookiePayload {
  codeVerifier: string;
  userId: string;
  name?: string;
  integrationId?: string;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

/**
 * Build the OAuth callback URL from the *public* origin. Honors proxy headers so
 * the redirect_uri matches the browser's origin (e.g. the dev proxy on :3000)
 * rather than the internal backend host (:3002) — they must match what the user
 * registered in their OAuth app.
 */
function callbackUrl(req: Request, provider: string): string {
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() || req.protocol;
  const host =
    (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() || req.get('host');
  return `${proto}://${host}/api/user-integrations/callback/${provider}`;
}

@Controller('api/user-integrations')
export class UserIntegrationController {
  constructor(
    private readonly service: UserIntegrationService,
    private readonly cls: ClsService<IClsStore>
  ) {}

  @Get()
  async list(@Query('provider') provider?: string): Promise<IUserIntegrationListVo> {
    const userId = this.cls.get('user.id');
    const integrations = await this.service.listForUser(
      userId,
      provider as UserIntegrationProvider | undefined
    );
    return { integrations };
  }

  /** Create a pending integration (optionally with the user's own OAuth credentials). */
  @Post()
  async create(@Body() body: ICreateUserIntegrationBody): Promise<IUserIntegrationItemVo> {
    const userId = this.cls.get('user.id');
    return this.service.createPending(userId, body);
  }

  /** Step 1: redirect the user to the provider's OAuth consent screen. */
  @Get('authorize/:provider')
  async authorize(
    @Param('provider') provider: string,
    @Query('name') name: string | undefined,
    @Query('integrationId') integrationId: string | undefined,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const userId = this.cls.get('user.id');
    // A pending row may carry the user's own client id/secret.
    const row = integrationId
      ? await this.service.getOwned(integrationId, userId, { allowInactive: true })
      : undefined;
    const state = base64url(crypto.randomBytes(16));
    const codeVerifier = base64url(crypto.randomBytes(32));
    const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
    const redirectUri = callbackUrl(req, provider);

    const payload: IOAuthCookiePayload = { codeVerifier, userId, name, integrationId };
    res.cookie(`ui_oauth_${state}`, JSON.stringify(payload), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    const url = this.service.buildAuthorizationUrl(
      provider,
      state,
      codeChallenge,
      redirectUri,
      row
    );
    return res.redirect(url);
  }

  /** Step 2: provider redirects back with a code; exchange it and persist. */
  @Get('callback/:provider')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const cookieName = `ui_oauth_${state}`;
    const raw = req.cookies?.[cookieName];
    if (!raw) {
      return res
        .status(400)
        .send(this.closePopupHtml(provider, false, 'Invalid or expired OAuth state'));
    }
    res.clearCookie(cookieName);

    let payload: IOAuthCookiePayload;
    try {
      payload = JSON.parse(raw) as IOAuthCookiePayload;
    } catch {
      return res.status(400).send(this.closePopupHtml(provider, false, 'Corrupt OAuth state'));
    }

    if (!code) {
      return res.status(400).send(this.closePopupHtml(provider, false, 'Authorization denied'));
    }

    const redirectUri = callbackUrl(req, provider);
    try {
      await this.service.exchangeAndPersist({
        provider,
        code,
        codeVerifier: payload.codeVerifier,
        redirectUri,
        userId: payload.userId,
        name: payload.name,
        integrationId: payload.integrationId,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Connection failed';
      return res.status(400).send(this.closePopupHtml(provider, false, message));
    }

    return res.send(this.closePopupHtml(provider, true));
  }

  @Post(':integrationId/token')
  async getToken(@Param('integrationId') integrationId: string): Promise<IUserIntegrationTokenVo> {
    const userId = this.cls.get('user.id');
    const accessToken = await this.service.getValidToken(integrationId, userId);
    return { accessToken };
  }

  @Put(':integrationId/name')
  @HttpCode(HttpStatus.OK)
  async updateName(
    @Param('integrationId') integrationId: string,
    @Body('name') name: string
  ): Promise<void> {
    if (!name || !name.trim()) throw new BadRequestException('name is required');
    const userId = this.cls.get('user.id');
    await this.service.rename(integrationId, userId, name.trim());
  }

  @Delete(':integrationId')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('integrationId') integrationId: string): Promise<void> {
    const userId = this.cls.get('user.id');
    await this.service.remove(integrationId, userId);
  }

  private closePopupHtml(provider: string, success: boolean, error?: string): string {
    const detail = JSON.stringify({
      type: success ? 'user_integration_connected' : 'user_integration_error',
      provider,
      error: error ?? null,
    });
    return `<!doctype html><html><body><script>
      try { window.opener && window.opener.postMessage(${detail}, '*'); } catch (e) {}
      window.close();
      document.body.innerText = ${JSON.stringify(success ? 'Connected. You can close this window.' : `Error: ${error ?? 'unknown'}`)};
    </script></body></html>`;
  }
}
