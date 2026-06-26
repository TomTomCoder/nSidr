import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';

export const GET_AUTHORITY_MATRIX = '/base/{baseId}/authority-matrix/{matrixId}';

export const authorityMatrixRoleVoSchema = z.object({
  id: z.string(),
  authorityMatrixId: z.string(),
  name: z.string(),
  actions: z.array(z.string()),
  createdTime: z.string(),
  createdBy: z.string(),
});

export type IAuthorityMatrixRoleVo = z.infer<typeof authorityMatrixRoleVoSchema>;

export const authorityMatrixVoSchema = z.object({
  id: z.string(),
  baseId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  createdTime: z.string(),
  createdBy: z.string(),
  roles: z.array(authorityMatrixRoleVoSchema),
});

export type IAuthorityMatrixVo = z.infer<typeof authorityMatrixVoSchema>;

export const GetAuthorityMatrixRoute: RouteConfig = registerRoute({
  method: 'get',
  path: GET_AUTHORITY_MATRIX,
  description: 'Get an authority matrix by id',
  request: {
    params: z.object({ baseId: z.string(), matrixId: z.string() }),
  },
  responses: {
    200: {
      description: 'Returns the authority matrix.',
      content: {
        'application/json': {
          schema: authorityMatrixVoSchema,
        },
      },
    },
  },
  tags: ['authority-matrix'],
});

export const getAuthorityMatrix = async (baseId: string, matrixId: string) => {
  return axios.get<IAuthorityMatrixVo>(urlBuilder(GET_AUTHORITY_MATRIX, { baseId, matrixId }));
};
