import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';
import { authorityMatrixRoleVoSchema } from './get';
import type { IAuthorityMatrixRoleVo } from './get';

export const CREATE_AUTHORITY_MATRIX_ROLE = '/base/{baseId}/authority-matrix/{matrixId}/role';

export const createAuthorityMatrixRoleRoSchema = z.object({
  name: z.string().min(1).max(255),
  // actions is z.array(z.string()) — backend validates each value against the Action enum from @teable/core
  // and rejects unknown actions with 400 (T-02-01 mitigation)
  actions: z.array(z.string()).default([]),
});

export type ICreateAuthorityMatrixRoleRo = z.infer<typeof createAuthorityMatrixRoleRoSchema>;

export type ICreateAuthorityMatrixRoleVo = IAuthorityMatrixRoleVo;

export const CreateAuthorityMatrixRoleRoute: RouteConfig = registerRoute({
  method: 'post',
  path: CREATE_AUTHORITY_MATRIX_ROLE,
  description: 'Create a role in an authority matrix',
  request: {
    params: z.object({ baseId: z.string(), matrixId: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: createAuthorityMatrixRoleRoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Returns the created authority matrix role.',
      content: {
        'application/json': {
          schema: authorityMatrixRoleVoSchema,
        },
      },
    },
  },
  tags: ['authority-matrix'],
});

export const createAuthorityMatrixRole = async (
  baseId: string,
  matrixId: string,
  ro: ICreateAuthorityMatrixRoleRo
) => {
  return axios.post<ICreateAuthorityMatrixRoleVo>(
    urlBuilder(CREATE_AUTHORITY_MATRIX_ROLE, { baseId, matrixId }),
    ro
  );
};
