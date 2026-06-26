export interface IWorkflowVo {
  id: string;
  name: string;
  baseId: string;
  isActive: boolean;
  config?: unknown;
}
