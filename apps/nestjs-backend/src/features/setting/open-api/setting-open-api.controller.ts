/* eslint-disable sonarjs/no-duplicate-string */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  IPublicSettingVo,
  ISetSettingMailTransportConfigVo,
  ISettingVo,
  ITestLLMVo,
  IUploadLogoVo,
  IUploadBrandAssetVo,
  IBatchTestLLMVo,
  ITestApiKeyVo,
  ITestPublicAccessVo,
} from '@teable/openapi';
import {
  IUpdateSettingRo,
  testLLMRoSchema,
  updateSettingRoSchema,
  ITestLLMRo,
  setSettingMailTransportConfigRoSchema,
  ISetSettingMailTransportConfigRo,
  batchTestLLMRoSchema,
  IBatchTestLLMRo,
  testApiKeyRoSchema,
  ITestApiKeyRo,
  brandAssetKindSchema,
} from '@teable/openapi';
import { IThresholdConfig, ThresholdConfig } from '../../../configs/threshold.config';
import { ZodValidationPipe } from '../../../zod.validation.pipe';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { TurnstileService } from '../../auth/turnstile/turnstile.service';
import { SettingOpenApiService } from './setting-open-api.service';

@Controller('api/admin/setting')
export class SettingOpenApiController {
  constructor(
    private readonly settingOpenApiService: SettingOpenApiService,
    private readonly turnstileService: TurnstileService,
    @ThresholdConfig() private readonly thresholdConfig: IThresholdConfig
  ) {}

  /**
   * Get the instance settings, now we have config for AI, there are some sensitive fields, we need check the permission before return.
   */
  @Permissions('instance|read')
  @Get()
  async getSetting(): Promise<ISettingVo> {
    return await this.settingOpenApiService.getSetting();
  }

  /**
   * Public endpoint for getting public settings without authentication
   */
  @Public()
  @Get('public')
  async getPublicSetting(): Promise<IPublicSettingVo> {
    const setting = await this.settingOpenApiService.getPublicSetting();
    return {
      ...setting,
      turnstileSiteKey: this.turnstileService.getTurnstileSiteKey(),
      changeEmailSendCodeMailRate: this.thresholdConfig.changeEmailSendCodeMailRate,
      resetPasswordSendMailRate: this.thresholdConfig.resetPasswordSendMailRate,
      signupVerificationSendCodeMailRate: this.thresholdConfig.signupVerificationSendCodeMailRate,
    };
  }

  @Patch()
  @Permissions('instance|update')
  async updateSetting(
    @Body(new ZodValidationPipe(updateSettingRoSchema))
    updateSettingRo: IUpdateSettingRo
  ): Promise<ISettingVo> {
    return await this.settingOpenApiService.updateSetting(updateSettingRo);
  }

  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (_req, file, callback) => {
        if (file.mimetype.startsWith('image/')) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Invalid file type'), false);
        }
      },
      limits: {
        fileSize: 500 * 1024, // limit file size is 500KB
      },
    })
  )
  @Patch('logo')
  @Permissions('instance|update')
  async uploadLogo(@UploadedFile() file: Express.Multer.File): Promise<IUploadLogoVo> {
    return this.settingOpenApiService.uploadLogo(file);
  }

  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (_req, file, callback) => {
        const allowed =
          /^image\/|^font\/|^application\/(x-font-|font-|vnd\.ms-fontobject|octet-stream)/;
        if (allowed.test(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Invalid file type'), false);
        }
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB — covers illustrations and font files
      },
    })
  )
  @Patch('brand-asset')
  @Permissions('instance|update')
  async uploadBrandAsset(
    @UploadedFile() file: Express.Multer.File,
    @Body('kind', new ZodValidationPipe(brandAssetKindSchema)) kind: 'illustration' | 'font'
  ): Promise<IUploadBrandAssetVo> {
    return this.settingOpenApiService.uploadBrandAsset(file, kind);
  }

  @Permissions('instance|update')
  @Post('test-llm')
  async testLLM(
    @Body(new ZodValidationPipe(testLLMRoSchema)) testLLMRo: ITestLLMRo
  ): Promise<ITestLLMVo> {
    return await this.settingOpenApiService.testLLM(testLLMRo);
  }

  @Permissions('instance|update')
  @Post('batch-test-llm')
  async batchTestLLM(
    @Body(new ZodValidationPipe(batchTestLLMRoSchema.optional())) batchTestLLMRo?: IBatchTestLLMRo
  ): Promise<IBatchTestLLMVo> {
    return await this.settingOpenApiService.batchTestLLM(batchTestLLMRo);
  }

  @Permissions('instance|update')
  @Post('test-api-key')
  async testApiKey(
    @Body(new ZodValidationPipe(testApiKeyRoSchema)) testApiKeyRo: ITestApiKeyRo
  ): Promise<ITestApiKeyVo> {
    return await this.settingOpenApiService.testApiKey(testApiKeyRo);
  }

  @Permissions('instance|update')
  @Get('test-public-access')
  async testPublicAccess(): Promise<ITestPublicAccessVo> {
    return await this.settingOpenApiService.testPublicAccess();
  }

  @Permissions('instance|update')
  @Put('set-mail-transport-config')
  async setMailTransportConfig(
    @Body(new ZodValidationPipe(setSettingMailTransportConfigRoSchema))
    setMailTransportConfigRo: ISetSettingMailTransportConfigRo
  ): Promise<ISetSettingMailTransportConfigVo> {
    await this.settingOpenApiService.setMailTransportConfig(setMailTransportConfigRo);

    return {
      ...setMailTransportConfigRo,
      transportConfig: {
        ...setMailTransportConfigRo.transportConfig,
        auth: {
          user: setMailTransportConfigRo.transportConfig.auth.user,
          pass: '',
        },
      },
    };
  }

  /**
   * Get available models from AI Gateway
   * Returns configured=false if gateway is not set up
   */
  @Public()
  @Get('gateway-models')
  async getGatewayModels() {
    return await this.settingOpenApiService.getGatewayModels();
  }

  /**
   * Proxy GET {ollamaUrl}/api/tags server-side (GW-03).
   * Avoids CORS and keeps the Ollama base URL server-side.
   * SSRF-mitigated: link-local and known metadata endpoints are rejected (T-15-04).
   *
   * @query ollamaUrl - Base URL of the Ollama instance. Defaults to http://localhost:11434.
   */
  @Permissions('instance|read')
  @Get('ollama-models')
  async listOllamaModels(@Query('ollamaUrl') ollamaUrl?: string) {
    return await this.settingOpenApiService.listOllamaModels(ollamaUrl);
  }
}
