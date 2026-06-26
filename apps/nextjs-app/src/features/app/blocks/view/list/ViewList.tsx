import { useTablePermission, useViewId, useViews, useIsHydrated } from '@teable/sdk';
import { horizontalListSortingStrategy } from '@teable/ui-lib/base/dnd-kit';
import { cn } from '@teable/ui-lib/shadcn';
import { useCallback, useState } from 'react';
import { DraggableWrapper } from './DraggableWrapper';
import { ViewListItem } from './ViewListItem';

export const ViewList = () => {
  const views = useViews();
  const activeViewId = useViewId();
  const isHydrated = useIsHydrated();
  const permission = useTablePermission();
  const editable = permission['view|update'];
  const [editing, setEditing] = useState(false);

  // Stable so memoized ViewListItem children don't see a new `onEdit` identity
  // on every parent render (which would defeat React.memo on those items).
  const handleEdit = useCallback((value: boolean) => setEditing(value), []);
  const removable = !!permission['view|delete'] && views.length > 1;

  return isHydrated && editable ? (
    views.length ? (
      <DraggableWrapper strategy={horizontalListSortingStrategy}>
        {({ setNodeRef, attributes, listeners, style, isDragging, view }) => (
          <div
            ref={setNodeRef}
            {...attributes}
            {...(editing ? {} : listeners)}
            style={style}
            className={cn('relative', {
              'opacity-50': isDragging,
            })}
          >
            <ViewListItem
              onEdit={handleEdit}
              view={view}
              removable={removable}
              isActive={view.id === activeViewId}
            />
          </div>
        )}
      </DraggableWrapper>
    ) : (
      <></>
    )
  ) : (
    <>
      {views.map((view) => (
        <ViewListItem
          key={view.id}
          onEdit={handleEdit}
          view={view}
          removable={removable}
          isActive={view.id === activeViewId}
        />
      ))}
    </>
  );
};
