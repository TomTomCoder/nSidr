import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';

export const DELETE_AUTHORITY_MATRIX = '/base/{baseId}/authority-matrix/{matrixId}';

export const DeleteAuthorityMatrixRoute: RouteConfig = registerRoute({
  method: 'delete',
  path: DELETE_AUTHORITY_MATRIX,
  description: 'Delete an authority matrix',
  request: {
    params: z.object({ baseId: z.string(), matrixId: z.string() }),
  },
  responses: {
    204: {
      description: 'Deleted',
    },
  },
  tags: ['authority-matrix'],
});

export const deleteAuthorityMatrix = async (baseId: string, matrixId: string) => {
  return axios.delete(urlBuilder(DELETE_AUTHORITY_MATRIX, { baseId, matrixId }));
};
