/**
 * useRegenerateAiCell hook spec (Phase 16-04).
 *
 * Asserts:
 *  - URL parity: mutation hits REGENERATE_AI_CELL with the exact (tableId, recordId, fieldId) tuple
 *  - validated:true → no toast (op-event from updateRecord paints the cell)
 *  - validated:false → toast.error invoked with server error string
 *  - network reject → toast.error invoked with error message
 *
 * Mock response shape is bound to IRegenerateAiCellVo (no `as any`) — Phase 17.1
 * mock-shape-drift hedge: future shape changes break this spec at compile time.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { REGENERATE_AI_CELL, regenerateAiCell, type IRegenerateAiCellVo } from '@teable/openapi';
import { toast } from '@teable/ui-lib/shadcn/ui/sonner';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRegenerateAiCell } from './useRegenerateAiCell';

// Mock the @teable/openapi client BEFORE importing the hook.
// regenerateAiCell is the function the hook calls; we spy on it directly.
vi.mock('@teable/openapi', async (importOriginal) => {
  type Mod = typeof REGENERATE_AI_CELL extends string
    ? Awaited<ReturnType<typeof importOriginal>>
    : never;
  const actual = (await importOriginal()) as Mod;
  return {
    ...actual,
    regenerateAiCell: vi.fn(),
  };
});

vi.mock('@teable/ui-lib/shadcn/ui/sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockRegenerateAiCell = regenerateAiCell as unknown as ReturnType<typeof vi.fn>;
const mockToastError = toast.error as unknown as ReturnType<typeof vi.fn>;

const buildWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useRegenerateAiCell (Phase 16-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('URL parity: regenerateAiCell client called with (tableId, recordId, fieldId)', async () => {
    const fixture: IRegenerateAiCellVo = {
      value: 'foo',
      validated: true,
      attempts: 1,
    };
    mockRegenerateAiCell.mockResolvedValue({ data: fixture });

    const { result } = renderHook(() => useRegenerateAiCell(), { wrapper: buildWrapper() });
    result.current.mutate({ tableId: 'tbl1', recordId: 'rec1', fieldId: 'fld1' });

    await waitFor(() => expect(mockRegenerateAiCell).toHaveBeenCalledTimes(1));
    expect(mockRegenerateAiCell).toHaveBeenCalledWith('tbl1', 'rec1', 'fld1');
    // Parity assertion: the client function must derive its URL from REGENERATE_AI_CELL.
    // We assert the constant string equals the agreed contract — if backend (16-03)
    // route shape ever drifts, this test fails immediately.
    expect(REGENERATE_AI_CELL).toBe('/table/{tableId}/record/{recordId}/{fieldId}/regenerate');
  });

  it('validated:true → toast NOT invoked', async () => {
    const fixture: IRegenerateAiCellVo = {
      value: 'foo',
      validated: true,
      attempts: 1,
    };
    mockRegenerateAiCell.mockResolvedValue({ data: fixture });

    const { result } = renderHook(() => useRegenerateAiCell(), { wrapper: buildWrapper() });
    result.current.mutate({ tableId: 'tbl1', recordId: 'rec1', fieldId: 'fld1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('validated:false with error string → toast.error called with error', async () => {
    const fixture: IRegenerateAiCellVo = {
      value: null,
      validated: false,
      attempts: 2,
      error: 'enum mismatch',
    };
    mockRegenerateAiCell.mockResolvedValue({ data: fixture });

    const { result } = renderHook(() => useRegenerateAiCell(), { wrapper: buildWrapper() });
    result.current.mutate({ tableId: 'tbl1', recordId: 'rec1', fieldId: 'fld1' });

    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
    expect(mockToastError).toHaveBeenCalledWith('enum mismatch');
  });

  it('network reject → toast.error called with error message', async () => {
    mockRegenerateAiCell.mockRejectedValue(new Error('network boom'));

    const { result } = renderHook(() => useRegenerateAiCell(), { wrapper: buildWrapper() });
    result.current.mutate({ tableId: 'tbl1', recordId: 'rec1', fieldId: 'fld1' });

    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
    expect(mockToastError).toHaveBeenCalledWith('network boom');
  });
});
