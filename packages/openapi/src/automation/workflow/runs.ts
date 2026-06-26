import { axios } from '../../axios';
import { urlBuilder } from '../../utils';

const LIST_WORKFLOW_RUNS = '/base/{baseId}/workflow/{workflowId}/runs';

export interface IWorkflowRunHistoryItem {
  runId: string;
  workflowId: string;
  trigger: string;
  startedAt: string;
  durationMs: number;
  status: 'success' | 'error' | 'dry_run';
  steps: Array<{ type: string; status: string; note: string; output?: unknown }>;
}

export const listWorkflowRuns = async (baseId: string, workflowId: string) => {
  return axios.get<IWorkflowRunHistoryItem[]>(
    urlBuilder(LIST_WORKFLOW_RUNS, { baseId, workflowId })
  );
};
