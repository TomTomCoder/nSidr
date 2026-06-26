import { axios } from '../../axios';
import { urlBuilder } from '../../utils';
import type { IWorkflowVo } from './types';

const LIST_WORKFLOWS = '/base/{baseId}/workflow';

export const listWorkflows = async (baseId: string) => {
  return axios.get<IWorkflowVo[]>(urlBuilder(LIST_WORKFLOWS, { baseId }));
};
