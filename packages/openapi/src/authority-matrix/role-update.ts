import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';
import { authorityMatrixRoleVoSchema } from './get';
import type { IAuthorityMatrixRoleVo } from './get';

export const UPDATE_AUTHORITY_MATRIX_ROLE =
  '/base/{baseId}/authority-matrix/{matrixId}/role/{roleId}';

export const updateAuthorityMatrixRoleRoSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  actions: z.array(z.string()).optional(),
});

export type IUpdateAuthorityMatrixRoleRo = z.infer<typeof updateAuthorityMatrixRoleRoSchema>;

export type IUpdateAuthorityMatrixRoleVo = IAuthorityMatrixRoleVo;

export const UpdateAuthorityMatrixRoleRoute: RouteConfig = registerRoute({
  method: 'patch',
  path: UPDATE_AUTHORITY_MATRIX_ROLE,
  description: 'Update a role in an authority matrix',
  request: {
    params: z.object({ baseId: z.string(), matrixId: z.string(), roleId: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: updateAuthorityMatrixRoleRoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Returns the updated authority matrix role.',
      content: {
        'application/json': {
          schema: authorityMatrixRoleVoSchema,
        },
      },
    },
  },
  tags: ['authority-matrix'],
});

export const updateAuthorityMatrixRole = async (
  baseId: string,
  matrixId: string,
  roleId: string,
  ro: IUpdateAuthorityMatrixRoleRo
) => {
  return axios.patch<IUpdateAuthorityMatrixRoleVo>(
    urlBuilder(UPDATE_AUTHORITY_MATRIX_ROLE, { baseId, matrixId, roleId }),
    ro
  );
};
