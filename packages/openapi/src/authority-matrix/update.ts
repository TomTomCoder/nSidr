import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';

export const UPDATE_AUTHORITY_MATRIX = '/base/{baseId}/authority-matrix/{matrixId}';

export const updateAuthorityMatrixRoSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
});

export type IUpdateAuthorityMatrixRo = z.infer<typeof updateAuthorityMatrixRoSchema>;

export const updateAuthorityMatrixVoSchema = z.object({
  id: z.string(),
  baseId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  createdTime: z.string(),
  createdBy: z.string(),
  lastModifiedTime: z.string().nullable().optional(),
  lastModifiedBy: z.string().nullable().optional(),
});

export type IUpdateAuthorityMatrixVo = z.infer<typeof updateAuthorityMatrixVoSchema>;

export const UpdateAuthorityMatrixRoute: RouteConfig = registerRoute({
  method: 'patch',
  path: UPDATE_AUTHORITY_MATRIX,
  description: 'Update an authority matrix',
  request: {
    params: z.object({ baseId: z.string(), matrixId: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: updateAuthorityMatrixRoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Returns the updated authority matrix.',
      content: {
        'application/json': {
          schema: updateAuthorityMatrixVoSchema,
        },
      },
    },
  },
  tags: ['authority-matrix'],
});

export const updateAuthorityMatrix = async (
  baseId: string,
  matrixId: string,
  ro: IUpdateAuthorityMatrixRo
) => {
  return axios.patch<IUpdateAuthorityMatrixVo>(
    urlBuilder(UPDATE_AUTHORITY_MATRIX, { baseId, matrixId }),
    ro
  );
};
