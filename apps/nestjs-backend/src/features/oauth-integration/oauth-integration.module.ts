import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OAuthIntegrationTokenService } from './token.service';
import { OAuthIntegrationService } from './oauth-integration.service';
import { OAuthController } from './oauth.controller';
import { OAuthWebhookService } from './webhook.service';
import { OAuthWebhookController } from './oauth-webhook.controller';

@Module({
  imports: [EventEmitterModule],
  controllers: [OAuthController, OAuthWebhookController],
  providers: [OAuthIntegrationTokenService, OAuthIntegrationService, OAuthWebhookService],
  exports: [OAuthIntegrationTokenService, OAuthIntegrationService, OAuthWebhookService],
})
export class OAuthIntegrationModule {}
