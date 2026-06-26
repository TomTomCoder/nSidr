'use client';

import { useQueryClient } from '@tanstack/react-query';
import { FieldKeyType } from '@teable/core';
import { MoreHorizontal } from '@teable/icons';
import type {
  IBaseNodeVo,
  IBaseNodeWorkflowResourceMeta,
  IBaseNodeAppResourceMeta,
} from '@teable/openapi';
import {
  BaseNodeResourceType,
  getFields,
  getRecords,
  getTablePermission,
  getTaskStatusCollection,
  getViewList,
} from '@teable/openapi';
import { LocalStorageKeys, ReactQueryKeys } from '@teable/sdk/config';
import { useBaseId, useBasePermission } from '@teable/sdk/hooks';
import {
  AssistiveTreeDescription,
  createOnDropHandler,
  dragAndDropFeature,
  hotkeysCoreFeature,
  keyboardDragAndDropFeature,
  selectionFeature,
  syncDataLoaderFeature,
  useTree,
} from '@teable/ui-lib/base/headless-tree';
import type { DragTarget, ItemInstance } from '@teable/ui-lib/base/headless-tree';
import AddBoldIcon from '@teable/ui-lib/icons/app/add-bold.svg';
import { Button, cn, Input, Skeleton } from '@teable/ui-lib/shadcn';
import { ScrollArea, ScrollBar } from '@teable/ui-lib/shadcn/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@teable/ui-lib/shadcn/ui/tooltip';
import { Tree, TreeDragLine, TreeItem, TreeItemLabel } from '@teable/ui-lib/shadcn/ui/tree';
import { ChevronDownIcon } from 'lucide-react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useClickAway, useLocalStorage } from 'react-use';
import { Emoji } from '@/features/app/components/emoji/Emoji';
import { EmojiPicker } from '@/features/app/components/emoji/EmojiPicker';
import { useShareUrlPrefix } from '@/features/app/context/ShareContext';
import { useBaseResource } from '@/features/app/hooks/useBaseResource';
import { useDisableAIAction } from '@/features/app/hooks/useDisableAIAction';
import { useIsCommunity } from '@/features/app/hooks/useIsCommunity';
import { useSetting } from '@/features/app/hooks/useSetting';
import { usePinMap } from '../../space/usePinMap';
import { useTableHref } from '../../table-list/useTableHref';
import { useGridSearchStore } from '../../view/grid/useGridSearchStore';
import {
  BaseNodeResourceIconMap,
  getNodeIcon,
  getNodeName,
  getNodeUrl,
  ROOT_ID,
  useBaseNodeCrud,
} from '../base-node/hooks';
import type { TreeItemData } from '../base-node/hooks';
import { useBaseNodeContext } from '../base-node/hooks/useBaseNodeContext';
import { BaseNodeAddResourceButton } from './BaseNodeAddResourceButton';
import { BaseNodeMore } from './BaseNodeMore';
import { BaseNodeShareIndicator, useSharedNodeIds } from './BaseNodeShareIndicator';
import { BaseNodeStarButton } from './BaseNodeStarButton';

const INDENTATION_WIDTH = 24;
const GROUP_ACTIVE_WIDTH_CLS =
  'group-hover:w-auto group-has-[[data-state=open]]:w-auto group-data-[context-menu]:w-auto';
const GROUP_ACTIVE_OPACITY_CLS =
  'group-hover:opacity-100 group-has-[[data-state=open]]:opacity-100 group-data-[context-menu]:opacity-100';
const GROUP_ACTIVE_HIDDEN_CLS =
  'group-hover:hidden group-has-[[data-state=open]]:hidden group-data-[context-menu]:hidden';
const SCROLL_EDGE_THRESHOLD = 60; // pixels from edge to trigger scroll
const SCROLL_MAX_SPEED = 15; // max pixels per frame

// Custom hook for auto-scroll during drag
const useDragAutoScroll = (viewportRef: React.RefObject<HTMLDivElement | null>) => {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let scrollSpeed = 0;

    const scroll = () => {
      if (scrollSpeed !== 0) {
        viewport.scrollTop += scrollSpeed;
        rafRef.current = requestAnimationFrame(scroll);
      } else {
        rafRef.current = null;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      const rect = viewport.getBoundingClientRect();
      const y = e.clientY;
      const distanceFromTop = y - rect.top;
      const distanceFromBottom = rect.bottom - y;

      if (distanceFromTop < SCROLL_EDGE_THRESHOLD) {
        // Accelerate based on proximity to edge
        const ratio = 1 - distanceFromTop / SCROLL_EDGE_THRESHOLD;
        scrollSpeed = -Math.round(SCROLL_MAX_SPEED * ratio);
        if (!rafRef.current) rafRef.current = requestAnimationFrame(scroll);
      } else if (distanceFromBottom < SCROLL_EDGE_THRESHOLD) {
        const ratio = 1 - distanceFromBottom / SCROLL_EDGE_THRESHOLD;
        scrollSpeed = Math.round(SCROLL_MAX_SPEED * ratio);
        if (!rafRef.current) rafRef.current = requestAnimationFrame(scroll);
      } else {
        scrollSpeed = 0;
      }
    };

    const stopScroll = () => {
      scrollSpeed = 0;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    viewport.addEventListener('dragover', handleDragOver);
    viewport.addEventListener('dragend', stopScroll);
    viewport.addEventListener('drop', stopScroll);

    return () => {
      viewport.removeEventListener('dragover', handleDragOver);
      viewport.removeEventListener('dragend', stopScroll);
      viewport.removeEventListener('drop', stopScroll);
      stopScroll();
    };
  }, [viewportRef]);
};

type TreeMode = 'view' | 'edit';

interface IBaseNodeTreeProps {
  mode?: TreeMode;
  emptyText?: string;
  skeleton?: React.ReactNode;
  onPrimaryAction?: (item: ItemInstance<TreeItemData>) => void;
}

// Hoisted to module scope so their component identity is stable across renders.
// Previously these were defined inside BaseNodeTree, so every render produced a
// new component type and React remounted the icon/status subtree of every tree
// row — a large, avoidable DOM churn on each table switch.
const ItemIcon = ({
  item,
  canUpdateTable,
  updateNode,
}: {
  item: ItemInstance<TreeItemData>;
  canUpdateTable: boolean;
  updateNode: (nodeId: string, ro: { icon?: string }) => void;
}) => {
  const nodeId = item.getId();
  const data = item.getItemData();
  if (!data) return null;
  const IconComponent = BaseNodeResourceIconMap[data.resourceType];
  const { resourceType } = data;
  const icon = getNodeIcon(data);
  const isFolder = item.isFolder();
  if (isFolder) {
    return (
      <ChevronDownIcon className="size-4 text-muted-foreground group-aria-[expanded=false]:-rotate-90" />
    );
  }
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="flex size-4 shrink-0 cursor-pointer items-center justify-center"
      onClick={(e) => e.stopPropagation()}
    >
      {resourceType === BaseNodeResourceType.Table && (
        <EmojiPicker
          className="flex size-full items-center justify-center hover:bg-muted-foreground/60"
          onChange={(icon: string) => updateNode(nodeId, { icon })}
          disabled={!canUpdateTable}
        >
          {icon ? <Emoji emoji={icon} size="1rem" /> : <IconComponent className="size-full" />}
        </EmojiPicker>
      )}
      {resourceType !== BaseNodeResourceType.Table && <IconComponent className="size-full" />}
    </div>
  );
};

const ItemStatus = ({ item }: { item: ItemInstance<TreeItemData> }) => {
  const node = item.getItemData();
  if (!node) return null;
  const { resourceType, resourceMeta } = node;
  const isWorkflowActive =
    resourceType === BaseNodeResourceType.Workflow &&
    (resourceMeta as IBaseNodeWorkflowResourceMeta)?.isActive;
  const isAppPublished =
    resourceType === BaseNodeResourceType.App &&
    (resourceMeta as IBaseNodeAppResourceMeta)?.publicUrl;
  if (isWorkflowActive || isAppPublished) {
    return <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />;
  }
  return null;
};

export const BaseNodeTree = (props: IBaseNodeTreeProps) => {
  const { mode = 'edit', emptyText, onPrimaryAction } = props;
  const isEditMode = mode === 'edit';
  const queryClient = useQueryClient();
  const { t } = useTranslation(['common']);
  const baseId = useBaseId() as string;
  const router = useRouter();
  const baseResource = useBaseResource();
  const { highlightedTableId } = useGridSearchStore();
  const { hrefMap: tableHrefMap, viewIdMap: tableViewIdsMap } = useTableHref();
  const permission = useBasePermission();
  const { aiChat: aiChatEnabled } = useDisableAIAction();
  const { disallowDashboard } = useSetting();
  const pinMap = usePinMap();
  const isCommunity = useIsCommunity();
  const shareUrlPrefix = useShareUrlPrefix();
  const canCreateTable = Boolean(permission?.['table|create']);
  const canCreateDashboard = Boolean(permission?.['base|update'] && !disallowDashboard);
  const canCreateWorkflow = !isCommunity && Boolean(permission?.['automation|create']);
  const canCreateApp = !isCommunity && Boolean(aiChatEnabled && permission?.['app|create']);
  const canCreateFolder = Boolean(permission?.['base|update']);
  const canUpdateTable = Boolean(permission?.['table|update']);

  const canCreateResource =
    isEditMode &&
    Boolean(
      canCreateTable || canCreateDashboard || canCreateWorkflow || canCreateApp || canCreateFolder
    );
  const canMoveNode = isEditMode && Boolean(permission?.['base|update']);
  const { sharedNodeIds } = useSharedNodeIds();

  const { isLoading, maxFolderDepth, treeItems, setTreeItems } = useBaseNodeContext();
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
    resourceType: BaseNodeResourceType;
    resourceId: string;
  } | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const draggedItemsRef = useRef<ItemInstance<TreeItemData>[]>([]);
  const treeItemsRef = useRef(treeItems);
  const viewportRef = useRef<HTMLDivElement>(null);
  const focusedNodeIdRef = useRef<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedItemsMap, setExpandedItemsMap] = useLocalStorage<Record<string, string[]>>(
    LocalStorageKeys.BaseNodeTreeExpandedItems,
    {}
  );
  const [expandedItems, setExpandedItems] = useState<string[]>(expandedItemsMap?.[baseId] ?? []);
  useEffect(() => {
    setExpandedItemsMap((prev) => {
      return {
        ...prev,
        [baseId]: expandedItems,
      };
    });
  }, [expandedItems, baseId, setExpandedItemsMap]);

  const getItemUrl = useCallback(
    (item: ItemInstance<TreeItemData>): string | null => {
      const node = item.getItemData();
      const { resourceType, resourceId } = node;

      if (resourceType === BaseNodeResourceType.Table) {
        const url = tableHrefMap[resourceId];
        if (url) return url;
      }

      const urlObj = getNodeUrl({
        baseId,
        resourceType,
        resourceId,
        urlPrefix: shareUrlPrefix,
      });
      return urlObj?.pathname ?? null;
    },
    [baseId, tableHrefMap, shareUrlPrefix]
  );

  const handleModifierClick = useCallback(
    (e: React.MouseEvent, item: ItemInstance<TreeItemData>) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      if (e.metaKey || e.ctrlKey) {
        const url = getItemUrl(item);
        if (url) {
          e.preventDefault();
          e.stopPropagation();
          window.open(url, '_blank');
        }
      }
    },
    [getItemUrl]
  );

  // Prefetch fields, views, and top-of-viewport records for a table.
  // Used by both hover (sync, on intent) and the idle-time background warm.
  // queryClient.prefetchQuery is a no-op if data is already fresh (staleTime respected),
  // so calling this repeatedly is safe and cheap once the cache is hot.
  const prefetchTable = useCallback(
    (tableId: string) => {
      queryClient.prefetchQuery({
        queryKey: ReactQueryKeys.fieldList(tableId),
        queryFn: () => getFields(tableId).then((r) => r.data),
        staleTime: 30_000,
      });
      queryClient.prefetchQuery({
        queryKey: ReactQueryKeys.viewList(tableId),
        queryFn: () => getViewList(tableId).then((r) => r.data),
        staleTime: 30_000,
      });
      // Permission key is stable (baseId, tableId) — TablePermissionProvider reads
      // exactly this key, so the prefetch reliably saves the ~13ms REST call on
      // switch. Same for task-status-collection (tableId only). Aggregation/rowCount
      // queries include personal-view state in the key, so a generic prefetch
      // would miss the consumer's actual key; left for a future selector refactor.
      queryClient.prefetchQuery({
        queryKey: ReactQueryKeys.getTablePermission(baseId, tableId),
        queryFn: () => getTablePermission(baseId, tableId).then((r) => r.data),
        staleTime: 30_000,
      });
      queryClient.prefetchQuery({
        queryKey: ReactQueryKeys.getTaskStatusCollection(tableId),
        queryFn: () => getTaskStatusCollection(tableId).then((r) => r.data),
        staleTime: 30_000,
      });
      const viewId = tableViewIdsMap[tableId];
      if (viewId) {
        queryClient.prefetchQuery({
          queryKey: ['record-seed', tableId, viewId],
          queryFn: () =>
            getRecords(tableId, {
              viewId,
              fieldKeyType: FieldKeyType.Id,
              take: 30,
            }).then((r) => r.data.records),
          staleTime: 30_000,
        });
      }
    },
    [queryClient, baseId, tableViewIdsMap]
  );

  // Hover-time prefetch: confirms intent so we never miss a tap by 50ms.
  const handleMouseEnter = useCallback(
    (item: ItemInstance<TreeItemData>) => {
      const node = item.getItemData();
      if (node?.resourceType !== BaseNodeResourceType.Table) return;
      prefetchTable(node.resourceId);
    },
    [prefetchTable]
  );

  // Idle-time background warm: as soon as the base mounts, prefetch every sibling
  // table's fields/views/records. Future switches read from cache without a
  // network round-trip. Capped to the first 12 tables to avoid flooding very large
  // bases; the rest still get hover-warmed on demand.
  const activeTableId =
    baseResource.resourceType === BaseNodeResourceType.Table ? baseResource.tableId : undefined;
  useEffect(() => {
    const ids = Object.keys(tableViewIdsMap)
      .filter((id) => id !== activeTableId)
      .slice(0, 12);
    if (ids.length === 0) return;

    const schedule =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((window as any).requestIdleCallback as (
            cb: () => void,
            opts?: { timeout: number }
          ) => number)
        : (cb: () => void) => setTimeout(cb, 200) as unknown as number;
    const cancel =
      typeof window !== 'undefined' && 'cancelIdleCallback' in window
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((window as any).cancelIdleCallback as (id: number) => void)
        : (id: number) => clearTimeout(id);

    const handles: number[] = [];
    ids.forEach((tableId, i) => {
      // Stagger so we don't issue 36 parallel REST calls at once.
      handles.push(schedule(() => prefetchTable(tableId), { timeout: 2000 + i * 250 }));
    });
    return () => handles.forEach((h) => cancel(h));
  }, [tableViewIdsMap, activeTableId, prefetchTable]);

  const handlePrimaryAction = useCallback(
    (item: ItemInstance<TreeItemData>) => {
      if (onPrimaryAction) {
        onPrimaryAction(item);
        return;
      }
      const node = item.getItemData();
      const { resourceType, resourceId } = node;
      // Share pages need full navigation (no shallow) so getServerSideProps runs
      const isSharePage = Boolean(shareUrlPrefix);
      if (resourceType === BaseNodeResourceType.Table) {
        const viewId = tableViewIdsMap[resourceId];
        const url = tableHrefMap[resourceId];
        if (url) {
          // Mark the table switch as a non-urgent transition. React keeps the
          // previous table painted while the new tree builds, instead of
          // blanking the canvas and stalling for the full reconciliation.
          // Effect on perceived latency is larger than the actual render-time
          // win because the user no longer sees a "loading" gap.
          startTransition(() => {
            router.push({ pathname: url }, undefined, {
              shallow: !isSharePage && Boolean(viewId),
            });
          });
          return;
        }
      }

      const url = getNodeUrl({
        baseId,
        resourceType,
        resourceId,
        urlPrefix: shareUrlPrefix,
      });
      if (!url) return;
      router.push(url, undefined, {
        shallow: !isSharePage,
      });
    },
    [baseId, router, tableHrefMap, tableViewIdsMap, onPrimaryAction, shareUrlPrefix]
  );

  const handleDrop = (items: ItemInstance<TreeItemData>[], target: DragTarget<TreeItemData>) => {
    const handler = createOnDropHandler<TreeItemData>((parentItem, newChildrenIds) => {
      setTreeItems((prevItems) => ({
        ...prevItems,
        [parentItem.getId()]: {
          ...prevItems[parentItem.getId()],
          children: newChildrenIds,
        },
      }));

      if (draggedItemsRef.current.length > 0) {
        const draggedItem = draggedItemsRef.current[0];
        const draggedNodeId = draggedItem.getId();
        const newIndex = newChildrenIds.indexOf(draggedNodeId);

        if (newIndex !== -1) {
          const parentId = parentItem.getId() === ROOT_ID ? null : parentItem.getId();
          let anchorId: string | undefined;
          let position: 'before' | 'after' | undefined;

          if (newIndex > 0 && newChildrenIds[newIndex - 1]) {
            anchorId = newChildrenIds[newIndex - 1];
            position = 'after';
          } else if (newChildrenIds[newIndex + 1]) {
            anchorId = newChildrenIds[newIndex + 1];
            position = 'before';
          }
          curdHooks.moveNode(draggedNodeId, {
            parentId: anchorId ? undefined : parentId,
            anchorId,
            position,
          });
        }
      }
    });
    if (!canMoveNode) return Promise.resolve();
    draggedItemsRef.current = items;
    return handler(items, target);
  };

  const tree = useTree<TreeItemData>({
    state: {
      selectedItems,
      expandedItems,
    },
    setSelectedItems,
    setExpandedItems,
    rootItemId: ROOT_ID,
    indent: INDENTATION_WIDTH,
    dataLoader: {
      getItem: (itemId) => treeItemsRef.current[itemId] ?? {},
      getChildren: (itemId) => treeItemsRef.current[itemId]?.children ?? [],
    },
    getItemName: (item) => getNodeName(item.getItemData()),
    isItemFolder: (item) => item.getItemData().resourceType === BaseNodeResourceType.Folder,
    canReorder: true,
    canDrag: () => !editingNodeId,
    canDrop: (items, target) => {
      // Basic validation
      if (editingNodeId || !canMoveNode || items.length !== 1) return false;

      const isDraggingFolder = items[0].isFolder();
      const isReordering = 'childIndex' in target;

      // === Non-folder items ===
      if (!isDraggingFolder) {
        // Reorder: ✅ allowed at any level
        if (isReordering) return true;
        // Drop into folder: ✅ | Drop into non-folder: ❌
        return target.item.isFolder();
      }

      // === Folder items ===
      const subtreeDepth = getMaxFolderSubtreeDepth(items[0].getId(), treeItemsRef.current);

      if (isReordering) {
        return target.dragLineLevel + subtreeDepth < maxFolderDepth;
      }

      return (
        target.item.isFolder() && getItemLevel(target.item) + subtreeDepth < maxFolderDepth - 1
      );
    },
    onDrop: handleDrop,
    onPrimaryAction: handlePrimaryAction,
    features: [
      syncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
      dragAndDropFeature,
      keyboardDragAndDropFeature,
    ],
  });

  const createSuccefulyCallback = useCallback(
    (node: IBaseNodeVo) => {
      const { resourceType, resourceId, parentId, resourceMeta } = node;
      const viewId =
        resourceType === BaseNodeResourceType.Table ? resourceMeta?.defaultViewId : undefined;
      const parentItem = parentId ? treeItemsRef.current[parentId] : null;

      const url = getNodeUrl({
        baseId,
        resourceType,
        resourceId,
        viewId,
        urlPrefix: shareUrlPrefix,
      });
      if (url) {
        if (resourceType === BaseNodeResourceType.Table) {
          router.push(url, undefined, { shallow: Boolean(viewId) });
        } else {
          router.push(url, undefined, { shallow: true });
        }
      }

      if (parentItem && parentItem.resourceType === BaseNodeResourceType.Folder) {
        setExpandedItems((prev) => [...(prev ?? []), parentItem.id]);
      }
      setSelectedItems([node.id]);
    },
    [baseId, router, setExpandedItems, setSelectedItems, shareUrlPrefix]
  );

  const updateSuccefulyCallback = useCallback(
    (node: IBaseNodeVo) => {
      const { resourceType, resourceId } = node;
      switch (resourceType) {
        case BaseNodeResourceType.Dashboard:
          queryClient.invalidateQueries({ queryKey: ReactQueryKeys.getDashboard(resourceId) });
          break;
        case BaseNodeResourceType.Workflow:
          queryClient.invalidateQueries({
            queryKey: ReactQueryKeys.workflowItem(baseId, resourceId),
          });
          break;
        case BaseNodeResourceType.App:
          queryClient.invalidateQueries({ queryKey: ReactQueryKeys.getApp(baseId, resourceId) });
          break;
      }
    },
    [baseId, queryClient]
  );

  const getAllParentIds = useCallback((nodeId: string) => {
    const parentIds: string[] = [];
    let parentId = treeItemsRef.current[nodeId]?.parentId;
    while (parentId) {
      parentIds.push(parentId);
      parentId = treeItemsRef.current[parentId]?.parentId;
    }
    return parentIds;
  }, []);

  const curdHooks = useBaseNodeCrud({
    onCreateSuccess: createSuccefulyCallback,
    onUpdateSuccess: updateSuccefulyCallback,
  });

  useEffect(() => {
    treeItemsRef.current = treeItems;
  }, [treeItems]);

  const currentResourceId = useMemo(() => {
    switch (baseResource.resourceType) {
      case BaseNodeResourceType.Table:
        return baseResource.tableId;
      case BaseNodeResourceType.Dashboard:
        return baseResource.dashboardId;
      case BaseNodeResourceType.Workflow:
        return baseResource.workflowId;
      case BaseNodeResourceType.App:
        return baseResource.appId;
      default:
        return undefined;
    }
  }, [baseResource]);

  const currentRouteNodeId = useMemo(() => {
    const nodes = Object.values(treeItems);
    const { resourceType } = baseResource;
    return (
      nodes.find(
        (node) => node.resourceType === resourceType && node.resourceId === currentResourceId
      )?.id ?? null
    );
  }, [treeItems, baseResource, currentResourceId]);

  useEffect(() => {
    if (Object.keys(treeItems).length === 0) return;
    if (!currentRouteNodeId) {
      setSelectedItems([]);
      return;
    }

    const parentIds = getAllParentIds(currentRouteNodeId);
    if (parentIds.length > 0) {
      setExpandedItems((prev) => [...new Set([...(prev ?? []), ...parentIds])]);
    }
    setSelectedItems([currentRouteNodeId]);
  }, [treeItems, currentRouteNodeId, getAllParentIds, setExpandedItems, setSelectedItems]);

  useEffect(() => {
    if (Object.keys(treeItems).length === 0) return;
    if (selectedItems.length === 0) {
      focusedNodeIdRef.current = null;
      return;
    }
    const currentId = selectedItems[0];
    if (focusedNodeIdRef.current === currentId) return;
    const focusItem = tree.getItemInstance(currentId);
    if (!focusItem) return;

    focusItem.setFocused();
    focusedNodeIdRef.current = currentId;

    const draggedNodeId = draggedItemsRef.current[0]?.getId();
    if (!draggedNodeId) {
      focusItem.scrollTo({ block: 'nearest', inline: 'nearest' });
      return;
    }

    const isCurrentRouteNode = currentId === currentRouteNodeId;
    if (draggedNodeId !== currentId || isCurrentRouteNode) {
      draggedItemsRef.current = [];
    }
  }, [currentRouteNodeId, selectedItems, tree, treeItems]);

  useEffect(() => {
    if (!highlightedTableId || Object.keys(treeItems).length === 0) return;
    const node = Object.values(treeItems).find(
      (n) => n.resourceType === BaseNodeResourceType.Table && n.resourceId === highlightedTableId
    );
    if (!node) return;
    const parentIds = getAllParentIds(node.id);
    if (parentIds.length > 0) {
      setExpandedItems((prev) => [...new Set([...(prev ?? []), ...parentIds])]);
    }
    const raf = requestAnimationFrame(() => {
      const item = tree.getItemInstance(node.id);
      item?.scrollTo({ block: 'nearest', inline: 'nearest' });
    });
    return () => cancelAnimationFrame(raf);
  }, [highlightedTableId, treeItems, tree, getAllParentIds, setExpandedItems]);

  useEffect(() => {
    if (isLoading) return;
    tree.rebuildTree();
  }, [tree, treeItems, isLoading]);

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    if (editingNodeId) {
      timeout = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 200);
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [editingNodeId]);

  useClickAway(inputRef, () => {
    const update = (editingNodeId: string) => {
      const item = tree.getItemInstance(editingNodeId);
      if (!item) return;
      const oldVal = item?.getItemName() ?? '';
      const newVal = inputRef.current?.value ?? '';
      if (oldVal === newVal) return;
      const nodeId = item.getId();
      curdHooks.updateNode(nodeId, {
        name: newVal,
      });
    };
    if (editingNodeId) {
      update(editingNodeId);
      setEditingNodeId(null);
    }
  });

  useDragAutoScroll(viewportRef);

  if (!baseId) {
    return null;
  }

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <>
          {props.skeleton ? (
            props.skeleton
          ) : (
            <div className="flex w-full flex-col gap-2 !border-none px-2">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
            </div>
          )}
        </>
      );
    } else if (emptyText) {
      return (
        <div className="flex min-h-16 w-full flex-col items-center justify-center gap-2 px-2 ">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      );
    }
  };

  const renderViewTree = () => {
    return (
      <ScrollArea
        viewportRef={viewportRef}
        className="flex w-full !border-none px-2 [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:!min-w-0"
        scrollBar="none"
      >
        <Tree indent={INDENTATION_WIDTH} tree={tree} className="py-1">
          <AssistiveTreeDescription tree={tree} />
          {tree.getItems().map((item) => {
            const nodeId = item.getId();
            const node = item.getItemData();
            if (!node || Object.keys(node).length === 0) return null;
            const { resourceType, resourceId } = node;
            const name = getNodeName(node);
            const isPinned = pinMap?.[resourceId];
            return (
              <TreeItem asChild key={nodeId} item={item}>
                <div
                  className="h-8 w-full cursor-pointer"
                  onClickCapture={(e) => handleModifierClick(e, item)}
                  onMouseEnter={() => handleMouseEnter(item)}
                >
                  <TreeItemLabel className={cn('size-full min-w-0 py-0')}>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <ItemIcon
                        item={item}
                        canUpdateTable={canUpdateTable}
                        updateNode={curdHooks.updateNode}
                      />
                      <div className="flex min-w-0 grow items-center gap-1" title={name}>
                        <span className="truncate text-left">{name}</span>

                        <ItemStatus item={item} />
                        {
                          // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className={cn('flex shrink-0 cursor-pointer items-center', {
                              'w-0 group-hover:w-auto': !isPinned,
                            })}
                          >
                            <BaseNodeStarButton
                              resourceType={resourceType}
                              resourceId={resourceId}
                            />
                          </div>
                        }
                      </div>
                    </div>
                  </TreeItemLabel>
                </div>
              </TreeItem>
            );
          })}
          <TreeDragLine />
        </Tree>
        <ScrollBar className="z-30" />
      </ScrollArea>
    );
  };

  const renderEditTree = () => {
    return (
      <ScrollArea
        viewportRef={viewportRef}
        className={cn(
          'flex w-full px-2 [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:!min-w-0',
          {
            '!border-none': canCreateResource,
          }
        )}
        scrollBar="none"
      >
        <Tree indent={INDENTATION_WIDTH} tree={tree} className="py-1">
          <AssistiveTreeDescription tree={tree} />
          {tree.getItems().map((item) => {
            const nodeId = item.getId();
            const node = item.getItemData();
            if (!node || Object.keys(node).length === 0) return null;
            const { resourceType, resourceId } = node;
            const name = getNodeName(node);
            const isHighlighted = highlightedTableId === resourceId;
            const isPinned = pinMap?.[resourceId];
            const showShareIndicator = !shareUrlPrefix;
            const isContextMenuTarget = contextMenuOpen && contextMenu?.nodeId === nodeId;
            return (
              <TreeItem asChild key={nodeId} item={item}>
                <div
                  className="h-8 w-full cursor-pointer"
                  data-table-id={
                    resourceType === BaseNodeResourceType.Table ? resourceId : undefined
                  }
                  data-context-menu={isContextMenuTarget ? '' : undefined}
                  onClickCapture={(e) => handleModifierClick(e, item)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      nodeId,
                      resourceType,
                      resourceId,
                    });
                    setContextMenuOpen(true);
                  }}
                >
                  <TreeItemLabel
                    className={cn('size-full min-w-0 py-0', {
                      'bg-orange-300/40 hover:bg-orange-300/40': isHighlighted,
                      'group-has-[[data-state=open]]:bg-accent': !isHighlighted,
                      'bg-accent': isContextMenuTarget && !isHighlighted,
                    })}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {editingNodeId === nodeId ? (
                        <Input
                          ref={inputRef}
                          type="text"
                          defaultValue={item.getItemName()}
                          className="size-full cursor-text select-text rounded-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const newVal = e.currentTarget.value;
                              if (newVal && newVal !== item.getItemName()) {
                                curdHooks.updateNode(nodeId, { name: newVal });
                              }
                              setEditingNodeId(null);
                            } else if (e.key === 'Escape') {
                              setEditingNodeId(null);
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                        />
                      ) : (
                        <>
                          <ItemIcon
                            item={item}
                            canUpdateTable={canUpdateTable}
                            updateNode={curdHooks.updateNode}
                          />
                          <div className="flex min-w-0 grow items-center gap-1" title={name}>
                            <span
                              className="truncate text-left"
                              onDoubleClick={() => {
                                setEditingNodeId(nodeId);
                              }}
                            >
                              {name}
                            </span>

                            <ItemStatus item={item} />
                          </div>
                          {
                            // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="flex shrink-0 items-center"
                            >
                              <BaseNodeStarButton
                                resourceType={resourceType}
                                resourceId={resourceId}
                                className={cn(
                                  isPinned ? 'w-auto' : 'w-0',
                                  !isPinned && GROUP_ACTIVE_WIDTH_CLS,
                                  GROUP_ACTIVE_OPACITY_CLS
                                )}
                              />
                              <div
                                className={cn(
                                  'flex shrink-0 items-center overflow-hidden gap-1',
                                  GROUP_ACTIVE_WIDTH_CLS,
                                  isContextMenuTarget ? 'w-auto' : 'w-0'
                                )}
                              >
                                {canCreateResource && (
                                  <BaseNodeAddResourceButton
                                    createNode={curdHooks.createNode}
                                    parentId={nodeId === ROOT_ID ? undefined : nodeId}
                                    canCreateFolder={
                                      canCreateFolder && checkCanCreateFolder(item, maxFolderDepth)
                                    }
                                    canCreateTable={canCreateTable}
                                    canCreateDashboard={canCreateDashboard}
                                    canCreateWorkflow={canCreateWorkflow}
                                    canCreateApp={canCreateApp}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      className="size-4 shrink-0 p-0 group-data-[folder=false]:hidden"
                                    >
                                      <AddBoldIcon className="size-full" />
                                    </Button>
                                  </BaseNodeAddResourceButton>
                                )}
                                <BaseNodeMore
                                  resourceType={resourceType}
                                  resourceId={resourceId}
                                  onRename={() => setEditingNodeId(nodeId)}
                                  onCreateSuccess={createSuccefulyCallback}
                                  onUpdateSuccess={updateSuccefulyCallback}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="size-4 shrink-0 p-0"
                                  >
                                    <MoreHorizontal className="size-full" />
                                  </Button>
                                </BaseNodeMore>
                              </div>
                              {showShareIndicator && !isContextMenuTarget && (
                                <BaseNodeShareIndicator
                                  nodeId={nodeId}
                                  sharedNodeIds={sharedNodeIds}
                                  node={node}
                                  className={cn('ml-1', GROUP_ACTIVE_HIDDEN_CLS)}
                                />
                              )}
                            </div>
                          }
                        </>
                      )}
                    </div>
                  </TreeItemLabel>
                </div>
              </TreeItem>
            );
          })}
          <TreeDragLine />
        </Tree>
        {contextMenu &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              style={{
                position: 'fixed',
                left: contextMenu.x,
                top: contextMenu.y,
                width: 0,
                height: 0,
                zIndex: 50,
              }}
            >
              <BaseNodeMore
                key={`${contextMenu.nodeId}-${contextMenu.x}-${contextMenu.y}`}
                resourceType={contextMenu.resourceType}
                resourceId={contextMenu.resourceId}
                open={contextMenuOpen}
                setOpen={setContextMenuOpen}
                contentAlign="start"
                onRename={() => {
                  setEditingNodeId(contextMenu.nodeId);
                  setContextMenu(null);
                  setContextMenuOpen(false);
                }}
                onCreateSuccess={createSuccefulyCallback}
                onUpdateSuccess={updateSuccefulyCallback}
              >
                <span className="absolute size-0 overflow-hidden" />
              </BaseNodeMore>
            </div>,
            document.body
          )}
        <ScrollBar className="z-30" />
      </ScrollArea>
    );
  };

  return (
    <>
      {canCreateResource && (
        <div className="flex w-full flex-col px-4 pb-2 pt-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full">
                  <BaseNodeAddResourceButton
                    createNode={curdHooks.createNode}
                    parentId={ROOT_ID}
                    canCreateFolder={canCreateFolder}
                    canCreateTable={canCreateTable}
                    canCreateDashboard={canCreateDashboard}
                    canCreateWorkflow={canCreateWorkflow}
                    canCreateApp={canCreateApp}
                  >
                    <Button
                      variant={'outline'}
                      size={'xs'}
                      className="w-full"
                      disabled={!canCreateResource}
                    >
                      <AddBoldIcon className="size-4" />
                      <span className="truncate text-left">{t('common:base.createResource')}</span>
                    </Button>
                  </BaseNodeAddResourceButton>
                </span>
              </TooltipTrigger>
              {!canCreateResource && (
                <TooltipContent>{t('common:base.noPermissionToCreateResource')}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      {Object.keys(treeItems).length === 0
        ? renderEmpty()
        : isEditMode
          ? renderEditTree()
          : renderViewTree()}
    </>
  );
};

const getItemLevel = (item: ItemInstance<TreeItemData>) => {
  const meta = item.getItemMeta();
  return meta.level;
};

const getMaxFolderSubtreeDepth = (
  itemId: string,
  treeItems: Record<string, TreeItemData>
): number => {
  const item = treeItems[itemId];
  if (!item?.children?.length) return 0;
  const folderChildren = item.children.filter(
    (childId) => treeItems[childId]?.resourceType === BaseNodeResourceType.Folder
  );
  if (folderChildren.length === 0) return 0;
  return 1 + Math.max(...folderChildren.map((id) => getMaxFolderSubtreeDepth(id, treeItems)));
};

const checkCanCreateFolder = (item: ItemInstance<TreeItemData>, maxFolderDepth: number) => {
  const level = getItemLevel(item);
  return level < maxFolderDepth - 1;
};
