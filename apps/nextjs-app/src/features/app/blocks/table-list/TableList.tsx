import { File, Import } from '@teable/icons';
import { useBasePermission, useConnection } from '@teable/sdk';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@teable/ui-lib';
import AddBoldIcon from '@teable/ui-lib/icons/app/add-bold.svg';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { TableImport } from '../import-table';
import { DraggableList } from './DraggableList';
import { NoDraggableList } from './NoDraggableList';
import { useAddTable } from './useAddTable';

export const TableList: React.FC = () => {
  const { connected } = useConnection();
  const addTable = useAddTable();
  const permission = useBasePermission();
  const { t } = useTranslation(['table']);
  const [dialogVisible, setDialogVisible] = useState(false);

  return (
    <div className="flex w-full flex-col gap-2 overflow-auto pt-4">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <div className="px-3">
            {permission?.['table|create'] && (
              <div className="ai-gradient-ring w-full rounded-md p-[1.5px]">
                <Button
                  variant={'ghost'}
                  size={'icon-xs'}
                  className="w-full rounded-[5px] bg-background hover:bg-background/80 dark:bg-[color-mix(in_oklab,white_5%,hsl(var(--background)))]"
                >
                  <AddBoldIcon className="size-4 shrink-0" style={{ color: '#a78bfa' }} />
                </Button>
              </div>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuItem
            onClick={() => {
              addTable();
            }}
            className="cursor-pointer"
          >
            <Button variant="ghost" size="xs" className="h-4">
              <File className="size-4" />
              {t('table.operator.createBlank')}
            </Button>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={() => setDialogVisible(true)}>
            <Button variant="ghost" size="xs" className="h-4">
              <Import className="size-4" />
              {t('table:import.menu.importData')}
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dialogVisible && (
        <TableImport open={dialogVisible} onOpenChange={(open) => setDialogVisible(open)} />
      )}

      <div className="overflow-y-auto px-3">
        {connected && permission?.['table|update'] ? <DraggableList /> : <NoDraggableList />}
      </div>
    </div>
  );
};
