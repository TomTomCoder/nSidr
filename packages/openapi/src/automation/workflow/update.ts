import { axios } from '../../axios';
import { urlBuilder } from '../../utils';
import type { IWorkflowVo } from './types';

const UPDATE_WORKFLOW = '/base/{baseId}/workflow/{workflowId}';

export interface IUpdateWorkflowRo {
  name?: string;
  isActive?: boolean;
  config?: unknown;
}

export const updateWorkflow = async (
  baseId: string,
  workflowId: string,
  updateRo: IUpdateWorkflowRo
) => {
  return axios.patch<IWorkflowVo>(urlBuilder(UPDATE_WORKFLOW, { baseId, workflowId }), updateRo);
};
