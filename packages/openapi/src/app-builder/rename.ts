import { axios } from '../axios';
import { urlBuilder } from '../utils';

const RENAME_APP = '/base/{baseId}/app/{appId}/name';

export const renameApp = async (baseId: string, appId: string, name: string) => {
  return axios.patch<{ success: boolean }>(urlBuilder(RENAME_APP, { baseId, appId }), { name });
};
