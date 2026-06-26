import { axios } from '../axios';
import { urlBuilder } from '../utils';
import type { IAppVo } from './types';

const LIST_APPS = '/base/{baseId}/app';

export const listApps = async (baseId: string) => {
  return axios.get<IAppVo[]>(urlBuilder(LIST_APPS, { baseId }));
};
