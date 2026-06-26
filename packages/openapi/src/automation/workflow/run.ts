import { axios } from '../../axios';
import { urlBuilder } from '../../utils';

const RUN_WORKFLOW = '/base/{baseId}/workflow/{workflowId}/run';

export interface IWorkflowRunVo {
  status: string;
  trigger: unknown;
  steps: Array<{ type: string; status: string; note: string; output?: Record<string, unknown> }>;
}

export const runWorkflow = async (baseId: string, workflowId: string) => {
  return axios.post<IWorkflowRunVo>(urlBuilder(RUN_WORKFLOW, { baseId, workflowId }));
};
