/* eslint-disable sonarjs/no-duplicate-string */
import type { OpenAIProvider } from '@ai-sdk/openai';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { FieldType, HttpErrorCode, Relationship, getAiOutputSchema } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import {
  IntegrationType,
  LLMProviderType,
  SettingKey,
  Task,
  convertGatewayApiModel,
  normalizeGatewayPricing,
  supportsImageInputForImageGeneration,
} from '@teable/openapi';
import type {
  GatewayModelTag,
  IAIConfig,
  IAiGenerateRo,
  IBrandDesignSystem,
  IChatModelAbility,
  IGatewayApiModel,
  IGatewayApiModelRaw,
  IGetAIConfig,
  LLMProvider,
} from '@teable/openapi';
import type { ImageModel, LanguageModel } from 'ai';
import {
  createGateway,
  embedMany,
  generateObject,
  generateText,
  jsonSchema,
  stepCountIs,
  streamText,
} from 'ai';
import type { Queue } from 'bullmq';
import axios from 'axios';
import type { Response } from 'express';
import { BaseConfig, IBaseConfig } from '../../configs/base.config';
import { AI_GENERATION_QUEUE, type AiGenerationJobData } from '../queue/queue.types';
import { CustomHttpException } from '../../custom.exception';
import { PerformanceCacheService } from '../../performance-cache';
import { FieldOpenApiService } from '../field/open-api/field-open-api.service';
import type { IFieldInstance } from '../field/model/factory';
import { RecordOpenApiV2Service } from '../record/open-api/record-open-api-v2.service';
import { RecordOpenApiService } from '../record/open-api/record-open-api.service';
import { SettingService } from '../setting/setting.service';
import { TableOpenApiService } from '../table/open-api/table-open-api.service';
import { prepareCreateTableRo } from '../table/open-api/table.pipe.helper';
import { AiOutputValidationService } from './ai-output-validation.service';
import {
  getAdaptedProviderOptions,
  getTaskModelKey,
  modelProviders,
  PROVIDER_DEFAULT_BASE_URL,
} from './util';
import { PromptService, PROMPT_KEY } from './prompt.service';
import { z } from 'zod';

// Fixed name for all instance (platform-provided) providers in modelKey.
// Instance models always end with @teable (e.g. "aiGateway@model@teable", "anthropic@model@teable").
// BYOK (space-configured) providers keep their custom name (e.g. "openai@model@my-custom").
export const INSTANCE_PROVIDER_NAME = 'teable';

export type ILanguageModelV2 = Exclude<LanguageModel, string>;

// In-memory cache for Gateway models (TTL: 10 minutes)
const gatewayModelsCacheTtl = 10 * 60 * 1000;

/**
 * P0-5: guidance for the app-code generator on how to render `type: "ai"` fields.
 * The workspace/base schema already exposes the field type, but without this hint the
 * generator either ignores AI fields or treats them as editable text. AI-field cells are
 * model-generated (see AiCellRegenerateService), so they must be read-only with an explicit
 * regenerate affordance rather than a free-text input.
 */
const AI_FIELD_RENDER_HINT =
  '\n\nCHAMPS IA (type "ai"): ce sont des valeurs générées par le modèle, PAS des saisies ' +
  "utilisateur. Rends-les en LECTURE SEULE (jamais d'input éditable). Ajoute un bouton " +
  '« Régénérer » qui appelle POST /api/table/{tableId}/record/{recordId}/{fieldId}/regenerate ' +
  'puis rafraîchit la cellule. Affiche un état de chargement pendant la régénération.';

interface IGatewayModelsCache {
  data: IGatewayApiModel[];
  expiresAt: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  // In-memory cache for Gateway models API - faster than Redis for static data
  private gatewayModelsCache: IGatewayModelsCache | null = null;

  constructor(
    private readonly settingService: SettingService,
    private readonly prismaService: PrismaService,
    @BaseConfig() private readonly baseConfig: IBaseConfig,
    private readonly performanceCacheService: PerformanceCacheService,
    private readonly tableOpenApiService: TableOpenApiService,
    private readonly fieldOpenApiService: FieldOpenApiService,
    @Inject(forwardRef(() => RecordOpenApiService))
    private readonly recordOpenApiService: RecordOpenApiService,
    private readonly recordOpenApiV2Service: RecordOpenApiV2Service,
    private readonly promptService: PromptService,
    private readonly aiOutputValidationService: AiOutputValidationService,
    @InjectQueue(AI_GENERATION_QUEUE) private readonly aiQueue: Queue<AiGenerationJobData>
  ) {}

  public parseModelKey(modelKey: string) {
    const [type, model, name] = modelKey.split('@');
    return { type, model, name };
  }

  /**
   * Check if modelKey is an AI Gateway model
   * Format: aiGateway@<modelId>@teable
   */
  public isGatewayModel(modelKey: string): boolean {
    const { type } = this.parseModelKey(modelKey);
    return type?.toLowerCase() === LLMProviderType.AI_GATEWAY.toLowerCase();
  }

  /**
   * Build a gateway modelKey from a gateway model ID
   * @param modelId Gateway model ID (e.g., "anthropic/claude-sonnet-4")
   */
  public buildGatewayModelKey(modelId: string): string {
    return `${LLMProviderType.AI_GATEWAY}@${modelId}@${INSTANCE_PROVIDER_NAME}`;
  }

  /**
   * Parse owner/provider from gateway model ID
   * @param modelId Gateway model ID (e.g., "anthropic/claude-sonnet-4" -> "anthropic")
   */
  private parseOwnerFromModelId(modelId: string): string | undefined {
    const parts = modelId.split('/');
    return parts.length > 1 ? parts[0].toLowerCase() : undefined;
  }

  // modelKey-> type@model@name
  async getModelConfig(modelKey: string, llmProviders: LLMProvider[] = []) {
    const { type, model, name } = this.parseModelKey(modelKey);

    // Special handling for AI Gateway models
    if (this.isGatewayModel(modelKey)) {
      const { aiConfig } = await this.settingService.getSetting([SettingKey.AI_CONFIG]);

      if (!aiConfig?.aiGatewayApiKey) {
        throw new CustomHttpException(
          'AI Gateway API key is not configured',
          HttpErrorCode.VALIDATION_ERROR,
          {
            localization: {
              i18nKey: 'httpErrors.ai.gatewayApiKeyNotSet',
            },
          }
        );
      }

      return {
        type: LLMProviderType.AI_GATEWAY,
        model, // This is the gateway modelId (e.g., "anthropic/claude-sonnet-4")
        baseUrl: aiConfig.aiGatewayBaseUrl || undefined,
        apiKey: aiConfig.aiGatewayApiKey,
      };
    }

    // Standard provider lookup
    const providerConfig = llmProviders.find(
      (p) =>
        p.name.toLowerCase() === name.toLowerCase() && p.type.toLowerCase() === type.toLowerCase()
    );

    if (!providerConfig) {
      throw new CustomHttpException(
        'AI provider configuration is not set',
        HttpErrorCode.VALIDATION_ERROR,
        {
          localization: {
            i18nKey: 'httpErrors.ai.providerConfigurationNotSet',
          },
        }
      );
    }

    const { apiKey } = providerConfig;
    // BYOK configs often omit baseUrl for providers with a well-known default
    // endpoint; supply it so the model resolves instead of failing the baseUrl gate.
    const baseUrl =
      providerConfig.baseUrl || PROVIDER_DEFAULT_BASE_URL[type.toLowerCase() as LLMProviderType];

    return {
      type,
      model,
      baseUrl,
      apiKey,
    };
  }

  /**
   * GW-05 — D-15-03 strict 2-level cascade:
   *   1. per-model apiKey override (modelConfigs[model].apiKey)
   *   2. provider-level apiKey
   *   3. FAIL LOUD — no env-var fallback, error names the missing model
   */
  resolveApiKey(modelKey: string, providers: LLMProvider[]): string {
    const { type, model, name } = this.parseModelKey(modelKey);
    const provider = providers.find(
      (p) =>
        p.type.toLowerCase() === type.toLowerCase() && p.name.toLowerCase() === name.toLowerCase()
    );
    if (!provider) {
      throw new CustomHttpException(
        `No provider configured: ${type}`,
        HttpErrorCode.VALIDATION_ERROR,
        { localization: { i18nKey: 'httpErrors.ai.providerConfigurationNotSet' } }
      );
    }
    // Level 1: model-level apiKey override (GW-05)
    const modelOverride = provider.modelConfigs?.[model]?.apiKey;
    if (modelOverride) return modelOverride;
    // Level 2: provider default apiKey
    if (provider.apiKey) return provider.apiKey;
    // FAIL LOUD — D-15-03: no env-var fallback, no silent switching
    throw new CustomHttpException(
      `No API key configured for model ${modelKey}. Set a model override or a provider default key in AI settings.`,
      HttpErrorCode.VALIDATION_ERROR,
      {
        localization: {
          i18nKey: 'httpErrors.ai.apiKeyNotConfigured',
          context: { model: modelKey },
        },
      }
    );
  }

  /**
   * GW-04 — D-15-04: embedding model instance via the provider factory map.
   * Mirrors getModelInstance() but calls textEmbeddingModel() instead of model().
   */
  async getEmbeddingModelInstance(
    embeddingModelKey: string,
    llmProviders: LLMProvider[]
  ): Promise<
    ReturnType<
      ReturnType<(typeof modelProviders)[keyof typeof modelProviders]>['textEmbeddingModel']
    >
  > {
    const { type, model, baseUrl, apiKey } = await this.getModelConfig(
      embeddingModelKey,
      llmProviders
    );

    if (!baseUrl || !apiKey) {
      throw new CustomHttpException(
        'Embedding provider configuration is incomplete',
        HttpErrorCode.VALIDATION_ERROR,
        { localization: { i18nKey: 'httpErrors.ai.configurationNotSet' } }
      );
    }

    const provider = Object.entries(modelProviders).find(
      ([key]) => type.toLowerCase() === key.toLowerCase()
    )?.[1];

    if (!provider) {
      throw new CustomHttpException(
        `Unsupported embedding provider: ${type}`,
        HttpErrorCode.VALIDATION_ERROR,
        { localization: { i18nKey: 'httpErrors.ai.unsupportedProvider', context: { type } } }
      );
    }

    const providerOptions = getAdaptedProviderOptions(type as LLMProviderType, {
      name: model,
      baseURL: baseUrl,
      apiKey,
    });
    const modelProvider = provider(providerOptions as never);
    return modelProvider.textEmbeddingModel(model);
  }

  /**
   * GW-04 — D-15-04: embed texts via the configured embedding provider.
   */
  async embed(
    texts: string[],
    embeddingModelKey: string,
    llmProviders: LLMProvider[]
  ): Promise<number[][]> {
    const modelInstance = await this.getEmbeddingModelInstance(embeddingModelKey, llmProviders);
    const { embeddings } = await embedMany({ model: modelInstance, values: texts });
    return embeddings;
  }

  async getModelInstance(
    modelKey: string,
    llmProviders: LLMProvider[],
    isImageGeneration: true
  ): Promise<ReturnType<OpenAIProvider['image']>>;
  async getModelInstance(
    modelKey: string,
    llmProviders?: LLMProvider[],
    isImageGeneration?: false
  ): Promise<ILanguageModelV2>;
  async getModelInstance(
    modelKey: string,
    llmProviders: LLMProvider[] = [],
    isImageGeneration = false
  ): Promise<ILanguageModelV2 | ImageModel> {
    const { type, model, baseUrl, apiKey } = await this.getModelConfig(modelKey, llmProviders);

    // For AI Gateway models, use official gateway provider from AI SDK
    // See: https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway
    // baseUrl is optional - SDK uses its default if not provided
    if (type === LLMProviderType.AI_GATEWAY) {
      if (!apiKey) {
        throw new CustomHttpException(
          'AI configuration is not set',
          HttpErrorCode.VALIDATION_ERROR,
          {
            localization: {
              i18nKey: 'httpErrors.ai.configurationNotSet',
            },
          }
        );
      }
      const gatewayProvider = createGateway({
        apiKey,
        ...(baseUrl && { baseURL: baseUrl }),
      });
      // Return appropriate model type based on isImageGeneration flag
      // Image models (e.g., bfl/flux-pro) use gatewayProvider.imageModel()
      // Language models (including Gemini image via generateText) use gatewayProvider()
      return isImageGeneration ? gatewayProvider.imageModel(model) : gatewayProvider(model);
    }

    // For standard providers, both baseUrl and apiKey are required
    if (!baseUrl || !apiKey) {
      throw new CustomHttpException('AI configuration is not set', HttpErrorCode.VALIDATION_ERROR, {
        localization: {
          i18nKey: 'httpErrors.ai.configurationNotSet',
        },
      });
    }

    const effectiveType = type;
    const effectiveModel = model;

    const provider = Object.entries(modelProviders).find(
      ([key]) => effectiveType.toLowerCase() === key.toLowerCase()
    )?.[1];

    if (!provider) {
      throw new CustomHttpException(
        `Unsupported AI provider: ${effectiveType}`,
        HttpErrorCode.VALIDATION_ERROR,
        {
          localization: {
            i18nKey: 'httpErrors.ai.unsupportedProvider',
            context: {
              type: effectiveType,
            },
          },
        }
      );
    }

    const providerOptions = getAdaptedProviderOptions(effectiveType as LLMProviderType, {
      name: effectiveModel,
      baseURL: baseUrl,
      apiKey,
    });
    const modelProvider = provider(providerOptions as never) as OpenAIProvider;

    return isImageGeneration
      ? (modelProvider.image(effectiveModel) as ReturnType<OpenAIProvider['image']>)
      : modelProvider(effectiveModel);
  }

  /**
   * GW-01 — Build a gateway model instance from ad-hoc credentials (not from stored settings).
   * Used by testAiGatewayKey / testAttachmentTransferModes which test user-provided keys
   * before they are persisted. Keeps createGateway confined to the ai module.
   */
  getAdHocGatewayModelInstance(
    apiKey: string,
    modelId: string,
    baseUrl?: string
  ): ReturnType<ReturnType<typeof createGateway>> {
    const gatewayProvider = createGateway({
      apiKey,
      ...(baseUrl && { baseURL: baseUrl }),
    });
    return gatewayProvider(modelId);
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  async getAIConfig(baseId: string) {
    const { spaceId } = await this.prismaService.base.findUniqueOrThrow({
      where: { id: baseId },
    });
    const aiIntegration = await this.prismaService.integration.findFirst({
      where: { resourceId: spaceId, type: IntegrationType.AI, enable: true },
    });

    const aiIntegrationConfig = aiIntegration?.config ? JSON.parse(aiIntegration.config) : null;
    const { aiConfig } = await this.settingService.getSetting();

    const hasInstanceAIConfig =
      aiConfig &&
      (aiConfig.enable ||
        aiConfig.chatModel?.lg ||
        aiConfig.llmProviders?.length > 0 ||
        aiConfig.aiGatewayApiKey);
    if (!aiIntegrationConfig && !hasInstanceAIConfig) {
      throw new CustomHttpException('AI configuration is not set', HttpErrorCode.VALIDATION_ERROR, {
        localization: {
          i18nKey: 'httpErrors.ai.configurationNotSet',
        },
      });
    }

    let config: IAIConfig;

    if (!aiIntegrationConfig) {
      const lg = aiConfig?.chatModel?.lg;
      const sm = aiConfig?.chatModel?.sm;
      const md = aiConfig?.chatModel?.md;
      const ability = aiConfig?.chatModel?.ability;

      config = {
        ...aiConfig,
        llmProviders: aiConfig?.llmProviders.map((provider) => ({
          ...provider,
          isInstance: true,
        })),
        chatModel: {
          sm: sm || lg,
          md: md || lg,
          lg: lg,
          ability,
        },
      } as IAIConfig;
    } else if (!aiConfig?.chatModel?.lg) {
      config = aiIntegrationConfig as IAIConfig;
    } else {
      const lg = aiConfig.chatModel.lg;
      const sm = aiConfig.chatModel.sm;
      const md = aiConfig.chatModel.md;
      const ability = aiConfig.chatModel.ability;
      config = {
        ...aiIntegrationConfig,
        // Include gateway models from admin config (space config doesn't have gateway models)
        gatewayModels: aiConfig.gatewayModels,
        llmProviders: [
          ...aiIntegrationConfig.llmProviders,
          ...aiConfig.llmProviders.map((provider) => ({
            ...provider,
            isInstance: true,
          })),
        ],
        chatModel: {
          sm: sm || lg,
          md: md || lg,
          lg: lg,
          ability,
        },
      } as IAIConfig;
    }

    // Fetch tags for the lg chat model and include in response
    const lgModelKey = config.chatModel?.lg;
    if (lgModelKey) {
      try {
        const tags = await this.getModelTags(lgModelKey, config.llmProviders);
        if (tags.length > 0) {
          // Add tags to chatModel response (IGetAIConfig extends IAIConfig with tags)
          return {
            ...config,
            chatModel: {
              ...config.chatModel,
              tags,
            },
          } as IGetAIConfig;
        }
      } catch (error) {
        this.logger.warn(`[getAIConfig] Failed to get tags for chat model ${lgModelKey}: ${error}`);
      }
    }

    return config as IGetAIConfig;
  }

  /**
   * GW-04 — D-15-04: Resolve AI config directly from spaceId (used by embedding path
   * which has no baseId). Returns the merged space+instance config including embeddingProvider.
   */
  async getAIConfigBySpaceId(spaceId: string): Promise<IAIConfig> {
    const aiIntegration = await this.prismaService.integration.findFirst({
      where: { resourceId: spaceId, type: IntegrationType.AI, enable: true },
    });
    const aiIntegrationConfig = aiIntegration?.config
      ? (JSON.parse(aiIntegration.config) as IAIConfig)
      : null;
    const { aiConfig } = await this.settingService.getSetting();

    if (!aiIntegrationConfig && !aiConfig) {
      return { llmProviders: [] } as unknown as IAIConfig;
    }

    if (!aiIntegrationConfig) {
      return {
        ...aiConfig,
        llmProviders: (aiConfig?.llmProviders ?? []).map((provider) => ({
          ...provider,
          isInstance: true,
        })),
      } as IAIConfig;
    }

    if (!aiConfig) {
      return aiIntegrationConfig;
    }

    return {
      ...aiIntegrationConfig,
      llmProviders: [
        ...aiIntegrationConfig.llmProviders,
        ...(aiConfig.llmProviders ?? []).map((provider) => ({
          ...provider,
          isInstance: true,
        })),
      ],
    } as IAIConfig;
  }

  async getAIDisableAIActions(baseId: string) {
    const { spaceId } = await this.prismaService.base.findUniqueOrThrow({
      where: { id: baseId },
      select: { spaceId: true },
    });
    // get space ai setting
    const aiIntegration = await this.prismaService.integration.findUnique({
      where: { resourceId: spaceId, type: IntegrationType.AI },
    });

    const aiIntegrationConfig = aiIntegration?.config ? JSON.parse(aiIntegration.config) : null;
    const disableAIActionsFromSpaceIntegration =
      aiIntegrationConfig?.capabilities?.disableActions ?? [];

    // get instance ai setting
    const { aiConfig } = await this.settingService.getSetting();
    const disableAIActionsFromInstanceAiSetting = aiConfig?.capabilities?.disableActions ?? [];

    // merge both: instance-level disableActions should always be respected
    const merged = [
      ...disableAIActionsFromInstanceAiSetting,
      ...disableAIActionsFromSpaceIntegration,
    ];
    return {
      disableActions: [...new Set(merged)],
    };
  }

  async getSimplifiedAIConfig(baseId: string) {
    try {
      const config = await this.getAIConfig(baseId);
      return {
        ...config,
        llmProviders: config.llmProviders.map(
          ({ type, name, models, isInstance, modelConfigs }) => ({
            type,
            name,
            models,
            isInstance,
            modelConfigs,
          })
        ),
      };
    } catch {
      return null;
    }
  }

  private async getGenerationModelInstance(baseId: string, aiGenerateRo: IAiGenerateRo) {
    const { modelKey: _modelKey, task = Task.Coding } = aiGenerateRo;
    const config = await this.getAIConfig(baseId);
    const modelKey = _modelKey ?? getTaskModelKey(config, task);
    if (!modelKey) {
      throw new Error('Model key is not set');
    }
    return await this.getModelInstance(modelKey, config.llmProviders);
  }

  /**
   * Dispatch a fire-and-forget AI generation job to AI_GENERATION_QUEUE.
   * Use this for callers that do NOT need the result inline (e.g. background tasks).
   * For streaming/SSE callers, use generateStream / generateBuildStream etc. directly.
   */
  async dispatchGenerationJob(jobData: AiGenerationJobData): Promise<void> {
    // Streaming variant — cannot be queued, runs inline.
    await this.aiQueue.add('generate', jobData satisfies AiGenerationJobData);
  }

  async generateStream(
    baseId: string,
    aiGenerateRo: IAiGenerateRo,
    response: Response
  ): Promise<void> {
    const { prompt } = aiGenerateRo;
    const modelInstance = await this.getGenerationModelInstance(baseId, aiGenerateRo);

    const result = streamText({
      model: modelInstance,
      prompt: prompt,
    });

    result.pipeTextStreamToResponse(response);
  }

  async generateBuildStream(baseId: string, prompt: string, response: Response): Promise<void> {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Transfer-Encoding', 'chunked');

    const send = (text: string) => response.write(text);

    try {
      send('🔍 Analyse de ta demande...\n\n');

      const modelInstance = await this.getGenerationModelInstance(baseId, { prompt });

      const buildSchemaPrompt = await this.promptService.get(PROMPT_KEY.BUILD_SCHEMA);
      const { text } = await generateText({
        model: modelInstance,
        system: buildSchemaPrompt,
        prompt,
      });

      this.logger.log(`[generateBuildStream] model response: ${text.slice(0, 300)}`);

      // Extract JSON from response (handle possible markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        send(`❌ L'IA n'a pas retourné de JSON valide.\n\nRéponse reçue :\n${text}`);
        response.end();
        return;
      }

      let parsed: {
        tables: Array<{
          name: string;
          description?: string;
          icon?: string;
          fields?: Array<{ name: string; type: string }>;
        }>;
      };

      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        send(`❌ Impossible de parser le JSON retourné par l'IA.\n\nContenu :\n${jsonMatch[0]}`);
        response.end();
        return;
      }

      const tables = parsed.tables ?? [];
      if (tables.length === 0) {
        send("❌ Aucune table trouvée dans la réponse de l'IA.");
        response.end();
        return;
      }

      send(`📋 ${tables.length} table(s) à créer...\n\n`);

      for (const tableSpec of tables) {
        send(`⚙️ Création de la table "${tableSpec.name}"...\n`);
        try {
          const tableRo = prepareCreateTableRo({
            name: tableSpec.name,
            description: tableSpec.description ?? undefined,
            icon: tableSpec.icon ?? undefined,
            fields: tableSpec.fields?.map((f) => ({ name: f.name, type: f.type as FieldType })),
          });
          const table = await this.tableOpenApiService.createTable(baseId, tableRo);
          this.logger.log(
            `[generateBuildStream] created table "${table.name}" (${table.id}) with ${table.fields.length} fields`
          );
          send(`✅ Table "${table.name}" créée avec ${table.fields.length} champs !\n\n`);
        } catch (e) {
          this.logger.error(
            `[generateBuildStream] createTable failed for "${tableSpec.name}": ${e}`
          );
          send(`❌ Erreur pour "${tableSpec.name}": ${String(e)}\n\n`);
        }
      }

      send(`\n🎉 Terminé ! ${tables.length} table(s) créée(s). Rafraîchis la page si besoin.`);
    } catch (e) {
      this.logger.error(`[generateBuildStream] fatal error: ${e}`);
      send(`❌ Erreur inattendue : ${String(e)}`);
    } finally {
      response.end();
    }
  }

  async generateText(baseId: string, aiGenerateRo: IAiGenerateRo) {
    const { prompt } = aiGenerateRo;
    const modelInstance = await this.getGenerationModelInstance(baseId, aiGenerateRo);

    const { text } = await generateText({
      model: modelInstance,
      prompt: prompt,
    });
    return text;
  }

  /**
   * Gateway entry for typed-cell AI generation (per D-16-01, D-16-03).
   *
   * Calling contract:
   * - When the provider supports structured output (openai/anthropic/google for now),
   *   use generateObject({ schema }) — the LLM is constrained at sampling time and
   *   no retry path runs.
   * - Otherwise: generateText() then validate via AiOutputValidationService. On the
   *   first validation failure, retry exactly ONCE with an augmented prompt. On
   *   second failure, return { value: null, validated: false, attempts: 2, error }
   *   — NEVER throws on validation failure.
   *
   * Callers (regenerate endpoint in 16-03, future bulk pipeline) trust this method
   * to surface every error; they must NOT write to the cell when validated:false.
   */
  async generateForField(
    baseId: string,
    field: IFieldInstance,
    prompt: string
  ): Promise<{ value: unknown; validated: boolean; attempts: 1 | 2; error?: string }> {
    const modelInstance = await this.getGenerationModelInstance(baseId, { prompt });

    if (this.isStructuredOutputProvider(modelInstance)) {
      try {
        const schema = getAiOutputSchema(
          field as unknown as { type: FieldType; options?: Record<string, unknown> | null }
        );
        const { object } = await generateObject({
          model: modelInstance,
          schema,
          prompt,
        });
        return { value: object, validated: true, attempts: 1 };
      } catch (err) {
        // generateObject throws on schema-violation; fall through to text+validate path
        // so we still get the 1-retry safety net.
        this.logger.warn(
          `generateObject rejected for field ${field.id}: ${(err as Error).message}; falling back to text+validate`
        );
      }
    }

    // Text + post-validate path (with 1 retry).
    const fieldForValidation = field as unknown as {
      type: FieldType;
      options?: { choices?: { name: string }[]; max?: number } | null;
    };

    const { text: text1 } = await generateText({ model: modelInstance, prompt });
    const r1 = this.aiOutputValidationService.validateAndRepair(fieldForValidation, text1);
    if (r1.ok) {
      return { value: r1.value, validated: true, attempts: 1 };
    }

    this.logger.warn(
      `generateForField validation failed (attempt 1) for field ${field.id}: ${r1.error}`
    );
    const retryPrompt = this.aiOutputValidationService.buildRetryPrompt(
      prompt,
      fieldForValidation,
      r1.error
    );
    const { text: text2 } = await generateText({ model: modelInstance, prompt: retryPrompt });
    const r2 = this.aiOutputValidationService.validateAndRepair(fieldForValidation, text2);
    if (r2.ok) {
      return { value: r2.value, validated: true, attempts: 2 };
    }

    this.logger.error(
      `generateForField validation failed (attempt 2) for field ${field.id}: ${r2.error}`
    );
    return { value: null, validated: false, attempts: 2, error: r2.error };
  }

  /**
   * Provider-support check for structured output (D-16-01 discretion).
   * For v1 use an allow-list of provider ids; future versions can read model
   * metadata once the gateway exposes capability flags.
   */
  private isStructuredOutputProvider(modelInstance: unknown): boolean {
    const provider = (modelInstance as { provider?: string } | null)?.provider ?? '';
    const id = provider.toLowerCase();
    return (
      id.includes('openai') ||
      id.includes('anthropic') ||
      id.includes('google') ||
      id.includes('aigateway')
    );
  }

  async getInstanceAIConfig() {
    if (!this.baseConfig.isCloud) return null;

    const { aiConfig } = await this.settingService.getSetting();

    if (!aiConfig?.chatModel?.lg) return null;

    return aiConfig;
  }

  findModelInProviders(modelKey: string, llmProviders: LLMProvider[]): boolean {
    const { type, model, name } = this.parseModelKey(modelKey);

    const providerConfig = llmProviders.find(
      (p) =>
        p.name.toLowerCase() === name.toLowerCase() &&
        p.type.toLowerCase() === type.toLowerCase() &&
        p.models.includes(model)
    );
    return !!providerConfig;
  }

  /**
   * Check if a model is an instance (platform-provided) model.
   * Instance models use the "@teable" provider name suffix (e.g. "aiGateway@model@teable").
   * BYOK (user-configured) models have a custom provider name.
   */
  checkInstanceAIModel(modelKey: string): boolean {
    return modelKey.endsWith(`@${INSTANCE_PROVIDER_NAME}`);
  }

  async getChatModelInstance(baseId: string) {
    const { chatModel, llmProviders } = await this.getAIConfig(baseId);
    if (!chatModel?.lg) {
      throw new CustomHttpException('AI chat model lg is not set', HttpErrorCode.VALIDATION_ERROR, {
        localization: {
          i18nKey: 'httpErrors.ai.chatModelLgNotSet',
        },
      });
    }

    // Check if lg model is a gateway model
    const isGateway = this.isGatewayModel(chatModel.lg);
    let isInstance = false;

    if (isGateway) {
      // Gateway models are instance-level (from admin config)
      isInstance = true;
    } else {
      // Standard provider lookup
      const { type, model, name } = this.parseModelKey(chatModel?.lg);
      const lgProvider = llmProviders.find(
        (p) =>
          p.name.toLowerCase() === name.toLowerCase() &&
          p.type.toLowerCase() === type.toLowerCase() &&
          p.models.includes(model)
      );
      if (!lgProvider) {
        throw new CustomHttpException(
          'AI chat model lg provider is not set',
          HttpErrorCode.VALIDATION_ERROR,
          {
            localization: {
              i18nKey: 'httpErrors.ai.chatModelLgProviderNotSet',
            },
          }
        );
      }
      isInstance = !!lgProvider.isInstance;
    }

    if (!chatModel?.sm) {
      throw new CustomHttpException('AI chat model sm is not set', HttpErrorCode.VALIDATION_ERROR, {
        localization: {
          i18nKey: 'httpErrors.ai.chatModelSmNotSet',
        },
      });
    }
    if (!chatModel?.md) {
      throw new CustomHttpException('AI chat model md is not set', HttpErrorCode.VALIDATION_ERROR, {
        localization: {
          i18nKey: 'httpErrors.ai.chatModelMdNotSet',
        },
      });
    }

    return {
      sm: await this.getModelInstance(chatModel?.sm, llmProviders),
      md: await this.getModelInstance(chatModel?.md, llmProviders),
      lg: await this.getModelInstance(chatModel?.lg, llmProviders),
      ability: chatModel?.ability,
      isInstance,
      lgModelKey: chatModel.lg,
      mdModelKey: chatModel.md,
      smModelKey: chatModel.sm,
    };
  }

  /**
   * Get gateway model configuration by modelId
   * First checks local gatewayModels config, then falls back to API
   */
  async getGatewayModelConfig(modelId: string) {
    // First check local config (admin-configured models)
    const { aiConfig } = await this.settingService.getSetting([SettingKey.AI_CONFIG]);
    const gatewayModels = aiConfig?.gatewayModels ?? [];
    const localModel = gatewayModels.find((m) => m.id === modelId);
    if (localModel) {
      return localModel;
    }

    // If not found locally, fetch from API (for custom-selected models)
    const apiModel = await this.getGatewayApiModel(modelId);
    if (apiModel) {
      // Convert API model format to local model format
      return {
        ...apiModel,
        label: apiModel.name || apiModel.id,
        enabled: true,
      };
    }

    return undefined;
  }

  /**
   * Get model capability tags for any model (AI Gateway or custom provider)
   * This is the unified method to determine model capabilities like vision, file-input, etc.
   *
   * Priority:
   * 1. AI Gateway: from getGatewayModelConfig().tags
   * 2. Custom Provider: from modelConfigs[model].tags
   * 3. Fallback: convert deprecated ability field to tags (backward compatibility)
   *
   * @param modelKey - Model key in format: type@model@name
   * @param llmProviders - List of configured LLM providers (required for custom providers)
   */
  async getModelTags(modelKey: string, llmProviders: LLMProvider[]): Promise<GatewayModelTag[]> {
    const { type, model, name } = this.parseModelKey(modelKey);

    // AI Gateway models: get tags from gateway config
    if (type === LLMProviderType.AI_GATEWAY) {
      try {
        const gatewayModel = await this.getGatewayModelConfig(model);
        if (gatewayModel) {
          return this.addImageInputTagForImageGeneration(model, gatewayModel.tags ?? []);
        }
      } catch (error) {
        this.logger.warn(`[getModelTags] Failed to get gateway config for ${model}: ${error}`);
      }
      return [];
    }

    // Custom providers: get tags from modelConfigs
    const provider = llmProviders.find((p) => p.type === type && p.name === name);
    const modelConfig = provider?.modelConfigs?.[model];

    // Priority 1: Use tags if available
    if (modelConfig?.tags?.length) {
      return modelConfig.tags;
    }

    // Priority 2: Fallback to converting deprecated ability to tags
    if (modelConfig?.ability) {
      return this.abilityToTags(modelConfig.ability);
    }

    return [];
  }

  private addImageInputTagForImageGeneration(
    modelId: string,
    tags: readonly GatewayModelTag[]
  ): GatewayModelTag[] {
    const nextTags = [...tags];
    // Some image generation models accept image inputs but Gateway may only report
    // image-generation. Add vision so AI fields forward attachment source images.
    if (supportsImageInputForImageGeneration(modelId, nextTags) && !nextTags.includes('vision')) {
      nextTags.push('vision');
    }
    return nextTags;
  }

  /**
   * Convert deprecated IChatModelAbility to GatewayModelTag[]
   * Used for backward compatibility with old ability format
   */
  private abilityToTags(ability: IChatModelAbility): GatewayModelTag[] {
    const tags: GatewayModelTag[] = [];
    if (ability.image) tags.push('vision');
    if (ability.pdf) tags.push('file-input');
    if (ability.toolCall) tags.push('tool-use');
    if (ability.reasoning) tags.push('reasoning');
    if (ability.imageGeneration) tags.push('image-generation');
    return tags;
  }

  /**
   * Get gateway model pricing for billing calculation
   * First checks local gatewayModels config, then falls back to API
   */
  async getGatewayModelPricing(modelId: string) {
    // First check local config (admin-configured models)
    const { aiConfig } = await this.settingService.getSetting([SettingKey.AI_CONFIG]);
    const gatewayModels = aiConfig?.gatewayModels ?? [];
    const localModel = gatewayModels.find((m) => m.id === modelId);
    if (localModel?.pricing) {
      // Normalize handles both camelCase (admin UI) and snake_case (legacy stored data)
      const pricing = normalizeGatewayPricing(localModel.pricing);
      this.logger.debug(
        `[getGatewayModelPricing] Found local pricing for ${modelId}: ${JSON.stringify(pricing)}`
      );
      return pricing;
    }

    // If not found locally, fetch from API (already normalized by convertGatewayApiModel)
    try {
      const apiModel = await this.getGatewayApiModel(modelId);
      if (apiModel?.pricing) {
        this.logger.debug(
          `[getGatewayModelPricing] Found API pricing for ${modelId}: ${JSON.stringify(apiModel.pricing)}`
        );
        return apiModel.pricing;
      }
    } catch (error) {
      this.logger.warn(`[getGatewayModelPricing] Failed to fetch API pricing for ${modelId}`);
    }

    this.logger.debug(
      `[getGatewayModelPricing] No pricing found for ${modelId}, will use default rates`
    );
    return undefined;
  }

  /**
   * Get a specific model from Gateway API
   * Uses Redis cached data if available
   */
  private async getGatewayApiModel(modelId: string): Promise<IGatewayApiModel | undefined> {
    const models = await this.fetchGatewayModelsFromApi();
    const normalize = (s: string) =>
      s.split('/').pop()!.replaceAll('.', '').replaceAll('-', '').toLowerCase();
    const stripDateSuffix = (s: string) => s.replace(/\d{8,}$/, '');
    return models.find((m) => {
      const a = normalize(modelId);
      const b = normalize(m.id);
      if (a === b) return true;
      return stripDateSuffix(a) === stripDateSuffix(b);
    });
  }

  /**
   * Fetch all models from AI Gateway API with in-memory caching
   * This method is also used by setting-open-api.service.ts
   * Cache TTL: 10 minutes (static data, doesn't change frequently)
   */
  async fetchGatewayModelsFromApi(): Promise<IGatewayApiModel[]> {
    // Check in-memory cache first
    if (this.gatewayModelsCache && Date.now() < this.gatewayModelsCache.expiresAt) {
      return this.gatewayModelsCache.data;
    }

    try {
      const response = await axios.get<{ data: IGatewayApiModelRaw[] }>(
        'https://ai-gateway.vercel.sh/v1/models',
        { timeout: 10000 }
      );

      // Convert snake_case API response to camelCase
      const models = (response.data?.data || []).map(convertGatewayApiModel);

      // Update in-memory cache
      this.gatewayModelsCache = {
        data: models,
        expiresAt: Date.now() + gatewayModelsCacheTtl,
      };

      return models;
    } catch (error) {
      // If fetch fails but we have stale cache, return it
      if (this.gatewayModelsCache) {
        this.logger.warn(
          `[fetchGatewayModelsFromApi] Failed to refresh, using stale cache: ${error}`
        );
        return this.gatewayModelsCache.data;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch AI Gateway models: ${errorMessage}`);
    }
  }

  /**
   * Get attachment transfer mode from aiConfig
   * @returns 'url' (default) or 'base64'
   */
  async getAttachmentTransferMode(): Promise<'url' | 'base64'> {
    const { aiConfig } = await this.settingService.getSetting([SettingKey.AI_CONFIG]);
    return aiConfig?.attachmentTransferMode || 'url';
  }

  /**
   * Find the first model that supports vision capability from configured models.
   * Searches in order: gateway models (enabled), then custom llm providers.
   * Returns complete model info to avoid redundant lookups.
   *
   * @param llmProviders - List of configured LLM providers
   * @returns Complete vision model info, or undefined if none found
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async findFirstVisionModel(llmProviders: LLMProvider[]): Promise<
    | {
        modelKey: string;
        modelInstance: ILanguageModelV2;
        isInstance: boolean;
        tags: GatewayModelTag[];
      }
    | undefined
  > {
    const { aiConfig } = await this.settingService.getSetting([SettingKey.AI_CONFIG]);

    // 1. Check gateway models first (they are typically more capable)
    const gatewayModels = aiConfig?.gatewayModels ?? [];
    for (const model of gatewayModels) {
      if (!model.enabled) continue;

      if (model.tags?.includes('vision')) {
        const modelKey = this.buildGatewayModelKey(model.id);
        const modelInstance = await this.getModelInstance(modelKey, llmProviders);
        return {
          modelKey,
          modelInstance,
          isInstance: true, // Gateway models are always instance-level
          tags: model.tags,
        };
      }
    }

    // 2. Check custom LLM providers
    for (const provider of llmProviders) {
      const models = provider.models?.split(',').map((m) => m.trim()) ?? [];
      for (const model of models) {
        const modelConfig = provider.modelConfigs?.[model];
        if (!modelConfig) continue;

        // Check tags (new format) or ability (backward compatibility)
        const hasVision = modelConfig.tags?.includes('vision') || modelConfig.ability?.image;
        if (hasVision) {
          const modelKey = `${provider.type}@${model}@${provider.name}`;
          const modelInstance = await this.getModelInstance(modelKey, llmProviders);
          // Convert ability to tags for backward compatibility
          const tags: GatewayModelTag[] =
            modelConfig.tags ?? this.abilityToTags(modelConfig.ability ?? {});
          return {
            modelKey,
            modelInstance,
            isInstance: !!provider.isInstance,
            tags,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Renders the instance's brand design system (admin "Paramètres de marque" page) as a
   * system-prompt block so AI-generated app interfaces follow the brand's colors,
   * typography, component style, and design principles instead of generic defaults.
   * Returns '' when no brand design system is configured — purely additive.
   */
  private buildBrandDesignSystemPrompt(
    brandName: string | null | undefined,
    designSystem: IBrandDesignSystem | null | undefined
  ): string {
    if (!brandName && !designSystem) return '';

    const principleLabels: Record<string, string> = {
      simplicity: 'Simplicity — minimal UI, no unnecessary elements',
      accessibility: 'Accessibility — WCAG AA contrast, ARIA labels, keyboard navigation',
      consistency: 'Consistency — reuse the same patterns across all screens',
      clarity: 'Clarity — clear hierarchy, obvious actions',
      performance: 'Performance — lightweight markup, no heavy assets',
    };

    const lines: string[] = [];
    if (brandName) lines.push(`Brand: "${brandName}".`);

    const colors = designSystem?.colors;
    if (colors?.length) {
      lines.push(
        `Color palette (use these as the primary colors, e.g. via Tailwind arbitrary values like bg-[#hex]): ` +
          colors.map((c) => `${c.name}=${c.hex}`).join(', ') +
          '.'
      );
    }

    const typography = designSystem?.typography;
    if (typography?.fontFamily) {
      const fontName =
        typography.fontFamily === 'Custom'
          ? typography.customFontName || 'the brand custom font'
          : typography.fontFamily;
      lines.push(`Typography: use "${fontName}" as the primary font family for all text.`);
    }

    const lib = designSystem?.componentLibrary;
    const libParts: string[] = [];
    if (lib?.buttonStyle) libParts.push(`buttons: ${lib.buttonStyle}`);
    if (lib?.formStyle) libParts.push(`form fields: ${lib.formStyle}`);
    if (lib?.navbarStyle) libParts.push(`navigation: ${lib.navbarStyle}`);
    if (libParts.length) lines.push(`Component style — ${libParts.join(', ')}.`);

    if (designSystem?.illustrations?.length) {
      lines.push(
        `Brand illustrations are available at these URLs — use them where relevant (empty states, hero sections, onboarding): ${designSystem.illustrations.join(', ')}`
      );
    }

    const principles = designSystem?.principles;
    if (principles?.length) {
      lines.push(
        `Design principles to respect:\n` +
          principles.map((p) => `- ${principleLabels[p] ?? p}`).join('\n')
      );
    }
    if (designSystem?.customPrinciples) {
      lines.push(`Additional brand principles: ${designSystem.customPrinciples}`);
    }

    if (lines.length === 0) return '';
    return (
      '\n\n## BRAND DESIGN SYSTEM — apply consistently to all generated UI\n' + lines.join('\n')
    );
  }

  async generateAppCodeStream(
    baseId: string,
    prompt: string,
    files: Record<string, string>,
    sendEvent: (event: object) => void,
    modelKey?: string
  ): Promise<void> {
    const tables = await this.tableOpenApiService.getTables(baseId);

    // Pre-fetch schema so all models get it without needing tool use
    sendEvent({ type: 'tool', label: 'Lecture du schéma des tables…' });
    const schema = await Promise.all(
      tables.map(async (t) => {
        const fields = await this.fieldOpenApiService.getFields(t.id, {});
        return {
          id: t.id,
          name: t.name,
          fields: fields.map((f) => ({ id: f.id, name: f.name, type: f.type })),
        };
      })
    );
    const schemaJson = JSON.stringify(schema, null, 2);

    const tools = {
      createFile: {
        description:
          'Create or update a file in the app. The main file must be "app/page.tsx". Export a function App() using global React (no imports). Use Tailwind for styling. Fetch Teable data via relative URLs (/api/base/{baseId}/table/{tableId}/record).',
        parameters: jsonSchema<{ path: string; content: string }>({
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path (e.g., "app/page.tsx")' },
            content: { type: 'string', description: 'File content' },
          },
          required: ['path', 'content'],
        }),
        execute: async ({ path: rawPath, content }: { path: string; content: string }) => {
          const path = rawPath || 'app/page.tsx';
          this.logger.log(
            `[generateAppCodeStream] createFile called: ${path} (${content.length} chars)`
          );
          sendEvent({ type: 'tool', label: `Écriture de ${path}…` });
          files[path] = content;
          sendEvent({ type: 'file', path, content });
          return { success: true };
        },
      },
      setProgress: {
        description: 'Update the task progress shown to the user',
        parameters: jsonSchema<{
          current: number;
          total: number;
          tasks: Array<{ label: string; done: boolean }>;
        }>({
          type: 'object',
          properties: {
            current: { type: 'number' },
            total: { type: 'number' },
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: { label: { type: 'string' }, done: { type: 'boolean' } },
                required: ['label', 'done'],
              },
            },
          },
          required: ['current', 'total', 'tasks'],
        }),
        execute: async ({
          current,
          total,
          tasks,
        }: {
          current: number;
          total: number;
          tasks: Array<{ label: string; done: boolean }>;
        }) => {
          sendEvent({ type: 'progress', current, total, tasks });
          return { success: true };
        },
      },
    };

    sendEvent({ type: 'start', message: "Génération de l'application en cours…" });

    try {
      const modelInstance = await this.getGenerationModelInstance(baseId, { prompt, modelKey });

      const appGeneratePrompt = await this.promptService.get(PROMPT_KEY.APP_GENERATE, modelKey);
      const brandSetting = await this.settingService.getSetting([
        SettingKey.BRAND_NAME,
        SettingKey.BRAND_DESIGN_SYSTEM,
      ]);
      const brandPrompt = this.buildBrandDesignSystemPrompt(
        brandSetting.brandName,
        brandSetting.brandDesignSystem
      );
      const { text } = await generateText({
        model: modelInstance,
        tools,
        stopWhen: stepCountIs(20),
        system:
          appGeneratePrompt +
          `\n\nSCHÉMA DE LA BASE (utilise ces IDs exacts):\n${schemaJson}` +
          AI_FIELD_RENDER_HINT +
          brandPrompt,
        prompt,
      });

      if (text) {
        sendEvent({ type: 'think', message: text });
        // Fallback: if model returned code in text instead of using createFile tool
        if (!files['app/page.tsx']) {
          // ponytail: broad regex — free models use typescript/javascript/react/html or no lang
          const codeMatch = text.match(/```\w*\n([\s\S]*?)```/) ?? text.match(/```([\s\S]*?)```/);
          const content = codeMatch ? codeMatch[1].trim() : text.trim();
          if (content) {
            files['app/page.tsx'] = content;
            sendEvent({ type: 'file', path: 'app/page.tsx', content });
          }
        }
      }
      sendEvent({ type: 'done' });
    } catch (e) {
      this.logger.error(`[generateAppCodeStream] error: ${e}`);
      sendEvent({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  /**
   * Generate a view configuration from a natural language prompt.
   * Returns a partial IViewRo the caller can POST to /api/table/:tableId/view.
   */
  async generateViewConfig(
    baseId: string,
    tableId: string,
    prompt: string,
    modelKey?: string
  ): Promise<{
    type: string;
    name: string;
    sort?: { sortObjs: Array<{ fieldId: string; order: 'asc' | 'desc' }> };
    filter?: {
      conjunction: 'and' | 'or';
      filterSet: Array<{ fieldId: string; operator: string; value: unknown }>;
    };
    columnMeta?: Record<string, { hidden: boolean }>;
  }> {
    const fields = await this.fieldOpenApiService.getFields(tableId, {});
    const fieldList = fields.map((f) => `- ${f.name} (id: ${f.id}, type: ${f.type})`).join('\n');

    const modelInstance = await this.getGenerationModelInstance(baseId, { prompt, modelKey });

    const { object } = await generateObject({
      model: modelInstance,
      system: `You are a database view designer. Given a user's description, generate a view configuration for a table.

Available fields:
${fieldList}

Rules:
- type must be one of: grid, gallery, kanban, form, calendar, gantt
- name must be short and descriptive (max 50 chars)
- sort.sortObjs: use fieldId from the field list above; order is "asc" or "desc"
- filter.filterSet: use fieldId from the field list; operator depends on field type (e.g. "=", "!=", ">", "<", "contains", "doesNotContain", "isEmpty", "isNotEmpty", "isAnyOf"); value is the raw comparison value
- filter.conjunction: "and" or "or"
- columnMeta: map fieldId → {hidden: true} for fields that should be hidden
- Only include sort/filter/columnMeta if the user description implies them
- Prefer grid type unless the user explicitly requests another`,
      prompt,
      schema: z.object({
        type: z.enum(['grid', 'gallery', 'kanban', 'form', 'calendar', 'gantt']),
        name: z.string().max(50),
        sort: z
          .object({
            sortObjs: z.array(z.object({ fieldId: z.string(), order: z.enum(['asc', 'desc']) })),
          })
          .optional(),
        filter: z
          .object({
            conjunction: z.enum(['and', 'or']),
            filterSet: z.array(
              z.object({ fieldId: z.string(), operator: z.string(), value: z.unknown() })
            ),
          })
          .optional(),
        columnMeta: z.record(z.string(), z.object({ hidden: z.boolean() })).optional(),
      }),
    });

    return object;
  }

  async generateWorkflowConfig(
    baseId: string,
    prompt: string,
    sendEvent: (event: object) => void,
    modelKey?: string
  ): Promise<void> {
    const tables = await this.tableOpenApiService.getTables(baseId);

    const tools = {
      readTableSchema: {
        description: 'Read the schema (tables + fields) to understand the data structure',
        parameters: { type: 'object', properties: {}, required: [] } as const,
        execute: async () => {
          sendEvent({ type: 'tool', label: 'Lecture du schéma…' });
          const schemas = await Promise.all(
            tables.map(async (t) => {
              const fields = await this.fieldOpenApiService.getFields(t.id, {});
              return {
                id: t.id,
                name: t.name,
                fields: fields.map((f) => ({ id: f.id, name: f.name, type: f.type })),
              };
            })
          );
          return schemas;
        },
      },
      setWorkflowConfig: {
        description:
          'Finalize the workflow with its name and complete IWorkflowConfig. Call once when ready.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Workflow name (short, descriptive)' },
            config: {
              type: 'object',
              description:
                'IWorkflowConfig: { trigger: ITriggerConfig | null, steps: IStepConfig[] }',
            },
          },
          required: ['name', 'config'],
        } as const,
        execute: async ({ name, config }: { name: string; config: unknown }) => {
          sendEvent({ type: 'config', name, config });
          return { success: true };
        },
      },
    };

    sendEvent({ type: 'start', message: "Génération de l'automatisation…" });

    const tableList = tables.map((t) => `- ${t.name} (ID: ${t.id})`).join('\n');

    try {
      const modelInstance = await this.getGenerationModelInstance(baseId, { prompt, modelKey });

      const workflowBuildPrompt = await this.promptService.get(PROMPT_KEY.WORKFLOW_BUILD, modelKey);
      const { text } = await generateText({
        model: modelInstance,
        tools: tools as never,
        stopWhen: stepCountIs(10) as never,
        system: workflowBuildPrompt + `\nTables disponibles:\n${tableList}`,
        prompt,
      });

      if (text) sendEvent({ type: 'think', message: text });
      sendEvent({ type: 'done' });
    } catch (e) {
      this.logger.error(`[generateWorkflowConfig] error: ${e}`);
      sendEvent({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  async generateImportAnalysis(
    baseId: string,
    prompt: string,
    worksheets: Record<string, unknown>,
    response: Response,
    modelKey?: string
  ): Promise<void> {
    response.setHeader('Content-Type', 'application/x-ndjson');
    response.setHeader('Transfer-Encoding', 'chunked');

    const sendEvent = (event: object) => response.write(JSON.stringify(event) + '\n');

    let finalWorksheets: Record<string, unknown> = worksheets;

    const tools = {
      setImportConfig: {
        description:
          'Finalize the import configuration with optimized column names and field types. You MUST preserve sourceColumnIndex on every column — it is required for data import.',
        parameters: {
          type: 'object',
          properties: {
            worksheets: {
              type: 'object',
              description:
                'Record<sheetKey, sheetItem>. Each sheetItem has: name (string), importData (boolean), useFirstRowAsHeader (boolean), columns (array of column objects).',
              additionalProperties: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  importData: { type: 'boolean' },
                  useFirstRowAsHeader: { type: 'boolean' },
                  columns: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          description: 'Display name for the field — you may rename this',
                        },
                        type: {
                          type: 'string',
                          description: 'Field type',
                          enum: [
                            'singleLineText',
                            'longText',
                            'number',
                            'checkbox',
                            'singleSelect',
                            'multipleSelect',
                            'date',
                            'attachment',
                            'url',
                            'email',
                            'rating',
                            'currency',
                            'percent',
                            'duration',
                          ],
                        },
                        sourceColumnIndex: {
                          type: 'number',
                          description: 'MUST be preserved exactly as received — do not change',
                        },
                      },
                      required: ['name', 'type', 'sourceColumnIndex'],
                    },
                  },
                },
                required: ['name', 'importData', 'useFirstRowAsHeader', 'columns'],
              },
            },
          },
          required: ['worksheets'],
        } as const,
        execute: async ({ worksheets: ws }: { worksheets: Record<string, unknown> }) => {
          finalWorksheets = ws;
          sendEvent({ type: 'config', worksheets: ws });
          return { success: true };
        },
      },
    };

    sendEvent({ type: 'start', message: 'Analyse du fichier en cours…' });

    const schemaDescription = JSON.stringify(worksheets, null, 2);

    try {
      const modelInstance = await this.getGenerationModelInstance(baseId, { prompt, modelKey });
      const importAnalyzePrompt = await this.promptService.get(PROMPT_KEY.IMPORT_ANALYZE, modelKey);
      const fullPrompt = `Instruction utilisateur: "${prompt}"\n\nSchéma actuel du fichier:\n${schemaDescription}`;

      // Phase 1: stream analysis text tokens
      const streamResult = streamText({
        model: modelInstance,
        system: importAnalyzePrompt,
        prompt: `${fullPrompt}\n\nAnalyse le schéma et explique brièvement les changements que tu vas appliquer (noms de colonnes, types de champs). Sois concis.`,
      });

      for await (const chunk of streamResult.textStream) {
        sendEvent({ type: 'chunk', text: chunk });
      }

      // Phase 2: forced tool call to apply the config
      await generateText({
        model: modelInstance,
        tools: tools as never,
        toolChoice: { type: 'tool', toolName: 'setImportConfig' } as never,
        system: importAnalyzePrompt,
        prompt: fullPrompt,
      });

      sendEvent({ type: 'done', worksheets: finalWorksheets });
    } catch (e) {
      this.logger.error(`[generateImportAnalysis] error: ${e}`);
      sendEvent({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      response.end();
    }
  }

  async generateAgentStream(
    baseId: string,
    prompt: string,
    response: Response,
    modelKey?: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<void> {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Transfer-Encoding', 'chunked');

    const send = (text: string) => response.write(text);

    const tables = await this.tableOpenApiService.getTables(baseId);
    const tableMap = new Map(tables.map((t) => [t.id, t.name]));

    const tools = {
      listTables: {
        description: 'List all tables in the current base with their IDs and names',
        parameters: { type: 'object', properties: {}, required: [] } as const,
        execute: async () => {
          send(`📋 Listing tables...\n`);
          return tables.map((t) => ({ id: t.id, name: t.name }));
        },
      },
      getTableFields: {
        description: 'Get all fields (columns) of a table',
        parameters: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The table ID' },
          },
          required: ['tableId'],
        } as const,
        execute: async ({ tableId }: { tableId: string }) => {
          if (!tableId)
            return { error: 'tableId is required — call listTables first to get valid IDs' };
          const tableName = tableMap.get(tableId) ?? tableId;
          send(`🔎 Getting fields for table "${tableName}"...\n`);
          const fields = await this.fieldOpenApiService.getFields(tableId, {});
          return fields.map((f) => ({ id: f.id, name: f.name, type: f.type }));
        },
      },
      getRecords: {
        description: 'Get records from a table (max 100)',
        parameters: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The table ID' },
            take: { type: 'number', description: 'Number of records to fetch (default 20)' },
          },
          required: ['tableId'],
        } as const,
        execute: async ({ tableId, take }: { tableId: string; take?: number }) => {
          const tableName = tableMap.get(tableId) ?? tableId;
          send(`📥 Fetching records from "${tableName}"...\n`);
          const result = await this.recordOpenApiV2Service.getRecords(tableId, {
            take: Math.min(take ?? 20, 100),
          });
          return result.records;
        },
      },
      createRecords: {
        description: 'Create one or more records in a table',
        parameters: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The table ID' },
            records: {
              type: 'array',
              description:
                'Array of records to create. Each record has a "fields" object mapping field name to value.',
              items: {
                type: 'object',
                properties: {
                  fields: { type: 'object', description: 'Field name -> value pairs' },
                },
                required: ['fields'],
              },
            },
          },
          required: ['tableId', 'records'],
        } as const,
        execute: async ({
          tableId,
          records,
        }: {
          tableId: string;
          records: Array<{ fields: Record<string, unknown> }> | string | unknown;
        }) => {
          const tableName = tableMap.get(tableId) ?? tableId;

          // Normalize: AI sometimes passes records as a JSON string or wrapped object
          let normalized: Array<{ fields: Record<string, unknown> }>;
          if (typeof records === 'string') {
            try {
              normalized = JSON.parse(records);
            } catch {
              normalized = [];
            }
          } else if (Array.isArray(records)) {
            normalized = records;
          } else if (
            records &&
            typeof records === 'object' &&
            Array.isArray((records as Record<string, unknown>).records)
          ) {
            normalized = (records as { records: Array<{ fields: Record<string, unknown> }> })
              .records;
          } else {
            normalized = [];
          }

          // Hard cap — prevent accidental mass inserts
          const maxRecords = 50;
          if (normalized.length > maxRecords) {
            send(`⚠️ Capping insert from ${normalized.length} to ${maxRecords} records\n`);
            normalized = normalized.slice(0, maxRecords);
          }

          if (normalized.length === 0) {
            send(`❌ No valid records to insert into "${tableName}"\n`);
            return { error: 'records must be a non-empty array of { fields: {...} } objects' };
          }

          send(`✍️ Inserting ${normalized.length} record(s) into "${tableName}"...\n`);
          try {
            const result = await this.recordOpenApiService.createRecords(
              tableId,
              { records: normalized.map((r) => ({ fields: r.fields ?? r })) },
              true
            );
            send(`✅ ${result.records.length} record(s) created in "${tableName}"\n`);
            return { created: result.records.length, ids: result.records.map((r) => r.id) };
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            send(`❌ Error inserting into "${tableName}": ${msg}\n`);
            return { error: msg };
          }
        },
      },
      countRecords: {
        description: 'Count records in a table',
        parameters: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The table ID' },
          },
          required: ['tableId'],
        } as const,
        execute: async ({ tableId }: { tableId: string }) => {
          const tableName = tableMap.get(tableId) ?? tableId;
          send(`🔢 Counting records in "${tableName}"...\n`);
          const result = await this.recordOpenApiV2Service.getRecords(tableId, { take: 1 });
          return { tableId, tableName, count: result.records.length };
        },
      },
    };

    try {
      send(`🤖 Agent started...\n\n`);

      const modelInstance = await this.getGenerationModelInstance(baseId, { prompt, modelKey });

      const chatSystemPrompt = await this.promptService.get(PROMPT_KEY.CHAT_SYSTEM, modelKey);

      // Build message list: prior history (excluding empty assistant stubs) + new user turn
      const priorMessages = (history ?? []).filter((m) => m.content.trim());
      const useHistory = priorMessages.length > 0;
      const { text, steps } = await generateText({
        model: modelInstance,
        tools: tools as never,
        stopWhen: stepCountIs(20) as never,
        system: chatSystemPrompt,
        ...(useHistory
          ? { messages: [...priorMessages, { role: 'user' as const, content: prompt }] }
          : { prompt }),
      });

      this.logger.log(
        `[generateAgentStream] completed in ${steps.length} steps. Final text: ${text.slice(0, 200)}`
      );

      // Detect whether the model actually called any tools
      const anyToolCalls = steps.some((s) => (s as { toolCalls?: unknown[] }).toolCalls?.length);
      if (!anyToolCalls && steps.length <= 1) {
        send(
          `\n⚠️ Le modèle sélectionné ne supporte pas les appels d'outils (function calling) — il a répondu en texte libre sans accéder à vos données.\n` +
            `Sélectionnez un modèle compatible (ex : GPT-4o, Claude, Mistral-large) dans le sélecteur de modèle, puis réessayez.\n`
        );
      }

      if (text) {
        send(`\n${text}\n`);
      }
    } catch (e) {
      this.logger.error(`[generateAgentStream] fatal error: ${e}`);
      const errStr = String(e);
      const isRateLimit =
        errStr.includes('rate-limit') || errStr.includes('rate_limit') || errStr.includes('429');
      if (isRateLimit) {
        send(
          `\n⚠️ Le modèle est temporairement limité (rate limit). Réessayez dans quelques secondes, ou sélectionnez un autre modèle.`
        );
      } else {
        send(`\n❌ Erreur inattendue : ${errStr}`);
      }
    } finally {
      response.end();
    }
  }

  async generateTableCreationStream(
    baseId: string,
    prompt: string,
    sendEvent: (event: object) => void,
    modelKey?: string
  ): Promise<void> {
    sendEvent({ type: 'start', message: 'Analyse de votre demande…' });

    const modelInstance = await this.getGenerationModelInstance(baseId, { prompt, modelKey });

    const tools = {
      readExistingTables: {
        description: 'Read existing tables in the base to understand the data model context',
        parameters: { type: 'object', properties: {} } as const,
        execute: async () => {
          sendEvent({ type: 'tool', label: 'Lecture des tables existantes…' });
          const tables = await this.tableOpenApiService.getTables(baseId);
          return tables.map((t) => ({ id: t.id, name: t.name, description: t.description }));
        },
      },
      createTable: {
        description: 'Create a new table with AI-generated fields based on the user description',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Table name' },
            description: { type: 'string', description: 'Table description (optional)' },
            icon: { type: 'string', description: 'Emoji icon (optional)' },
            fields: {
              type: 'array',
              description: 'List of fields to create',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: [
                      'singleLineText',
                      'longText',
                      'number',
                      'singleSelect',
                      'multipleSelect',
                      'date',
                      'checkbox',
                      'rating',
                      'attachment',
                      'email',
                      'url',
                      'phoneNumber',
                      'currency',
                      'percent',
                      'duration',
                      'link',
                    ],
                  },
                  description: { type: 'string', description: 'Field description (optional)' },
                  foreignTableId: {
                    type: 'string',
                    description:
                      'Required when type is "link": target table id (from readExistingTables)',
                  },
                  relationship: {
                    type: 'string',
                    enum: ['manyOne', 'oneMany', 'manyMany', 'oneOne'],
                    description: 'Link relationship; defaults to "manyOne" (FK-style)',
                  },
                },
                required: ['name', 'type'],
              },
            },
          },
          required: ['name', 'fields'],
        } as const,
        execute: async ({
          name,
          description,
          icon,
          fields,
        }: {
          name: string;
          description?: string;
          icon?: string;
          fields: Array<{
            name: string;
            type: string;
            description?: string;
            foreignTableId?: string;
            relationship?: 'manyOne' | 'oneMany' | 'manyMany' | 'oneOne';
          }>;
        }) => {
          sendEvent({ type: 'tool', label: `Création de la table "${name}"…` });
          try {
            const tableRo = prepareCreateTableRo({
              name,
              description: description ?? undefined,
              icon: icon ?? undefined,
              fields: fields.map((f) =>
                f.type === 'link' && f.foreignTableId
                  ? {
                      name: f.name,
                      type: FieldType.Link,
                      options: {
                        foreignTableId: f.foreignTableId,
                        relationship: (f.relationship ?? 'manyOne') as Relationship,
                      },
                    }
                  : { name: f.name, type: f.type as FieldType }
              ),
            });
            const table = await this.tableOpenApiService.createTable(baseId, tableRo);
            sendEvent({ type: 'config', name: table.name, tableId: table.id });
            return {
              success: true,
              tableId: table.id,
              name: table.name,
              fieldCount: table.fields.length,
            };
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { success: false, error: msg };
          }
        },
      },
    };

    try {
      const tableCreatePrompt = await this.promptService.get(PROMPT_KEY.TABLE_CREATE, modelKey);
      const result = streamText({
        model: modelInstance,
        tools: tools as never,
        stopWhen: stepCountIs(5) as never,
        system: tableCreatePrompt,
        prompt,
      });

      for await (const part of (
        result as { fullStream: AsyncIterable<{ type: string; textDelta?: string }> }
      ).fullStream) {
        if (part.type === 'text-delta' && part.textDelta) {
          sendEvent({ type: 'chunk', text: part.textDelta });
        }
      }

      sendEvent({ type: 'done' });
    } catch (e) {
      this.logger.error(`[generateTableCreationStream] error: ${e}`);
      sendEvent({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }
}
