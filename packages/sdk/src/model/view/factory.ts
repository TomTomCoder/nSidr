import type { IViewVo } from '@teable/core';
import { assertNever, ViewType } from '@teable/core';
import type { Doc } from 'sharedb/lib/client';
import { CalendarView } from './calendar.view';
import { FormView } from './form.view';
import { GalleryView } from './gallery.view';
import { GanttView } from './gantt.view';
import { GridView } from './grid.view';
import { KanbanView } from './kanban.view';
import { PluginView } from './plugin.view';

// PERF: replaced class-transformer's plainToInstance with prototype-stamping.
// View subclasses have no @Type/@Transform decorators. See record/factory.ts.
type IViewCtor<C> = new (...args: never[]) => C;
const stamp = <C extends object>(cls: IViewCtor<C>, data: object): C =>
  Object.assign(Object.create(cls.prototype) as C, data);

export function createViewInstance(view: IViewVo, doc?: Doc<IViewVo>) {
  const instance = (() => {
    switch (view.type) {
      case ViewType.Grid:
        return stamp(GridView, view);
      case ViewType.Kanban:
        return stamp(KanbanView, view);
      case ViewType.Form:
        return stamp(FormView, view);
      case ViewType.Gallery:
        return stamp(GalleryView, view);
      case ViewType.Plugin:
        return stamp(PluginView, view);
      case ViewType.Calendar:
        return stamp(CalendarView, view);
      case ViewType.Gantt:
        return stamp(GanttView, view);
      default:
        assertNever(view.type);
    }
  })();

  // force inject object into instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const temp: any = instance;
  temp.doc = doc;
  temp.tableId = doc?.collection.split('_')[1];
  return instance;
}

export type IViewInstance = ReturnType<typeof createViewInstance>;
