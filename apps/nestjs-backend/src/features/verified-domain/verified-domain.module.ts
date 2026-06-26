import { Module } from '@nestjs/common';
import { PrismaModule } from '@teable/db-main-prisma';
import { VerifiedDomainController } from './verified-domain.controller';
import { VerifiedDomainService } from './verified-domain.service';

@Module({
  imports: [PrismaModule],
  controllers: [VerifiedDomainController],
  providers: [VerifiedDomainService],
  exports: [VerifiedDomainService],
})
export class VerifiedDomainModule {}
