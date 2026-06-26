import { axios } from '../../axios';
import { urlBuilder } from '../../utils';
import type { IWorkflowVo } from './types';

const GET_WORKFLOW = '/base/{baseId}/workflow/{workflowId}';

export const getWorkflow = async (baseId: string, workflowId: string) => {
  return axios.get<IWorkflowVo>(urlBuilder(GET_WORKFLOW, { baseId, workflowId }));
};
