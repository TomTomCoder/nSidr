'use client';
import { Search } from '@teable/icons';
import { useSession } from '@teable/sdk';
import { Button } from '@teable/ui-lib/shadcn';
import { Resizable } from 're-resizable';
import { useState } from 'react';
import { DocEditorArea } from './DocEditorArea';
import { DocFolderTree } from './DocFolderTree';
import { DocImportPanel } from './DocImportPanel';
import { useDocSearchStore } from './useDocSearchStore';

interface DocLibraryProps {
  spaceId: string;
}

export function DocLibrary({ spaceId }: DocLibraryProps) {
  const { user } = useSession();
  const [showImport, setShowImport] = useState(false);
  const { openDocSearch } = useDocSearchStore();

  return (
    // flex-1 + min-w-0: fill the remaining row width and allow shrinking. Without
    // these the row sized to its content's min-width, so a document with short lines
    // (e.g. only headings) collapsed the whole editor to a narrow column.
    <div className="flex h-full min-w-0 flex-1 overflow-hidden">
      <Resizable
        className="h-full shrink-0 border-r"
        defaultSize={{ width: 240, height: '100%' }}
        minWidth={160}
        maxWidth={400}
        enable={{ right: true }}
        handleClasses={{ right: 'group' }}
        handleStyles={{
          right: {
            width: '6px',
            right: '-6px',
          },
        }}
        handleComponent={{
          right: (
            <div className="h-full w-px bg-transparent transition-colors group-hover:bg-primary/50 group-active:bg-primary" />
          ),
        }}
      >
        <DocFolderTree spaceId={spaceId} onImportClick={() => setShowImport(true)} />
      </Resizable>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-end border-b px-3 py-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
            onClick={openDocSearch}
          >
            <Search className="size-3.5" />
            <span>Rechercher</span>
            <kbd className="hidden rounded border bg-muted px-1 font-mono text-[10px] sm:inline-flex">
              ⌘⇧K
            </kbd>
          </Button>
        </div>
        <DocEditorArea spaceId={spaceId} />
      </div>

      {showImport && user && (
        <DocImportPanel spaceId={spaceId} userId={user.id} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
