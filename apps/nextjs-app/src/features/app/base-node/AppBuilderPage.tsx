import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAppContent, updateAppContent } from '@teable/openapi';
import { ReactQueryKeys } from '@teable/sdk/config';
import { useBaseId } from '@teable/sdk/hooks';
import { Button } from '@teable/ui-lib/shadcn';
import { AlertCircle, Code2, Eye, Loader2, MessageSquare, RefreshCw, Square } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

const ChatPanel = dynamic(
  () => import('../components/chat-panel/ChatPanel').then((m) => m.ChatPanel),
  { ssr: false }
);
import { useChatPanelStore } from '../components/sidebar/useChatPanelStore';
import type { IBaseResourceApp } from '../hooks/useBaseResource';
import { useBaseResource } from '../hooks/useBaseResource';
import { useAppBuilderStore } from '../stores/useAppBuilderStore';
import { CodeEditor } from './CodeEditor';

interface IAppContent {
  files?: Record<string, string>;
}

/* eslint-disable regexp/no-obscure-range, regexp/no-dupe-characters-character-class */
function sanitizeCode(code: string): string {
  return code
    .replace(/^import\s[^\n]+\n?/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+(function|const|class|let|var)\s/gm, '$1 ')
    .replace(/^(\s*)([\wÀ-ɏ]+(?:\s+[\wÀ-ɏ]+)+)\s*:/gm, "$1'$2':")
    .replace(/([{,]\s*)([\wÀ-ɏ]+(?:\s+[\wÀ-ɏ]+)+)\s*:/g, "$1'$2':");
}
/* eslint-enable regexp/no-obscure-range, regexp/no-dupe-characters-character-class */

function buildSrcDoc(code: string, baseId: string): string {
  code = sanitizeCode(code);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
  <script>Babel.registerPreset('react-classic',{presets:[[Babel.availablePresets['react'],{runtime:'classic'}],Babel.availablePresets['typescript']]});</script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white">
  <div id="root"></div>
  <script type="text/babel" data-presets="react-classic">
const { useState, useEffect, useRef, useCallback, useMemo, useReducer, useContext, createContext } = React;
window.BASE_ID = "${baseId}";
window.setProgress = () => {};

// Field schema cache keyed by tableId
window._fieldSchema = {};
window._fetchSchema = async (tableId) => {
  if (window._fieldSchema[tableId]) return window._fieldSchema[tableId];
  try {
    const r = await fetch('/api/table/' + tableId + '/field');
    if (!r.ok) return {};
    const fields = await r.json();
    const map = {};
    (Array.isArray(fields) ? fields : []).forEach(f => { map[f.id] = f.name; });
    window._fieldSchema[tableId] = map;
    return map;
  } catch { return {}; }
};

// Returns records with fields accessible by BOTH field ID and field name.
// Backward-compatible with code generated before fieldKeyType=name.
window.getRecords = async (tableId, take = 200) => {
  const [idToName, r] = await Promise.all([
    window._fetchSchema(tableId),
    fetch('/api/table/' + tableId + '/record?take=' + take + '&fieldKeyType=id'),
  ]);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json();
  return (d.records || []).map(rec => {
    const byName = {};
    Object.entries(rec.fields || {}).forEach(([id, val]) => {
      if (idToName[id]) byName[idToName[id]] = val;
    });
    return { ...rec, fields: { ...rec.fields, ...byName } };
  });
};

// Detect if a key looks like a Teable field ID
window._isFieldId = (k) => /^fld[A-Za-z0-9]{15,}$/.test(k);
// Detect key type from the majority of keys; mixed objects are treated as 'name'
window._keyType = (fields) => Object.keys(fields).every(k => window._isFieldId(k)) ? 'id' : 'name';
// Strip keys that don't match the detected key type to avoid mixed-key 404s
window._cleanFields = (fields) => {
  const kt = window._keyType(fields);
  return Object.fromEntries(Object.entries(fields).filter(([k]) => kt === 'id' ? window._isFieldId(k) : !window._isFieldId(k)));
};

window.createRecord = async (tableId, fields) => {
  const clean = window._cleanFields(fields);
  const r = await fetch('/api/table/' + tableId + '/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldKeyType: window._keyType(clean), records: [{ fields: clean }] })
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json();
  return d.records?.[0];
};
window.updateRecord = async (tableId, recordId, fields) => {
  const clean = window._cleanFields(fields);
  const r = await fetch('/api/table/' + tableId + '/record/' + recordId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldKeyType: window._keyType(clean), record: { fields: clean } })
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
};
window.deleteRecord = async (tableId, recordId) => {
  const r = await fetch('/api/table/' + tableId + '/record', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordIds: [recordId] })
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
};
window.Teable = { get getRecords() { return window.getRecords; }, get createRecord() { return window.createRecord; }, get updateRecord() { return window.updateRecord; }, get deleteRecord() { return window.deleteRecord; } };

// Embed a Teable view (Grid/Kanban/Gallery/Calendar/Gantt/Form) inside the app.
// tableId and viewId come from the schema. height defaults to 500px.
window.TeableView = ({ tableId, viewId, height = 500, style = {} }) => {
  const src = '/base/' + window.BASE_ID + '/table/' + tableId + (viewId ? '/' + viewId : '') + '?embed=1';
  return React.createElement('iframe', {
    src,
    style: { border: 'none', width: '100%', height, borderRadius: 8, ...style },
    title: 'Teable View',
  });
};

// Embed the auto-generated API documentation for this base (Swagger / Redoc).
window.TeableApiDocs = ({ height = 600, style = {} }) => {
  return React.createElement('iframe', {
    src: '/redocs',
    style: { border: 'none', width: '100%', height, borderRadius: 8, ...style },
    title: 'API Documentation',
  });
};

${code}
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { style: { padding: 16, color: '#dc2626', fontFamily: 'monospace', fontSize: 13 } },
        'Runtime error: ', String(this.state.error?.message || this.state.error));
    }
    return this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(AppErrorBoundary, null, React.createElement(App))
);
  </script>
</body>
</html>`;
}

export function AppBuilderPage() {
  const baseId = useBaseId()!;
  const { appId } = useBaseResource() as IBaseResourceApp;
  const queryClient = useQueryClient();

  const {
    open: openChat,
    setPanelType,
    toggleVisible: toggleChat,
    status: chatStatus,
  } = useChatPanelStore();
  const {
    files,
    setFiles,
    selectedFile,
    setSelectedFile,
    updateFile,
    generating,
    generateError,
    statusMessage,
    stop,
    autoFix,
  } = useAppBuilderStore();

  const [mainTab, setMainTab] = useState<'preview' | 'code'>('preview');
  // Only update the preview src when generation finishes to keep the iframe stable during streaming
  const [previewSrc, setPreviewSrc] = useState('');

  useEffect(() => {
    setPanelType('app-builder');
    openChat();
  }, [openChat, setPanelType]);

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: remoteContent, isLoading } = useQuery({
    queryKey: ReactQueryKeys.appContent(baseId, appId ?? ''),
    queryFn: () => getAppContent(baseId, appId!).then((r) => r.data as IAppContent),
    enabled: Boolean(baseId) && Boolean(appId),
  });

  useEffect(() => {
    if (generating) return;
    if (remoteContent?.files) setFiles(remoteContent.files);
  }, [remoteContent, generating]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild preview only when not actively generating (avoids constant iframe reloads)
  const mainFileContent = files['app/page.tsx'] ?? '';
  useEffect(() => {
    if (!generating && mainFileContent) {
      setPreviewSrc(buildSrcDoc(mainFileContent, baseId));
    }
  }, [generating, mainFileContent, baseId]);

  const { mutate: saveContent } = useMutation({
    mutationFn: (content: IAppContent) => updateAppContent(baseId, appId!, content),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.appContent(baseId, appId!) }),
  });

  const handleCodeChange = useCallback(
    (value: string) => {
      updateFile(selectedFile, value);
      saveContent({ files: { ...files, [selectedFile]: value } });
    },
    [files, selectedFile, updateFile, saveContent]
  );

  const handleAutoFix = () =>
    autoFix({
      baseId,
      appId,
      onSave: (f) => saveContent({ files: f }),
      onInvalidate: () =>
        void queryClient.invalidateQueries({ queryKey: ReactQueryKeys.appContent(baseId, appId!) }),
    });

  const fileList = Object.keys(files).sort();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b px-3 py-2">
          {(['preview', 'code'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                mainTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => setMainTab(tab)}
            >
              {tab === 'preview' ? <Eye className="size-3.5" /> : <Code2 className="size-3.5" />}
              {tab === 'preview' ? 'Aperçu' : 'Code'}
            </button>
          ))}
          <button
            type="button"
            className={`ml-1 flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              chatStatus !== 'close'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            onClick={toggleChat}
          >
            <MessageSquare className="size-3.5" />
            Chat IA
          </button>
        </div>

        {mainTab === 'preview' ? (
          <div className="relative flex-1 overflow-hidden">
            {previewSrc ? (
              <iframe
                className="size-full border-0"
                srcDoc={previewSrc}
                sandbox="allow-scripts allow-same-origin"
                title="App preview"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Eye className="size-10 opacity-20" />
                <p className="text-sm font-medium">Aucune app générée</p>
                <p className="text-xs">Décrivez votre app dans le chat IA à droite.</p>
              </div>
            )}

            {generating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
                {/* Cuppy mascot */}
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 24c0 0 2 6 8 6s8-6 8-6V14H12v10z"
                    fill="hsl(var(--primary))"
                    opacity="0.15"
                  />
                  <path d="M12 14h16v2H12z" fill="hsl(var(--primary))" opacity="0.3" />
                  <path
                    d="M28 16c0 0 4 0 4 4s-4 4-4 4"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                  <circle cx="17" cy="20" r="1.5" fill="hsl(var(--foreground))" />
                  <circle cx="23" cy="20" r="1.5" fill="hsl(var(--foreground))" />
                  <path
                    d="M17 23.5c0 0 1 1.5 3 1.5s3-1.5 3-1.5"
                    stroke="hsl(var(--foreground))"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <rect
                    x="14"
                    y="9"
                    width="12"
                    height="5"
                    rx="2.5"
                    fill="hsl(var(--primary))"
                    opacity="0.2"
                  />
                  <circle cx="17" cy="9" r="1" fill="hsl(var(--primary))" opacity="0.4" />
                  <circle cx="20" cy="8" r="1.2" fill="hsl(var(--primary))" opacity="0.4" />
                  <circle cx="23" cy="9" r="1" fill="hsl(var(--primary))" opacity="0.4" />
                </svg>
                <p className="text-sm font-semibold">Génération de l&apos;application…</p>
                <p className="text-xs text-muted-foreground">
                  L&apos;IA écrit le code, cela ne prendra pas longtemps.
                </p>
                {statusMessage && (
                  <p className="max-w-xs text-center text-xs text-muted-foreground/60">
                    {statusMessage}
                  </p>
                )}
                <Button variant="outline" size="sm" onClick={stop} className="mt-2 gap-1.5">
                  <Square className="size-3 fill-current" />
                  Arrêter
                </Button>
              </div>
            )}

            {generateError && !generating && (
              <div className="absolute inset-x-0 bottom-0 border-t bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <p className="flex-1 text-xs text-muted-foreground">{generateError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1 text-xs"
                    onClick={handleAutoFix}
                  >
                    <RefreshCw className="size-3" />
                    Auto-fix
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {fileList.length > 0 && (
              <div className="w-48 shrink-0 overflow-y-auto border-r bg-muted/30 py-2">
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Fichiers
                </p>
                {fileList.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`w-full truncate px-3 py-1.5 text-left text-xs transition-colors ${
                      selectedFile === f
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                    onClick={() => setSelectedFile(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-1 flex-col overflow-hidden">
              {files[selectedFile] !== undefined ? (
                <CodeEditor
                  key={selectedFile}
                  value={files[selectedFile]}
                  onChange={handleCodeChange}
                  theme="dark"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Aucun fichier sélectionné
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <ChatPanel />
    </div>
  );
}
