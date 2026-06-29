import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../../axios';
import { registerRoute, urlBuilder } from '../../utils';
import { z } from '../../zod';

export const UPLOAD_BRAND_ASSET = '/admin/setting/brand-asset';

export const brandAssetKindSchema = z.enum(['illustration', 'font']);

export type IBrandAssetKind = z.infer<typeof brandAssetKindSchema>;

export const uploadBrandAssetRoSchema = z.object({
  file: z.string().meta({ format: 'binary' }),
  kind: brandAssetKindSchema,
});

export const uploadBrandAssetVoSchema = z.object({
  url: z.string(),
});

export type IUploadBrandAssetVo = z.infer<typeof uploadBrandAssetVoSchema>;

export type IUploadBrandAssetRo = z.infer<typeof uploadBrandAssetRoSchema>;

export const UploadBrandAssetRoute: RouteConfig = registerRoute({
  method: 'patch',
  path: UPLOAD_BRAND_ASSET,
  description: 'Upload a brand design-system asset (illustration image or custom font file)',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: uploadBrandAssetRoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successfully uploaded brand asset.',
      content: {
        'application/json': {
          schema: uploadBrandAssetVoSchema,
        },
      },
    },
  },
  tags: ['admin'],
});

export const uploadBrandAsset = async (uploadBrandAssetRo: IUploadBrandAssetRo) => {
  return axios.patch<IUploadBrandAssetVo>(urlBuilder(UPLOAD_BRAND_ASSET), uploadBrandAssetRo);
};
