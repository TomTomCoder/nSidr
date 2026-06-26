import { Module } from '@nestjs/common';
import { OAuthIntegrationModule } from '../oauth-integration/oauth-integration.module';
import { UserIntegrationController } from './user-integration.controller';
import { UserIntegrationService } from './user-integration.service';

@Module({
  // OAuthIntegrationModule exports OAuthIntegrationTokenService (AES-256 token crypto).
  imports: [OAuthIntegrationModule],
  controllers: [UserIntegrationController],
  providers: [UserIntegrationService],
  exports: [UserIntegrationService],
})
export class UserIntegrationModule {}
