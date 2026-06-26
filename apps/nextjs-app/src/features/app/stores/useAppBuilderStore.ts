import { appBuilderGenerateStream } from '@teable/openapi';
import { create } from 'zustand';

interface IStreamEvent {
  type: 'start' | 'tool' | 'think' | 'progress' | 'file' | 'done' | 'error';
  message?: string;
  label?: string;
  path?: string;
  content?: string;
  current?: number;
  total?: number;
  tasks?: Array<{ label: string; done: boolean }>;
}

export interface IProgressTask {
  label: string;
  done: boolean;
}

export interface IHistoryEntry {
  prompt: string;
  files: Record<string, string>;
  at: number;
}

export interface IGenerateParams {
  prompt: string;
  baseId: string;
  appId: string;
  onSave: (files: Record<string, string>) => void;
  onInvalidate: () => void;
}

interface IAppBuilderState {
  files: Record<string, string>;
  selectedFile: string;
  generating: boolean;
  tasks: IProgressTask[];
  statusMessage: string;
  generateError: string | null;
  lastPrompt: string;
  selectedModel: string | undefined;
  history: IHistoryEntry[];

  setFiles: (files: Record<string, string>) => void;
  updateFile: (path: string, content: string) => void;
  setSelectedFile: (file: string) => void;
  setSelectedModel: (model: string | undefined) => void;
  clearError: () => void;
  restoreHistory: (entry: IHistoryEntry, params: Omit<IGenerateParams, 'prompt'>) => void;

  generate: (params: IGenerateParams) => Promise<void>;
  stop: () => void;
  autoFix: (params: Omit<IGenerateParams, 'prompt'>) => void;
}

// Module-level refs — safe because only one app builder is active at a time
let _controller: AbortController | null = null;
let _buffer = '';

const MAX_HISTORY = 8;

type ISetState = (
  partial: Partial<IAppBuilderState> | ((state: IAppBuilderState) => Partial<IAppBuilderState>)
) => void;
type IGetState = () => IAppBuilderState;

const createStreamEventHandler = (
  setState: ISetState,
  getState: IGetState,
  prompt: string,
  generatedFiles: Record<string, string>,
  onSave: IGenerateParams['onSave'],
  onInvalidate: IGenerateParams['onInvalidate']
) => {
  const handleFile = (event: IStreamEvent) => {
    if (!event.path || event.content === undefined) return;
    generatedFiles[event.path] = event.content;
    setState((state) => ({
      files: { ...state.files, [event.path!]: event.content! },
      selectedFile: event.path!,
    }));
  };

  const handleDone = () => {
    const snapshot = { ...getState().files, ...generatedFiles };
    const entry: IHistoryEntry = { prompt, files: snapshot, at: Date.now() };
    setState((state) => ({
      generating: false,
      statusMessage: '',
      tasks: [],
      history: [entry, ...state.history].slice(0, MAX_HISTORY),
    }));
    if (Object.keys(generatedFiles).length > 0) onSave(generatedFiles);
    onInvalidate();
  };

  return (event: IStreamEvent) => {
    switch (event.type) {
      case 'start':
        return setState({ statusMessage: event.message ?? 'Génération…' });
      case 'tool':
        return setState({ statusMessage: event.label ?? '' });
      case 'think':
        return setState({ statusMessage: event.message ?? '' });
      case 'progress':
        return setState({
          tasks: event.tasks ?? [],
          statusMessage: `Étape ${event.current}/${event.total}`,
        });
      case 'file':
        return handleFile(event);
      case 'done':
        return handleDone();
      case 'error':
        return setState({
          generateError: event.message ?? 'Erreur inconnue',
          generating: false,
          statusMessage: '',
        });
    }
  };
};

const readSseStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: IStreamEvent) => void
) => {
  const decoder = new TextDecoder();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    _buffer += decoder.decode(value, { stream: true });
    const lines = _buffer.split('\n');
    _buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        onEvent(JSON.parse(line) as IStreamEvent);
      } catch {
        // ignore malformed lines
      }
    }
  }
  // ponytail: flush remaining buffer — last event may arrive without trailing newline
  if (_buffer.trim()) {
    try {
      onEvent(JSON.parse(_buffer) as IStreamEvent);
    } catch {
      // ignore malformed
    }
    _buffer = '';
  }
};

export const useAppBuilderStore = create<IAppBuilderState>((set, get) => ({
  files: {},
  selectedFile: 'app/page.tsx',
  generating: false,
  tasks: [],
  statusMessage: '',
  generateError: null,
  lastPrompt: '',
  selectedModel: undefined,
  history: [],

  setFiles: (files) => {
    const { selectedFile } = get();
    set({ files });
    const keys = Object.keys(files);
    if (keys.length > 0 && !files[selectedFile]) set({ selectedFile: keys[0] });
  },

  updateFile: (path, content) => set((state) => ({ files: { ...state.files, [path]: content } })),

  setSelectedFile: (selectedFile) => set({ selectedFile }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  clearError: () => set({ generateError: null }),

  restoreHistory: (entry, params) => {
    set({ files: entry.files, selectedFile: Object.keys(entry.files)[0] ?? 'app/page.tsx' });
    params.onSave(entry.files);
    params.onInvalidate();
  },

  generate: async ({ prompt, baseId, appId, onSave, onInvalidate }) => {
    const { generating, selectedModel } = get();
    if (!prompt || generating || !baseId || !appId) return;

    set({
      generating: true,
      generateError: null,
      tasks: [],
      statusMessage: '',
      lastPrompt: prompt,
    });
    _buffer = '';
    _controller = new AbortController();

    const generatedFiles: Record<string, string> = {};
    const onEvent = createStreamEventHandler(
      set,
      get,
      prompt,
      generatedFiles,
      onSave,
      onInvalidate
    );

    try {
      const res = await appBuilderGenerateStream(
        baseId,
        appId,
        prompt,
        _controller.signal,
        selectedModel
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      await readSseStream(reader, onEvent);
      // ponytail: stream closed without 'done' event — still dismiss overlay
      if (get().generating) set({ generating: false, statusMessage: '' });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        set({ generating: false });
        return;
      }
      set({ generateError: e instanceof Error ? e.message : String(e), generating: false });
    }
  },

  stop: () => {
    _controller?.abort();
    set({ generating: false });
  },

  autoFix: (params) => {
    const { lastPrompt } = get();
    get().generate({
      ...params,
      prompt: `Le code précédent a une erreur. Corrige-le. Requirement original : "${lastPrompt}"`,
    });
  },
}));
