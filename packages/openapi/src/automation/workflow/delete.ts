import { axios } from '../../axios';
import { urlBuilder } from '../../utils';

const DELETE_WORKFLOW = '/base/{baseId}/workflow/{workflowId}';

export const deleteWorkflow = async (baseId: string, workflowId: string) => {
  return axios.delete<{ success: boolean }>(urlBuilder(DELETE_WORKFLOW, { baseId, workflowId }));
};
