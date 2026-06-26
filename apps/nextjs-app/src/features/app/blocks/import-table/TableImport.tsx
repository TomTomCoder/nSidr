import { useMutation } from '@tanstack/react-query';
import type { ITimeZoneString } from '@teable/core';
import type {
  IInplaceImportOptionRo,
  IImportOptionRo,
  IAnalyzeRo,
  IImportSheetItem,
  IAnalyzeVo,
  IImportOption,
  INotifyVo,
} from '@teable/openapi';
import {
  SUPPORTEDTYPE,
  importTypeMap,
  analyzeFile,
  importTableFromFile,
  inplaceImportTableFromFile,
  BaseNodeResourceType,
} from '@teable/openapi';
import { useBase, LocalStorageKeys } from '@teable/sdk';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Spin,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Checkbox,
} from '@teable/ui-lib';
import { toast } from '@teable/ui-lib/shadcn/ui/sonner';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useState, useRef, useCallback } from 'react';
import { useLocalStorage } from 'react-use';
import { getNodeUrl } from '../base/base-node/hooks';
import { AiImportPanel } from './AiImportPanel';
import { FieldConfigPanel, InplaceFieldConfigPanel } from './field-config-panel';
import { ImportPreviewPanel } from './ImportPreviewPanel';
import { UploadPanel } from './upload-panel';
import { UrlPanel } from './UrlPanel';

interface ITableImportProps {
  open?: boolean;
  tableId?: string;
  children?: React.ReactElement;
  fileType?: SUPPORTEDTYPE;
  onOpenChange?: (open: boolean) => void;
}

export type ITableImportOptions = IImportOption & {
  autoSelectType: boolean;
};

enum Step {
  UPLOAD = 'upload',
  PREVIEW = 'preview',
  AI = 'ai',
  CONFIG = 'config',
}

const detectFileType = (file: File): SUPPORTEDTYPE => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'tsv') return SUPPORTEDTYPE.TSV;
  if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') return SUPPORTEDTYPE.EXCEL;
  return SUPPORTEDTYPE.CSV;
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export const TableImport = (props: ITableImportProps) => {
  const base = useBase();
  const router = useRouter();
  const { t } = useTranslation(['table']);
  const [step, setStep] = useState(Step.UPLOAD);
  const { children, open, onOpenChange, fileType: fileTypeProp, tableId } = props;
  const [resolvedFileType, setResolvedFileType] = useState<SUPPORTEDTYPE>(
    fileTypeProp ?? SUPPORTEDTYPE.CSV
  );
  const resolvedFileTypeRef = useRef<SUPPORTEDTYPE>(fileTypeProp ?? SUPPORTEDTYPE.CSV);
  const fileType = resolvedFileType;
  const [errorMessage, setErrorMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<IAnalyzeRo>({} as IAnalyzeRo);
  const primitiveWorkSheets = useRef<IAnalyzeVo['worksheets']>({});
  const [workSheets, setWorkSheets] = useState<IImportOptionRo['worksheets']>({});
  const [insertConfig, setInsertConfig] = useState<IInplaceImportOptionRo['insertConfig']>({
    excludeFirstRow: true,
    sourceWorkSheetKey: '',
    sourceColumnMap: {},
  });
  const [shouldAlert, setShouldAlert] = useLocalStorage(LocalStorageKeys.ImportAlert, true);
  const [shouldTips, setShouldTips] = useState(false);

  // AI import state
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiModelKey, setAiModelKey] = useState('');

  // Preview step state — holds analyzed worksheets including sampleRows
  const [previewWorksheets, setPreviewWorksheets] = useState<IAnalyzeVo['worksheets']>({});

  const { mutateAsync: importNewTableFn, isPending: isLoading } = useMutation({
    mutationFn: async ({ baseId, importRo }: { baseId: string; importRo: IImportOptionRo }) => {
      return (await importTableFromFile(baseId, importRo)).data;
    },
    onSuccess: (data) => {
      const { defaultViewId: viewId, id: tableId } = data[0];
      onOpenChange?.(false);
      const url = getNodeUrl({
        baseId: base.id,
        resourceType: BaseNodeResourceType.Table,
        resourceId: tableId,
        viewId,
      });
      if (url) {
        router.push(url, undefined, { shallow: true });
      }
    },
  });

  const { mutateAsync: inplaceImportFn, isPending: inplaceLoading } = useMutation({
    mutationFn: (args: Parameters<typeof inplaceImportTableFromFile>) => {
      return inplaceImportTableFromFile(...args);
    },
    onSuccess: () => {
      onOpenChange?.(false);
      const { tableId: routerTableId } = router.query;
      routerTableId !== tableId && router.push(`/base/${base.id}/table/${tableId}`);
    },
  });

  const importTable = async () => {
    const importNewTable = () => {
      for (const [, value] of Object.entries(workSheets)) {
        const { columns } = value;

        if (columns.some((col) => !col.name)) {
          setErrorMessage(t('table:import.form.error.fieldNameEmpty'));
          return;
        }
        if (new Set(columns.map((col) => col.name.trim())).size !== columns.length) {
          setErrorMessage(t('table:import.form.error.uniqueFieldName'));
          return;
        }
      }

      importNewTableFn({
        baseId: base.id,
        importRo: {
          worksheets: workSheets,
          ...fileInfo,
          notification: true,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone as ITimeZoneString,
        },
      });
    };

    const inplaceImportTable = () => {
      const { sourceColumnMap } = insertConfig;
      if (Object.values(sourceColumnMap).every((col) => col === null)) {
        setErrorMessage(t('table:import.form.error.atLeastAImportField'));
        return;
      }
      const preInsertConfig = {
        ...insertConfig,
        sourceColumnMap: Object.fromEntries(
          Object.entries(sourceColumnMap).filter(([, value]) => value !== null)
        ),
      };
      inplaceImportFn([
        base.id,
        tableId as string,
        {
          ...fileInfo,
          insertConfig: preInsertConfig,
          notification: true,
        },
      ]);
    };

    tableId ? inplaceImportTable() : importNewTable();
  };

  const { mutateAsync: analyzeByUrl, isPending: analyzeLoading } = useMutation({
    mutationFn: analyzeFile,
    onSuccess: (data, params) => {
      const { attachmentUrl, fileType } = params;
      setFileInfo({
        attachmentUrl,
        fileType,
      });
      const {
        data: { worksheets },
      } = data;

      const workSheetsWithIndex: IImportOptionRo['worksheets'] = {};
      for (const [key, value] of Object.entries(worksheets)) {
        const item = { ...value, importData: true, useFirstRowAsHeader: true } as IImportSheetItem;
        item.columns = item.columns.map((col, index) => ({
          ...col,
          sourceColumnIndex: index,
        }));

        workSheetsWithIndex[key] = item;
      }
      setInsertConfig({ ...insertConfig, ['sourceWorkSheetKey']: Object.keys(worksheets)[0] });
      setWorkSheets(workSheetsWithIndex);
      primitiveWorkSheets.current = worksheets;

      // Always show preview first so user can verify detected columns
      setPreviewWorksheets(worksheets);
      setStep(Step.PREVIEW);
    },
  });

  const handlePreviewContinue = () => {
    setStep(aiEnabled ? Step.AI : Step.CONFIG);
  };

  const handlePreviewBack = () => {
    setStep(Step.UPLOAD);
  };

  const fileFinishedHandler = useCallback(
    async (result: INotifyVo) => {
      const { presignedUrl } = result;

      await analyzeByUrl({
        attachmentUrl: presignedUrl,
        fileType: resolvedFileTypeRef.current,
      });
    },
    [analyzeByUrl]
  );

  const fileCloseHandler = useCallback(() => {
    setFile(null);
  }, []);

  const fileChangeHandler = useCallback(
    (file: File | null) => {
      if (file) {
        const detected = detectFileType(file);
        if (!fileTypeProp) {
          setResolvedFileType(detected);
          resolvedFileTypeRef.current = detected;
        }
        const { exceedSize } = importTypeMap[detected];
        if (exceedSize && file.size > exceedSize * 1024 * 1024) {
          toast.error(`${t('table:import.tips.fileExceedSizeTip')} ${exceedSize}MB`);
          return;
        }
      }
      setFile(file);
    },
    [fileTypeProp, t]
  );

  const fieldChangeHandler = (value: IImportOptionRo['worksheets']) => {
    setWorkSheets(value);
  };

  const inplaceFieldChangeHandler = (value: IInplaceImportOptionRo['insertConfig']) => {
    setInsertConfig(value);
  };

  const handleAiDone = (optimizedWorksheets: IImportOptionRo['worksheets']) => {
    setWorkSheets(optimizedWorksheets);
    setStep(Step.CONFIG);
  };

  const handleAiCancel = () => {
    setStep(Step.CONFIG);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => onOpenChange?.(open)}>
        {children && <DialogTrigger>{children}</DialogTrigger>}
        {open && (
          <DialogContent
            className="z-50 flex max-h-[80%] max-w-[800px] flex-col overflow-hidden"
            overlayStyle={{
              pointerEvents: 'none',
            }}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview step */}
            {step === Step.PREVIEW && (
              <ImportPreviewPanel
                worksheets={previewWorksheets}
                baseId={base.id}
                aiEnabled={aiEnabled}
                onAiEnabledChange={setAiEnabled}
                aiPrompt={aiPrompt}
                onAiPromptChange={setAiPrompt}
                aiModelKey={aiModelKey}
                onAiModelKeyChange={setAiModelKey}
                onContinue={handlePreviewContinue}
                onBack={handlePreviewBack}
              />
            )}

            {/* AI step */}
            {step === Step.AI && (
              <AiImportPanel
                baseId={base.id}
                prompt={aiPrompt || 'Optimise les noms de colonnes et détecte les types de champs'}
                worksheets={workSheets}
                modelKey={aiModelKey || undefined}
                onDone={handleAiDone}
                onCancel={handleAiCancel}
              />
            )}

            {/* Upload + config steps */}
            {step !== Step.AI && step !== Step.PREVIEW && (
              <Tabs defaultValue="localFile" className="flex-1 overflow-auto">
                {step === Step.UPLOAD && (
                  <TabsList>
                    <TabsTrigger value="localFile">{t('table:import.title.localFile')}</TabsTrigger>
                    <TabsTrigger value="url">{t('table:import.title.linkUrl')}</TabsTrigger>
                  </TabsList>
                )}

                <TabsContent value="localFile">
                  {step === Step.UPLOAD && (
                    <UploadPanel
                      fileType={fileTypeProp}
                      file={file}
                      onChange={fileChangeHandler}
                      onClose={fileCloseHandler}
                      analyzeLoading={analyzeLoading}
                      onFinished={fileFinishedHandler}
                    />
                  )}
                  {step === Step.CONFIG &&
                    (tableId ? (
                      <InplaceFieldConfigPanel
                        tableId={tableId}
                        workSheets={workSheets}
                        insertConfig={insertConfig}
                        errorMessage={errorMessage}
                        onChange={inplaceFieldChangeHandler}
                      />
                    ) : (
                      <FieldConfigPanel
                        tableId={tableId}
                        workSheets={workSheets}
                        errorMessage={errorMessage}
                        onChange={fieldChangeHandler}
                      />
                    ))}
                </TabsContent>
                <TabsContent value="url">
                  {step === Step.UPLOAD && (
                    <UrlPanel
                      analyzeFn={analyzeByUrl}
                      isFinished={analyzeLoading}
                      fileType={fileType}
                    />
                  )}
                  {step === Step.CONFIG &&
                    (tableId ? (
                      <InplaceFieldConfigPanel
                        tableId={tableId}
                        workSheets={workSheets}
                        insertConfig={insertConfig}
                        errorMessage={errorMessage}
                        onChange={inplaceFieldChangeHandler}
                      />
                    ) : (
                      <FieldConfigPanel
                        tableId={tableId}
                        workSheets={workSheets}
                        errorMessage={errorMessage}
                        onChange={fieldChangeHandler}
                      />
                    ))}
                </TabsContent>
              </Tabs>
            )}

            {step === Step.CONFIG && (
              <DialogFooter>
                <footer className="mt-1 flex items-center justify-end">
                  <Button size="sm" variant="secondary" onClick={() => onOpenChange?.(false)}>
                    {t('table:import.menu.cancel')}
                  </Button>
                  <AlertDialog>
                    {shouldAlert ? (
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          className="ml-1"
                          disabled={tableId ? inplaceLoading : isLoading}
                        >
                          {(tableId ? inplaceLoading : isLoading) && (
                            <Spin className="mr-1 size-4" />
                          )}
                          {t('table:import.title.import')}
                        </Button>
                      </AlertDialogTrigger>
                    ) : (
                      <Button
                        size="sm"
                        className="ml-1"
                        onClick={() => importTable()}
                        disabled={tableId ? inplaceLoading : isLoading}
                      >
                        {(tableId ? inplaceLoading : isLoading) && <Spin className="mr-1 size-4" />}
                        {t('table:import.title.import')}
                      </Button>
                    )}
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('table:import.title.tipsTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('table:import.tips.importAlert')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="flex items-center">
                        <Checkbox
                          id="noTips"
                          checked={shouldTips}
                          onCheckedChange={(res: boolean) => {
                            setShouldTips(res);
                          }}
                        />
                        <label
                          htmlFor="noTips"
                          className="pl-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {t('table:import.tips.noTips')}
                        </label>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('table:import.menu.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            importTable();
                            if (shouldTips) {
                              setShouldAlert(false);
                            }
                          }}
                        >
                          {t('table:import.title.confirm')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </footer>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </>
  );
};
