import { ViewType } from '@teable/core';
import {
  Sheet,
  ClipboardList as Form,
  LayoutGrid as Gallery,
  Kanban,
  Component,
  Calendar,
  GanttChart,
} from '@teable/icons';

export const VIEW_ICON_MAP = {
  [ViewType.Grid]: Sheet,
  [ViewType.Kanban]: Kanban,
  [ViewType.Gallery]: Gallery,
  [ViewType.Calendar]: Calendar,
  [ViewType.Gantt]: GanttChart,
  [ViewType.Form]: Form,
  [ViewType.Plugin]: Component,
};
