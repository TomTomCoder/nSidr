import type { IViewInstance } from '@teable/sdk';
import { useViews } from '@teable/sdk';
import { DndKitContext, Draggable, Droppable } from '@teable/ui-lib/base/dnd-kit';
import type { SortingStrategy, DragEndEvent, useSortable } from '@teable/ui-lib/base/dnd-kit';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type IProvidedProps = ReturnType<typeof useSortable> & {
  style: React.CSSProperties;
  view: IViewInstance;
};

export const DraggableWrapper = ({
  strategy,
  children,
}: {
  strategy: SortingStrategy;
  children: (props: IProvidedProps) => ReactElement;
}) => {
  const views = useViews();

  const [innerViews, setInnerViews] = useState([...views]);

  useEffect(() => {
    setInnerViews(views);
  }, [views]);

  // Refs let onDragEndHandler stay referentially stable across renders even as
  // views/innerViews change every table switch — otherwise DndKitContext re-inits
  // and re-measures every droppable (~470ms `getBoundingClientRect` storm).
  const viewsRef = useRef(views);
  viewsRef.current = views;
  const innerViewsRef = useRef(innerViews);
  innerViewsRef.current = innerViews;

  const onDragEndHandler = useCallback(async (event: DragEndEvent) => {
    const { over, active } = event;
    if (!over) return;
    const to = over?.data?.current?.sortable?.index;
    const from = active?.data?.current?.sortable?.index;
    const currentInner = innerViewsRef.current;
    const currentViews = viewsRef.current;
    const newViews = [...currentInner];

    const [moveView] = newViews.splice(from, 1);
    const view = currentViews[from];

    newViews.splice(to, 0, moveView);
    setInnerViews(newViews);

    const viewIndex = newViews.findIndex((v) => v.id === view.id);
    if (viewIndex == 0) {
      await view?.updateOrder({ anchorId: newViews[1].id, position: 'before' });
    } else {
      await view?.updateOrder({ anchorId: newViews[viewIndex - 1].id, position: 'after' });
    }
  }, []);

  // Stable items array so `Droppable` doesn't re-measure droppables every render.
  const droppableItems = useMemo(() => innerViews.map(({ id }) => ({ id })), [innerViews]);

  return (
    <DndKitContext onDragEnd={onDragEndHandler}>
      <Droppable items={droppableItems} strategy={strategy}>
        {innerViews.map((view) => (
          <Draggable key={view.id} id={view.id}>
            {(props) => children({ ...props, view })}
          </Draggable>
        ))}
      </Droppable>
    </DndKitContext>
  );
};
