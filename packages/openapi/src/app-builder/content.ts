import { axios } from '../axios';
import { urlBuilder } from '../utils';

const APP_CONTENT = '/base/{baseId}/app/{appId}/content';

export const getAppContent = async (baseId: string, appId: string) => {
  return axios.get<unknown>(urlBuilder(APP_CONTENT, { baseId, appId }));
};

export const updateAppContent = async (baseId: string, appId: string, content: unknown) => {
  return axios.patch<{ success: boolean }>(urlBuilder(APP_CONTENT, { baseId, appId }), {
    content,
  });
};
