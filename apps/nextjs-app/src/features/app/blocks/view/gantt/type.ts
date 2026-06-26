export interface GanttBarItem {
  recordId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  isMilestone: boolean;
  isCriticalPath: boolean;
  rowIndex: number;
}

export interface GanttDependency {
  fromRecordId: string;
  toRecordId: string;
}
