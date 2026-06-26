import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';
import { authorityMatrixVoSchema } from './get';

export const GET_AUTHORITY_MATRIX_LIST = '/base/{baseId}/authority-matrix';

export const getAuthorityMatrixListVoSchema = z.object({
  list: z.array(authorityMatrixVoSchema),
});

export type IGetAuthorityMatrixListVo = z.infer<typeof getAuthorityMatrixListVoSchema>;

export const GetAuthorityMatrixListRoute: RouteConfig = registerRoute({
  method: 'get',
  path: GET_AUTHORITY_MATRIX_LIST,
  description: 'Get all authority matrices for a base',
  request: {
    params: z.object({ baseId: z.string() }),
  },
  responses: {
    200: {
      description: 'Returns the list of authority matrices.',
      content: {
        'application/json': {
          schema: getAuthorityMatrixListVoSchema,
        },
      },
    },
  },
  tags: ['authority-matrix'],
});

export const getAuthorityMatrixList = async (baseId: string) => {
  return axios.get<IGetAuthorityMatrixListVo>(urlBuilder(GET_AUTHORITY_MATRIX_LIST, { baseId }));
};
