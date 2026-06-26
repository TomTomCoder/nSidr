import { axios } from '../axios';
import { urlBuilder } from '../utils';
import type { IAppVo } from './types';

const DUPLICATE_APP = '/base/{baseId}/app/{appId}/duplicate';

export const duplicateApp = async (baseId: string, appId: string) => {
  return axios.post<IAppVo>(urlBuilder(DUPLICATE_APP, { baseId, appId }));
};
