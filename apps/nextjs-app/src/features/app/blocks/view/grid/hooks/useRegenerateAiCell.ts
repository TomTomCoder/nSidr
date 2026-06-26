import { useMutation } from '@tanstack/react-query';
import type { IRegenerateAiCellVo } from '@teable/openapi';
import { regenerateAiCell } from '@teable/openapi';
import { toast } from '@teable/ui-lib/shadcn/ui/sonner';
import { useTranslation } from 'next-i18next';
import { tableConfig } from '@/features/i18n/table.config';

/**
 * useRegenerateAiCell — single-cell AI regeneration mutation (Phase 16-04 / D-16-02).
 *
 * Calls POST /api/table/:tableId/record/:recordId/:fieldId/regenerate via the
 * @teable/openapi client. On validation-success (server returns validated:true)
 * the regenerate endpoint already wrote the new value via updateRecord, which
 * triggers the op-event that repaints the cell — so the hook does NOT
 * optimistically write to react-query cache. The op-event is the single source
 * of truth (preserves collaborator parity per D-16-02).
 *
 * On validation-failure (server returns validated:false with an error string)
 * we surface the error via sonner toast. On network/5xx failure, same toast
 * with the AxiosError message.
 *
 * Callers (RecordMenu) invoke `mutate({ tableId, recordId, fieldId })`.
 */
export const useRegenerateAiCell = () => {
  const { t } = useTranslation(tableConfig.i18nNamespaces);

  return useMutation({
    mutationFn: async (vars: { tableId: string; recordId: string; fieldId: string }) => {
      const response = await regenerateAiCell(vars.tableId, vars.recordId, vars.fieldId);
      return response.data;
    },
    onSuccess: (data: IRegenerateAiCellVo) => {
      if (data.validated === false) {
        toast.error(data.error ?? (t('table:menu.regenerateFailed') as string));
      }
      // validated:true → no toast; op-event from updateRecord repaints the cell.
    },
    onError: (error: Error) => {
      toast.error(error.message ?? (t('table:menu.regenerateFailed') as string));
    },
  });
};
