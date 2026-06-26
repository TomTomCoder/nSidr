'use client';

import { LocalStorageKeys } from '@teable/sdk/config';
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
import { Button, Input } from '@teable/ui-lib/shadcn';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@teable/ui-lib/shadcn/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@teable/ui-lib/shadcn/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@teable/ui-lib/shadcn/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@teable/ui-lib/shadcn/ui/tooltip';
import { Tree, TreeDragLine, TreeItem, TreeItemLabel } from '@teable/ui-lib/shadcn/ui/tree';
import {
  ChevronDownIcon,
  FileText,
  FilePlus,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClickAway, useLocalStorage } from 'react-use';
import {
  useCreateDoc,
  useCreateDocFolder,
  useDeleteDoc,
  useDeleteDocFolder,
  useDocFolders,
  useDocList,
  useUpdateDoc,
  useUpdateDocFolder,
} from './hooks';
import { useDocEditorStore } from './useDocEditorStore';

export const ROOT_ID = '__root__';

export type DocTreeItemData =
  | {
      type: 'folder';
      id: string;
      name: string;
      parentFolderId: string | null;
      order: number;
      children?: string[];
    }
  | {
      type: 'doc';
      id: string;
      title: string;
      folderId: string | null;
      order: number;
      isIndexed: boolean;
      indexProgress: number;
    };

interface DocFolderTreeProps {
  spaceId: string;
  onImportClick?: () => void;
}

// ---- Helpers ----

type TreeItemMap = Record<string, DocTreeItemData & { children?: string[] }>;

const sortByOrder = (ids: string[], items: TreeItemMap) =>
  ids.sort((a, b) => (items[a]?.order ?? 0) - (items[b]?.order ?? 0));

const buildFolderItems = (
  folders: Array<{ id: string; name: string; parentFolderId?: string | null; order?: number }>,
  items: TreeItemMap
) => {
  for (const folder of folders) {
    items[folder.id] = {
      type: 'folder',
      id: folder.id,
      name: folder.name,
      parentFolderId: folder.parentFolderId ?? null,
      order: folder.order ?? 0,
      children: [],
    };
  }
};

const buildDocItems = (
  docs: Array<{
    id: string;
    title?: string;
    folderId?: string | null;
    order?: number;
    isIndexed?: boolean;
    indexProgress?: number;
  }>,
  items: TreeItemMap
) => {
  for (const doc of docs) {
    items[doc.id] = {
      type: 'doc',
      id: doc.id,
      title: doc.title ?? 'Untitled',
      folderId: doc.folderId ?? null,
      order: doc.order ?? 0,
      isIndexed: Boolean(doc.isIndexed),
      indexProgress: doc.indexProgress ?? 0,
    };
  }
};

const addChildToParent = (
  childId: string,
  parentId: string | null,
  items: TreeItemMap,
  rootChildren: string[]
) => {
  if (parentId && items[parentId]) {
    const parent = items[parentId] as DocTreeItemData & { children: string[] };
    if (!parent.children) parent.children = [];
    parent.children.push(childId);
  } else {
    rootChildren.push(childId);
  }
};

const buildChildrenAndRoot = (
  folders: Array<{ id: string; parentFolderId?: string | null }>,
  docs: Array<{ id: string; folderId?: string | null }>,
  items: TreeItemMap
): string[] => {
  const rootChildren: string[] = [];
  for (const folder of folders) {
    addChildToParent(folder.id, folder.parentFolderId ?? null, items, rootChildren);
  }
  for (const doc of docs) {
    addChildToParent(doc.id, doc.folderId ?? null, items, rootChildren);
  }
  return rootChildren;
};

// ---- Sub-components ----

const ItemStatus = ({ item }: { item: ItemInstance<DocTreeItemData> }) => {
  const d = item.getItemData();
  if (!d || Object.keys(d).length === 0 || d.type !== 'doc') return null;

  // Fully indexed: small green dot.
  if (d.isIndexed) {
    return (
      <span
        className="ml-auto mr-1 size-1.5 shrink-0 rounded-full bg-emerald-500"
        aria-label="Indexed"
      />
    );
  }

  // Indexing in progress: thin progress bar + percentage.
  const pct = Math.max(0, Math.min(100, Math.round(d.indexProgress ?? 0)));
  return (
    <span
      className="ml-auto mr-1 flex shrink-0 items-center gap-1"
      aria-label={`Indexing ${pct}%`}
      title={`Indexing ${pct}%`}
    >
      <span className="h-1 w-10 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-yellow-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-7 text-right text-[10px] tabular-nums text-muted-foreground">{pct}%</span>
    </span>
  );
};

interface NodeContextMenuProps {
  nodeId: string;
  isFolder: boolean;
  folderId?: string;
  name: string;
  onRename: (id: string) => void;
  onNewDoc: (folderId: string) => void;
  onDelete: (id: string, type: 'folder' | 'doc', name: string) => void;
}

const NodeContextMenu = ({
  nodeId,
  isFolder,
  folderId,
  name,
  onRename,
  onNewDoc,
  onDelete,
}: NodeContextMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="size-5 p-0" aria-label="More options">
        <MoreHorizontal className="size-3.5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuItem onClick={() => onRename(nodeId)}>
        <Pencil className="mr-2 size-3" />
        Rename
      </DropdownMenuItem>
      {isFolder && folderId && (
        <DropdownMenuItem onClick={() => onNewDoc(folderId)}>
          <FilePlus className="mr-2 size-3" />
          New Document
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-destructive focus:text-destructive"
        onClick={() => onDelete(nodeId, isFolder ? 'folder' : 'doc', name)}
      >
        <Trash2 className="mr-2 size-3" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

interface InlineRenameInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  defaultValue: string;
  placeholder: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
}

const InlineRenameInput = ({
  inputRef,
  defaultValue,
  placeholder,
  onSave,
  onCancel,
}: InlineRenameInputProps) => (
  <Input
    ref={inputRef}
    type="text"
    defaultValue={defaultValue}
    placeholder={placeholder}
    className="h-6 w-full cursor-text rounded-sm border bg-background px-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        onSave(e.currentTarget.value);
      } else if (e.key === 'Escape') {
        onCancel();
      }
    }}
    onClick={(e) => e.stopPropagation()}
    onMouseDown={(e) => e.stopPropagation()}
  />
);

// ---- Main component ----

export const DocFolderTree = ({ spaceId, onImportClick }: DocFolderTreeProps) => {
  const { setSelectedDoc, setSelectedFolder } = useDocEditorStore();
  const { data: folders = [] } = useDocFolders(spaceId);
  const { data: docs = [] } = useDocList(spaceId);

  const createDocFolder = useCreateDocFolder(spaceId);
  const updateDocFolder = useUpdateDocFolder(spaceId);
  const deleteDocFolder = useDeleteDocFolder(spaceId);
  const createDoc = useCreateDoc(spaceId);
  const deleteDoc = useDeleteDoc(spaceId);
  const updateDoc = useUpdateDoc(spaceId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'folder' | 'doc';
    name: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const draggedItemsRef = useRef<ItemInstance<DocTreeItemData>[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [expandedItems, setExpandedItems] = useLocalStorage<string[]>(
    LocalStorageKeys.DocFolderTreeExpandedItems,
    []
  );

  const treeItems = useMemo<TreeItemMap>(() => {
    const items: TreeItemMap = {};
    buildFolderItems(folders, items);
    buildDocItems(docs, items);
    const rootChildren = buildChildrenAndRoot(folders, docs, items);
    sortByOrder(rootChildren, items);
    for (const folder of folders) {
      const item = items[folder.id] as DocTreeItemData & { children: string[] };
      if (item?.children) sortByOrder(item.children, items);
    }
    items[ROOT_ID] = {
      type: 'folder',
      id: ROOT_ID,
      name: 'Root',
      parentFolderId: null,
      order: 0,
      children: rootChildren,
    };
    return items;
  }, [folders, docs]);

  const treeItemsRef = useRef(treeItems);
  useEffect(() => {
    treeItemsRef.current = treeItems;
  }, [treeItems]);

  const dataLoader = useMemo(
    () => ({
      getItem: (itemId: string) => treeItemsRef.current[itemId] ?? {},
      getChildren: (itemId: string) => treeItemsRef.current[itemId]?.children ?? [],
    }),
    []
  );

  const handlePrimaryAction = useCallback(
    (item: ItemInstance<DocTreeItemData>) => {
      const d = item.getItemData();
      if (!d || Object.keys(d).length === 0) return;
      if (d.type === 'doc') {
        setSelectedDoc(d.id);
      } else if (d.type === 'folder') {
        setSelectedFolder(d.id);
      }
    },
    [setSelectedDoc, setSelectedFolder]
  );

  const handleDrop = useCallback(
    (items: ItemInstance<DocTreeItemData>[], target: DragTarget<DocTreeItemData>) => {
      const handler = createOnDropHandler<DocTreeItemData>((parentItem, newChildrenIds) => {
        treeItemsRef.current = {
          ...treeItemsRef.current,
          [parentItem.getId()]: {
            ...treeItemsRef.current[parentItem.getId()],
            children: newChildrenIds,
          },
        };
      });
      draggedItemsRef.current = items;
      return handler(items, target);
    },
    []
  );

  const tree = useTree<DocTreeItemData>({
    state: { selectedItems, expandedItems: expandedItems ?? [] },
    setSelectedItems,
    setExpandedItems: (updater) => {
      setExpandedItems((prev) => {
        const current = prev ?? [];
        return typeof updater === 'function' ? updater(current) : updater;
      });
    },
    rootItemId: ROOT_ID,
    indent: 20,
    dataLoader,
    getItemName: (item) => {
      const d = item.getItemData();
      if (!d || Object.keys(d).length === 0) return '';
      return d.type === 'folder' ? d.name : d.title;
    },
    isItemFolder: (item) => {
      const d = item.getItemData();
      return Boolean(d && Object.keys(d).length > 0 && d.type === 'folder');
    },
    canReorder: true,
    canDrag: () => !editingId,
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

  useEffect(() => {
    tree.rebuildTree();
  }, [tree, treeItems]);

  useEffect(() => {
    if (!editingId) return;
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(timeout);
  }, [editingId]);

  useClickAway(inputRef, () => {
    if (!editingId) return;
    const item = tree.getItemInstance(editingId);
    if (item) {
      const oldVal = item.getItemName() ?? '';
      const newVal = inputRef.current?.value ?? '';
      if (newVal && newVal !== oldVal) {
        const d = item.getItemData();
        if (d.type === 'folder') {
          updateDocFolder.mutate({ folderId: d.id, data: { name: newVal } });
        } else if (d.type === 'doc') {
          updateDoc.mutate({ docId: d.id, data: { title: newVal } });
        }
      }
    }
    setEditingId(null);
  });

  const handleSaveRename = useCallback(
    (nodeId: string, newVal: string) => {
      const item = tree.getItemInstance(nodeId);
      if (!item) {
        setEditingId(null);
        return;
      }
      const oldVal = item.getItemName() ?? '';
      if (newVal && newVal !== oldVal) {
        const d = item.getItemData();
        if (d.type === 'folder') {
          updateDocFolder.mutate({ folderId: d.id, data: { name: newVal } });
        } else if (d.type === 'doc') {
          updateDoc.mutate({ docId: d.id, data: { title: newVal } });
        }
      }
      setEditingId(null);
    },
    [tree, updateDocFolder, updateDoc]
  );

  const handleNewFolder = () => {
    createDocFolder.mutate({ name: 'New Folder', parentFolderId: null });
  };

  const handleNewDocAtRoot = async () => {
    try {
      const result = await createDoc.mutateAsync({ title: 'Untitled', content: '' });
      if (result?.id) {
        setSelectedDoc(result.id);
      }
    } catch (err) {
      console.error('[DocFolderTree] Failed to create document:', err);
    }
  };

  const handleNewDocInFolder = async (folderId: string) => {
    try {
      const result = await createDoc.mutateAsync({ title: 'Untitled', content: '', folderId });
      if (result?.id) {
        setSelectedDoc(result.id);
        setExpandedItems((prev) => [...new Set([...(prev ?? []), folderId])]);
      }
    } catch (err) {
      console.error('[DocFolderTree] Failed to create document in folder:', err);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'folder') {
      deleteDocFolder.mutate(deleteTarget.id);
    } else {
      deleteDoc.mutate(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  const isEmpty = folders.length === 0 && docs.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Folder className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">Knowledge Base</span>
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 p-0"
                  onClick={handleNewDocAtRoot}
                  aria-label="New Document"
                >
                  <FilePlus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Document</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 p-0"
                  onClick={handleNewFolder}
                  aria-label="New Folder"
                >
                  <FolderPlus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Folder</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 p-0"
                  onClick={onImportClick}
                  aria-label="Importer"
                >
                  <Upload className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Importer</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Tree body */}
      <div className="flex-1 overflow-y-auto py-1">
        {isEmpty ? (
          <div className="flex min-h-16 w-full flex-col items-center justify-center gap-2 px-4">
            <p className="text-center text-sm font-medium text-foreground">No documents yet</p>
            <p className="text-center text-xs text-muted-foreground">
              Create a folder to organize your knowledge base, or import an existing document.
            </p>
          </div>
        ) : (
          <ScrollArea
            viewportRef={viewportRef}
            className="w-full [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:!min-w-0"
            scrollBar="none"
          >
            <Tree indent={20} tree={tree} className="py-1">
              <AssistiveTreeDescription tree={tree} />
              {tree.getItems().map((item) => {
                const nodeId = item.getId();
                const d = item.getItemData();
                if (!d || Object.keys(d).length === 0) return null;
                const isFolder = d.type === 'folder';
                const name = isFolder ? d.name : d.title;
                return (
                  <TreeItem asChild key={nodeId} item={item}>
                    <div className="group h-8 w-full cursor-pointer">
                      <TreeItemLabel className="size-full min-w-0 py-0">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {editingId === nodeId ? (
                            <InlineRenameInput
                              inputRef={inputRef}
                              defaultValue={name}
                              placeholder={isFolder ? 'Folder name' : 'Document title'}
                              onSave={(val) => handleSaveRename(nodeId, val)}
                              onCancel={() => setEditingId(null)}
                            />
                          ) : (
                            <>
                              {isFolder ? (
                                <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground group-aria-[expanded=false]:-rotate-90" />
                              ) : (
                                <FileText className="size-4 shrink-0 text-muted-foreground" />
                              )}
                              <div className="flex min-w-0 grow items-center gap-1" title={name}>
                                <span className="truncate text-left text-sm">{name}</span>
                                {!isFolder && <ItemStatus item={item} />}
                              </div>
                              {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
                              <div
                                className="flex shrink-0 items-center opacity-0 group-hover:opacity-100 group-has-[[data-state=open]]:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <NodeContextMenu
                                  nodeId={nodeId}
                                  isFolder={isFolder}
                                  folderId={isFolder ? d.id : undefined}
                                  name={name}
                                  onRename={setEditingId}
                                  onNewDoc={handleNewDocInFolder}
                                  onDelete={(id, type, n) => setDeleteTarget({ id, type, name: n })}
                                />
                              </div>
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
            <ScrollBar className="z-30" />
          </ScrollArea>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === 'folder' ? 'Delete folder' : 'Delete document'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'folder'
                ? 'This folder and all its documents will be permanently deleted. This action cannot be undone.'
                : 'This document will be permanently deleted. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {deleteTarget?.type === 'folder' ? 'Keep Folder' : 'Keep Document'}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
