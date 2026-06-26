import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { SettingOpenApiService } from './setting-open-api.service';

const domainVerificationKey = 'allowedEmailDomains';

@Controller('api/admin/setting/domain-verification')
export class DomainVerificationController {
  constructor(private readonly settingService: SettingOpenApiService) {}

  @Get()
  @Permissions('instance|read')
  async getDomains() {
    const setting = await this.settingService.getSetting();
    const raw = (setting as Record<string, unknown>)[domainVerificationKey];
    const domains: string[] = Array.isArray(raw) ? (raw as string[]) : [];
    return { domains };
  }

  @Post()
  @Permissions('instance|update')
  async addDomain(@Body() body: { domain: string }) {
    const domain = body.domain?.trim().toLowerCase();
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      throw new Error('Invalid domain format');
    }
    const setting = await this.settingService.getSetting();
    const raw = (setting as Record<string, unknown>)[domainVerificationKey];
    const domains: string[] = Array.isArray(raw) ? (raw as string[]) : [];
    if (!domains.includes(domain)) {
      domains.push(domain);
      await this.settingService.updateSetting({ [domainVerificationKey]: domains } as never);
    }
    return { domains };
  }

  @Delete(':domain')
  @Permissions('instance|update')
  async removeDomain(@Param('domain') domain: string) {
    const setting = await this.settingService.getSetting();
    const raw = (setting as Record<string, unknown>)[domainVerificationKey];
    const domains: string[] = Array.isArray(raw) ? (raw as string[]) : [];
    const updated = domains.filter((d) => d !== domain);
    await this.settingService.updateSetting({ [domainVerificationKey]: updated } as never);
    return { domains: updated };
  }
}
