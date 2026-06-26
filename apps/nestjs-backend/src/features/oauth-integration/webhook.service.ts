import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@teable/db-main-prisma';
import { OAuthIntegrationService } from './oauth-integration.service';
import { OAuthIntegrationTokenService } from './token.service';

@Injectable()
export class OAuthWebhookService {
  private readonly logger = new Logger(OAuthWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationService: OAuthIntegrationService,
    private readonly tokenService: OAuthIntegrationTokenService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async registerWebhook(integrationId: string, event: string, workflowTriggerId?: string) {
    const integration = await this.integrationService.getById(integrationId);

    // For Gmail: register Google Pub/Sub push notification
    if (integration.provider === 'GMAIL') {
      const accessToken = this.tokenService.decryptToken(integration.accessToken);
      const topicName = process.env.GOOGLE_PUBSUB_TOPIC ?? '';
      if (topicName) {
        await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ topicName, labelIds: ['INBOX'] }),
        });
      }
    }

    // For Google Calendar: register push channel with channelToken for later verification
    if (integration.provider === 'GCALENDAR') {
      const accessToken = this.tokenService.decryptToken(integration.accessToken);
      const channelId = crypto.randomUUID();
      const channelToken = crypto.randomBytes(32).toString('hex');
      const callbackUrl = `${process.env.APP_BASE_URL}/api/integrations/webhooks/gcalendar`;
      await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/watch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: callbackUrl,
          token: channelToken,
          expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }),
      });

      return this.prisma.oAuthIntegrationWebhook.create({
        data: {
          integrationId,
          event,
          workflowTriggerId,
          isActive: true,
          config: { channelId, channelToken },
        },
      });
    }

    return this.prisma.oAuthIntegrationWebhook.create({
      data: { integrationId, event, workflowTriggerId, isActive: true, config: {} },
    });
  }

  /** Retrieve stored channelToken for a Google push channel by channelId */
  async getChannelToken(channelId: string): Promise<string> {
    const webhook = await this.prisma.oAuthIntegrationWebhook.findFirst({
      where: { config: { path: ['channelId'], equals: channelId } },
    });
    if (!webhook) throw new UnauthorizedException('Unknown channel');
    const config = webhook.config as Record<string, string>;
    return config['channelToken'] ?? '';
  }

  async handleIncomingWebhook(
    provider: string,
    payload: unknown,
    signature: string,
    rawBody: Buffer
  ): Promise<void> {
    const upperProvider = provider.toUpperCase();

    if (upperProvider === 'SLACK') {
      this.verifySlackSignature(rawBody, signature);
    }
    // Google uses Pub/Sub push — per-request verification done in controller via X-Goog-Channel-Token

    const payloadObj = payload as Record<string, unknown>;
    const eventType = this.extractEventType(upperProvider, payloadObj);

    // Find matching webhooks
    const webhooks = await this.prisma.oAuthIntegrationWebhook.findMany({
      where: { event: eventType, isActive: true },
      include: { integration: { select: { provider: true, spaceId: true } } },
    });

    for (const webhook of webhooks) {
      // Emit on EventEmitter2 — WorkflowService can subscribe to 'oauth.webhook' in a future task
      this.eventEmitter.emit('oauth.webhook', {
        provider: upperProvider,
        event: eventType,
        payload,
        webhookId: webhook.id,
        workflowTriggerId: webhook.workflowTriggerId ?? null,
        spaceId: (webhook.integration as any).spaceId,
      });
      this.logger.log(`Emitted oauth.webhook event=${eventType} webhookId=${webhook.id}`);

      await this.prisma.oAuthIntegrationWebhook.update({
        where: { id: webhook.id },
        data: { lastTriggeredAt: new Date() },
      });
    }
  }

  private verifySlackSignature(rawBody: Buffer, signature: string): void {
    const signingSecret = process.env.SLACK_SIGNING_SECRET ?? '';
    if (!signingSecret) {
      throw new BadRequestException('Slack signing secret not configured');
    }
    // Full verification done in controller with timestamp; this is a guard for missing config
  }

  private extractEventType(provider: string, payload: Record<string, unknown>): string {
    switch (provider) {
      case 'SLACK': {
        const event = payload['event'] as Record<string, string> | undefined;
        return event ? `slack.${event['type']}` : 'slack.unknown';
      }
      case 'GMAIL':
        return 'gmail.message.received';
      case 'GCALENDAR':
        return 'gcalendar.event.changed';
      default:
        return `${provider.toLowerCase()}.event`;
    }
  }
}
