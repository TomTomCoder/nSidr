import {
  Controller,
  Post,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { OAuthWebhookService } from './webhook.service';

@Controller('api/integrations/webhooks')
export class OAuthWebhookController {
  constructor(private readonly webhookService: OAuthWebhookService) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Headers('x-slack-signature') slackSig?: string,
    @Headers('x-slack-request-timestamp') slackTs?: string,
    @Headers('x-goog-channel-id') googChannelId?: string,
    @Headers('x-goog-channel-token') googChannelToken?: string
  ): Promise<{ ok: boolean }> {
    const rawBody: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));
    let signature = slackSig ?? '';

    // Verify Slack HMAC before passing to service
    if (provider.toUpperCase() === 'SLACK' && slackSig && slackTs) {
      const signingSecret = process.env.SLACK_SIGNING_SECRET ?? '';
      const sigBase = `v0:${slackTs}:${rawBody.toString()}`;
      const expected =
        'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBase).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(slackSig))) {
        return { ok: false }; // Silently reject — don't expose verification failure detail
      }
      signature = slackSig;
    }

    // Verify Google webhook channel token
    if (provider.toUpperCase() !== 'SLACK' && googChannelId) {
      const expectedToken = await this.webhookService.getChannelToken(googChannelId);
      if (!googChannelToken || googChannelToken !== expectedToken) {
        throw new UnauthorizedException('Invalid channel token');
      }
    }

    await this.webhookService.handleIncomingWebhook(provider, req.body, signature, rawBody);
    return { ok: true };
  }
}
