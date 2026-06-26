import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';

export const CREATE_AUTHORITY_MATRIX = '/base/{baseId}/authority-matrix';

export const createAuthorityMatrixRoSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export type ICreateAuthorityMatrixRo = z.infer<typeof createAuthorityMatrixRoSchema>;

export const createAuthorityMatrixVoSchema = z.object({
  id: z.string(),
  baseId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  createdTime: z.string(),
  createdBy: z.string(),
});

export type ICreateAuthorityMatrixVo = z.infer<typeof createAuthorityMatrixVoSchema>;

export const CreateAuthorityMatrixRoute: RouteConfig = registerRoute({
  method: 'post',
  path: CREATE_AUTHORITY_MATRIX,
  description: 'Create an authority matrix for a base',
  request: {
    params: z.object({ baseId: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: createAuthorityMatrixRoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Returns the created authority matrix.',
      content: {
        'application/json': {
          schema: createAuthorityMatrixVoSchema,
        },
      },
    },
  },
  tags: ['authority-matrix'],
});

export const createAuthorityMatrix = async (baseId: string, ro: ICreateAuthorityMatrixRo) => {
  return axios.post<ICreateAuthorityMatrixVo>(urlBuilder(CREATE_AUTHORITY_MATRIX, { baseId }), ro);
};
