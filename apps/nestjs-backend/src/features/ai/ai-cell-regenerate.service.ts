/**
 * ai-cell-regenerate.service.ts
 *
 * Orchestrates single-AI-cell regeneration (Phase 16 D-16-02 + D-16-03).
 *
 * This service was extracted from RecordOpenApiService (Phase 16 commits
 * ef2aea316 + 1c8bb3031) because injecting AiService into RecordOpenApiService
 * closed a runtime circular import: setting-open-api.service.ts already imports
 * INSTANCE_PROVIDER_NAME from ai.service, so loading ai.service for the new
 * record-side injection hit a TDZ at boot.
 *
 * Architectural rule established: AI orchestration that needs both AiService
 * AND RecordOpenApiService lives HERE (one-way edge: ai → record), never inside
 * record-open-api.service.ts. RecordOpenApiService stays focused on raw CRUD
 * and never imports from the AI feature directory.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { FieldAIActionType, FieldKeyType, FieldType, HttpErrorCode } from '@teable/core';
import type { ITextFieldCustomizeAIConfig, ITextFieldSummarizeAIConfig } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import type { IRegenerateAiCellVo } from '@teable/openapi';
import { CustomHttpException } from '../../custom.exception';
import { extractFieldReferences } from '../../utils';
import { FieldService } from '../field/field.service';
import { createFieldInstanceByVo } from '../field/model/factory';
import type { IFieldInstance } from '../field/model/factory';
import { RecordOpenApiService } from '../record/open-api/record-open-api.service';
import { RecordService } from '../record/record.service';
import { AiService } from './ai.service';

@Injectable()
export class AiCellRegenerateService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly recordService: RecordService,
    private readonly fieldService: FieldService,
    private readonly aiService: AiService,
    private readonly recordOpenApiService: RecordOpenApiService
  ) {}

  /**
   * Regenerate a single AI cell (per D-16-02 + D-16-03).
   *
   * Flow:
   *  1. Load field instance + assert FieldType.Ai (else 400).
   *  2. Resolve baseId from tableId.
   *  3. Build prompt from the field's aiConfig + the row's source-field values
   *     (mirrors the bulk auto-fill pipeline's prompt-assembly).
   *  4. Delegate to AiService.generateForField (gateway, validation, 1 retry).
   *  5. On validated:true → write via RecordOpenApiService.updateRecord — same
   *     op-event path as cell edits, so collaborators see the update.
   *  6. Return the result verbatim (caller surfaces error on validated:false).
   */
  async regenerateAiCell(
    tableId: string,
    recordId: string,
    fieldId: string
  ): Promise<IRegenerateAiCellVo> {
    const fieldVo = await this.fieldService.getField(tableId, fieldId);
    // getField() returns a parsed VO (aiConfig/options are objects), so use the VO
    // factory — createFieldInstanceByRaw would JSON.parse the already-parsed aiConfig
    // ("[object Object]" is not valid JSON → 500 on regenerate).
    const field = createFieldInstanceByVo(fieldVo);

    if (field.type !== FieldType.Ai) {
      throw new BadRequestException(
        `Field ${fieldId} is not an AI-generation field (type=${field.type})`
      );
    }

    const tableMeta = await this.prismaService.txClient().tableMeta.findFirst({
      where: { id: tableId, deletedTime: null },
      select: { baseId: true },
    });
    if (!tableMeta) {
      throw new CustomHttpException(`Table ${tableId} not found`, HttpErrorCode.NOT_FOUND, {
        localization: { i18nKey: 'httpErrors.table.notFound' },
      });
    }
    const baseId = tableMeta.baseId;

    const prompt = await this.buildAiPromptForCell(tableId, recordId, field);
    const result = await this.aiService.generateForField(baseId, field, prompt);

    if (result.validated && result.value !== null && result.value !== undefined) {
      await this.recordOpenApiService.updateRecord(
        tableId,
        recordId,
        {
          fieldKeyType: FieldKeyType.Id,
          record: { fields: { [fieldId]: result.value } },
        },
        undefined,
        'true' /* isAiInternal */
      );
    }

    return {
      value: result.value as IRegenerateAiCellVo['value'],
      validated: result.validated,
      attempts: result.attempts,
      error: result.error,
    };
  }

  /**
   * Build the AI prompt for a single cell using the field's aiConfig.
   * Mirrors the bulk pipeline's substitution rules:
   *  - Customization / ImageCustomization → `prompt` with {fldXXX} substitutions
   *    replaced by the record's source-field values.
   *  - Other action types (Summary, Extraction, Translation, Improvement,
   *    Classification, Tag, Rating, ImageGeneration) → `sourceFieldId` mode,
   *    where the LLM receives the source cell's value plus a per-type instruction.
   */
  private async buildAiPromptForCell(
    tableId: string,
    recordId: string,
    field: IFieldInstance
  ): Promise<string> {
    const aiConfig = field.aiConfig;
    if (!aiConfig) {
      throw new BadRequestException(`Field ${field.id} has no aiConfig`);
    }
    const actionType = (aiConfig as { type?: FieldAIActionType }).type;

    const record = await this.recordService.getRecord(
      tableId,
      recordId,
      { fieldKeyType: FieldKeyType.Id },
      true,
      false
    );
    const rowFields = record.fields as Record<string, unknown>;

    if (
      actionType === FieldAIActionType.Customization ||
      actionType === FieldAIActionType.ImageCustomization
    ) {
      const tmpl = (aiConfig as ITextFieldCustomizeAIConfig).prompt;
      const referencedIds = extractFieldReferences(tmpl);
      let resolved = tmpl;
      for (const refId of referencedIds) {
        const v = rowFields[refId];
        const repr =
          v === undefined || v === null ? '' : typeof v === 'string' ? v : JSON.stringify(v);
        resolved = resolved.replaceAll(`{${refId}}`, repr);
      }
      return resolved;
    }

    const sourceFieldId = (aiConfig as ITextFieldSummarizeAIConfig).sourceFieldId;
    const sourceValue = sourceFieldId ? rowFields[sourceFieldId] : undefined;
    const sourceRepr =
      sourceValue === undefined || sourceValue === null
        ? ''
        : typeof sourceValue === 'string'
          ? sourceValue
          : JSON.stringify(sourceValue);

    const verbByType: Partial<Record<FieldAIActionType, string>> = {
      [FieldAIActionType.Summary]: 'Summarize the following content:',
      [FieldAIActionType.Translation]: 'Translate the following content:',
      [FieldAIActionType.Improvement]: 'Improve the following text:',
      [FieldAIActionType.Extraction]:
        'Extract the relevant information from the following content:',
      [FieldAIActionType.Classification]:
        'Classify the following content into one of the configured categories:',
      [FieldAIActionType.Tag]:
        'Tag the following content with the most relevant configured options:',
      [FieldAIActionType.Rating]: 'Rate the following content on the configured scale:',
      [FieldAIActionType.ImageGeneration]: 'Generate an image based on the following description:',
    };
    const verb = actionType
      ? verbByType[actionType] ?? 'Process the following content:'
      : 'Process the following content:';
    return `${verb}\n\n${sourceRepr}`;
  }
}
