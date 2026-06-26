import { axios } from '../axios';
import { urlBuilder } from '../utils';

const DELETE_APP = '/base/{baseId}/app/{appId}';

export const deleteApp = async (baseId: string, appId: string) => {
  return axios.delete<{ success: boolean }>(urlBuilder(DELETE_APP, { baseId, appId }));
};
