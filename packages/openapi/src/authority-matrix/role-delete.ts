import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';

export const DELETE_AUTHORITY_MATRIX_ROLE =
  '/base/{baseId}/authority-matrix/{matrixId}/role/{roleId}';

export const DeleteAuthorityMatrixRoleRoute: RouteConfig = registerRoute({
  method: 'delete',
  path: DELETE_AUTHORITY_MATRIX_ROLE,
  description: 'Delete a role from an authority matrix',
  request: {
    params: z.object({ baseId: z.string(), matrixId: z.string(), roleId: z.string() }),
  },
  responses: {
    204: {
      description: 'Deleted',
    },
  },
  tags: ['authority-matrix'],
});

export const deleteAuthorityMatrixRole = async (
  baseId: string,
  matrixId: string,
  roleId: string
) => {
  return axios.delete(urlBuilder(DELETE_AUTHORITY_MATRIX_ROLE, { baseId, matrixId, roleId }));
};
