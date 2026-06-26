import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute } from '../utils';
import { z } from '../zod';
import { getUserIntegrationItemVoSchema } from './list';
import { UserIntegrationProvider } from './types';

export const CREATE_USER_INTEGRATION = '/user-integrations';

export const createUserIntegrationRoSchema = z.object({
  provider: z.enum(UserIntegrationProvider),
  name: z.string(),
  // Bring-your-own OAuth app. Optional: when omitted the server-configured
  // credentials are used (if any).
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
});

export type ICreateUserIntegrationRo = z.infer<typeof createUserIntegrationRoSchema>;

export const createUserIntegrationRoute: RouteConfig = registerRoute({
  method: 'post',
  path: CREATE_USER_INTEGRATION,
  description: 'Create a pending user integration (optionally with custom OAuth credentials)',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createUserIntegrationRoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Created',
      content: {
        'application/json': {
          schema: getUserIntegrationItemVoSchema,
        },
      },
    },
  },
  tags: ['user-integration'],
});

export const createUserIntegration = async (ro: ICreateUserIntegrationRo) => {
  return await axios.post(CREATE_USER_INTEGRATION, ro);
};
