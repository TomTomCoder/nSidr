import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { AxiosResponse } from 'axios';
import { z } from 'zod';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';

export const REGENERATE_AI_CELL = '/table/{tableId}/record/{recordId}/{fieldId}/regenerate';

export const regenerateAiCellVoSchema = z.object({
  value: z.unknown().nullable(),
  validated: z.boolean(),
  attempts: z.union([z.literal(1), z.literal(2)]),
  error: z.string().optional(),
});

export type IRegenerateAiCellVo = z.infer<typeof regenerateAiCellVoSchema>;

export const RegenerateAiCellRoute: RouteConfig = registerRoute({
  method: 'post',
  path: REGENERATE_AI_CELL,
  summary: 'Regenerate a single AI-cell',
  description:
    'Re-runs the AI generation pipeline for a single AI-generation cell (FieldType.Ai). ' +
    'Routes through the AiService gateway (D-16-03), validates per-output-type Zod schema ' +
    '(D-16-01) with one retry, and writes via the same updateRecord op-event path as cell ' +
    'edits. Returns { value, validated, attempts, error? } — validation failures surface ' +
    'verbatim and the existing cell value is left unchanged.',
  request: {
    params: z.object({
      tableId: z.string(),
      recordId: z.string(),
      fieldId: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'AI regenerate result (success or validation-fail surface)',
      content: {
        'application/json': {
          schema: regenerateAiCellVoSchema,
        },
      },
    },
  },
  tags: ['record'],
});

export async function regenerateAiCell(
  tableId: string,
  recordId: string,
  fieldId: string
): Promise<AxiosResponse<IRegenerateAiCellVo>> {
  return axios.post<IRegenerateAiCellVo>(
    urlBuilder(REGENERATE_AI_CELL, { tableId, recordId, fieldId })
  );
}
