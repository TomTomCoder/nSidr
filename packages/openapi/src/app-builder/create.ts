import { axios } from '../axios';
import { urlBuilder } from '../utils';
import type { IAppVo } from './types';

const CREATE_APP = '/base/{baseId}/app';

export const createApp = async (baseId: string, name?: string) => {
  return axios.post<IAppVo>(urlBuilder(CREATE_APP, { baseId }), { name });
};
