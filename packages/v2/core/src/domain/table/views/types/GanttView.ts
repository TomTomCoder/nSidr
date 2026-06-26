import { ok } from 'neverthrow';
import type { Result } from 'neverthrow';

import type { DomainError } from '../../../shared/DomainError';
import { View } from '../View';
import type { ViewId } from '../ViewId';
import type { ViewName } from '../ViewName';
import { ViewType } from '../ViewType';
import type { IViewVisitor } from '../visitors/IViewVisitor';

export class GanttView extends View {
  private constructor(id: ViewId, name: ViewName) {
    super(id, name, ViewType.gantt());
  }

  static create(params: { id: ViewId; name: ViewName }): Result<GanttView, DomainError> {
    return ok(new GanttView(params.id, params.name));
  }

  accept<T = void>(visitor: IViewVisitor<T>): Result<T, DomainError> {
    return visitor.visitGanttView(this);
  }
}
