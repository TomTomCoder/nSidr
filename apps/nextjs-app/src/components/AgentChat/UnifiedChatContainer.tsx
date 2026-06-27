'use client';

import { UploadType } from '@teable/openapi';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { ScrollArea } from '@teable/ui-lib/shadcn/ui/scroll-area';
import { Textarea } from '@teable/ui-lib/shadcn/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@teable/ui-lib/shadcn/ui/tooltip';
import {
  BarChart2,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Cpu,
  Database,
  File as FileIcon,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Square,
  Workflow,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ModelSelector } from '@/features/app/components/ModelSelector';
import { useAvailableModels } from '@/features/app/hooks/useAvailableModels';
import { uploadFiles } from '@/features/app/utils/uploadFile';
import { useUnifiedChatStore } from '@/features/app/stores/useUnifiedChatStore';
import type { UnifiedChatEvent } from '@/types/agent';
import { useAppBuilderStore } from '@/features/app/stores/useAppBuilderStore';
import { MessageItem } from './MessageItem';
import { TaskProgressPanel } from './TaskProgressPanel';

const ASK_PLACEHOLDERS = [
  'Obtenez des réponses, des informations et des idées en un instant.',
  'Construis un CRM : entreprises, contacts, opportunités…',
  'Analyse mes données et donne-moi des insights.',
  'Crée un suivi de tâches avec vue Kanban…',
  'Génère un rapport hebdomadaire à partir de mes tables…',
];

const AGENT_PLACEHOLDER =
  'Décrivez les objectifs, les rôles, les tâches ou les processus de votre agent builder.';

const TOOL_COLLAPSE_THRESHOLD = 2;

const ASK_CARDS = [
  {
    icon: ClipboardList,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    border: 'rgba(167,139,250,0.25)',
    label: 'Résumer cette base',
    desc: "Vue d'ensemble du contenu",
    prompt: 'Résume le contenu et la structure de cette base de données.',
  },
  {
    icon: Database,
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.25)',
    label: 'Créer une table',
    desc: 'Nouvelle table sur mesure',
    prompt: "Crée une nouvelle table adaptée à mon cas d'usage.",
  },
  {
    icon: Search,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.25)',
    label: 'Trouver mes données',
    desc: 'Recherche dans la base',
    prompt: 'Trouve et liste les enregistrements les plus importants de cette base.',
  },
  {
    icon: Sparkles,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.25)',
    label: 'Brainstorming',
    desc: 'Idées et suggestions IA',
    prompt: 'Donne-moi des idées pour améliorer et enrichir cette base de données.',
  },
];

const AGENT_CARDS = [
  {
    icon: ClipboardList,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    border: 'rgba(167,139,250,0.25)',
    label: 'Créateur de tâches',
    desc: 'Génère des tâches selon vos objectifs',
    prompt: 'Crée des tâches structurées pour atteindre mes objectifs.',
  },
  {
    icon: BarChart2,
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.25)',
    label: 'Mise à jour statut',
    desc: 'Gère la progression des projets',
    prompt: 'Mets à jour les statuts de mes enregistrements en cours.',
  },
  {
    icon: BookOpen,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.25)',
    label: 'Assistant onboarding',
    desc: 'Guide les nouveaux utilisateurs',
    prompt: "Crée un guide d'onboarding pour cette base de données.",
  },
  {
    icon: Cpu,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.25)',
    label: 'Documentation',
    desc: 'Synthétise la documentation',
    prompt: 'Génère une documentation complète de cette base de données.',
  },
];

const AGENT_CATEGORIES = [
  'Applications',
  'Projets',
  'Personnel',
  'Certifié',
  'Tâches',
  'Direction',
  'Planification',
  'Logiciel',
];

interface ISuggestion {
  label: string;
  icon: React.ElementType;
}
interface ISuggestionGroup {
  label: string;
  items: ISuggestion[];
}
interface UnifiedChatContainerProps {
  spaceId: string;
  agentId?: string;
  activeBaseId?: string;
  className?: string;
  suggestionGroups?: ISuggestionGroup[];
  pageContext?: { tableId?: string; tableName?: string; viewId?: string; viewName?: string };
  // When provided, intercepts submit — return true to skip normal chat flow
  onSubmit?: (text: string) => boolean | Promise<boolean>;
}

function isToolMsg(msg: UnifiedChatEvent) {
  return msg.type === 'tool' || msg.type === 'tool_result';
}

export function UnifiedChatContainer({
  spaceId,
  agentId,
  activeBaseId,
  className,
  suggestionGroups,
  pageContext,
  onSubmit,
}: UnifiedChatContainerProps) {
  const {
    messages,
    isStreaming,
    conversationId,
    setIsStreaming,
    appendMessage,
    setConversationId,
    activeProposals,
    setProposalStatus,
  } = useUnifiedChatStore(spaceId, activeBaseId);

  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const [phIdx, setPhIdx] = useState(0);
  const [mode, setMode] = useState<'ask' | 'agent'>('ask');
  const [activeCat, setActiveCat] = useState('Applications');
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const availableModels = useAvailableModels();
  const bottomRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const currentModel = useMemo(
    () => availableModels.find((m) => m.value === (selectedModel ?? availableModels[0]?.value)),
    [availableModels, selectedModel]
  );
  const supportsFiles = currentModel?.supportsFiles ?? false;

  // Drop attachments picked for a model that no longer supports them (model switched mid-pick)
  useEffect(() => {
    if (!supportsFiles && attachedFiles.length > 0) setAttachedFiles([]);
  }, [supportsFiles, attachedFiles.length]);

  const handleFilesPicked = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAttachedFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  useEffect(
    () => () => {
      readerRef.current?.cancel();
    },
    []
  );

  useEffect(() => {
    if (isStreaming || input || mode === 'agent') return;
    const id = setInterval(() => setPhIdx((i) => (i + 1) % ASK_PLACEHOLDERS.length), 3500);
    return () => clearInterval(id);
  }, [isStreaming, input, mode]);

  useEffect(() => {
    const handler = (e: Event) => {
      const s = (e as CustomEvent<string>).detail;
      if (s) void sendMessage(s);
    };
    window.addEventListener('unified-chat-suggestion', handler);
    return () => window.removeEventListener('unified-chat-suggestion', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, conversationId, isStreaming, selectedModel]);

  const handleStop = () => {
    readerRef.current?.cancel();
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const sendMessage = async (userText: string) => {
    const text = userText.trim();
    if (!text || isStreaming || isUploadingFiles) return;
    const filesToSend = !agentId && supportsFiles ? attachedFiles : [];
    setInput('');
    setAttachedFiles([]);
    setExpandedGroups(new Set());
    if (onSubmit && (await onSubmit(text))) return;
    appendMessage({ type: 'text_chunk', content: text, role: 'user' } as UnifiedChatEvent);
    setIsStreaming(true);
    try {
      let attachments: { url: string; name: string; mimetype: string }[] | undefined;
      if (filesToSend.length > 0) {
        setIsUploadingFiles(true);
        try {
          const uploaded = await uploadFiles(filesToSend, UploadType.ChatFile, activeBaseId);
          attachments = uploaded.map((a) => ({
            url: a.presignedUrl,
            name: a.name,
            mimetype: a.mimetype,
          }));
        } finally {
          setIsUploadingFiles(false);
        }
      }
      const endpoint = agentId ? `/api/agent/${agentId}/run` : `/api/spaces/${spaceId}/ai/chat`;
      const requestBody = agentId
        ? { trigger: 'manual', triggerPayload: { message: text }, conversationId, pageContext }
        : { message: text, conversationId, modelKey: selectedModel, activeBaseId, attachments };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok || !res.body) {
        appendMessage({ type: 'error', content: `HTTP ${res.status}` } as UnifiedChatEvent);
        return;
      }
      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const j = line.slice(6).trim();
          if (!j || j === '[DONE]') continue;
          try {
            const ev = JSON.parse(j) as UnifiedChatEvent;
            appendMessage(ev);
            if (ev.type === 'done' && ev.conversationId) setConversationId(ev.conversationId);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError')
        appendMessage({
          type: 'error',
          content: err.message || 'Stream error',
        } as UnifiedChatEvent);
    } finally {
      readerRef.current = null;
      setIsStreaming(false);
    }
  };

  const hasMessages = messages.length > 0;
  const pendingProposals = useMemo(
    () =>
      messages
        .filter((m) => m.type === 'proposal' && m.proposal)
        .map((m) => (m as { proposal: { proposalId: string; action: string; preview: unknown } }).proposal)
        .filter((p) => (activeProposals[p.proposalId] ?? 'pending') === 'pending'),
    [messages, activeProposals]
  );

  const [isAcceptingAll, setIsAcceptingAll] = useState(false);

  const handleAcceptAll = useCallback(async () => {
    if (isAcceptingAll || pendingProposals.length === 0) return;
    setIsAcceptingAll(true);
    let pendingNavigation: { baseId: string; appId: string } | null = null;
    for (const proposal of pendingProposals) {
      setProposalStatus(proposal.proposalId, 'accepting');
      try {
        const res = await fetch(`/api/spaces/${spaceId}/ai/accept-proposal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId: proposal.proposalId, conversationId }),
        });
        const result = (await res.json()) as { status?: string; agentId?: string; shouldStream?: boolean; appId?: string; baseId?: string; prompt?: string };
        setProposalStatus(proposal.proposalId, result?.status === 'skipped' ? 'error' : 'accepted');
        if (result?.shouldStream && result?.appId && result?.baseId) {
          useAppBuilderStore.getState().queueGeneration({
            appId: result.appId as string,
            prompt: (result.prompt as string) ?? '',
            baseId: result.baseId as string,
          });
          // Navigate after the loop finishes
          pendingNavigation = { baseId: result.baseId as string, appId: result.appId as string };
        }
        if (result?.agentId) window.dispatchEvent(new Event('agent-created'));
      } catch {
        setProposalStatus(proposal.proposalId, 'error');
      }
    }
    if (pendingNavigation) {
      window.location.href = `/base/${pendingNavigation.baseId}/app/${pendingNavigation.appId}`;
    }
    setIsAcceptingAll(false);
  }, [isAcceptingAll, pendingProposals, spaceId, conversationId, setProposalStatus]);


  const isGeneratingApp = useMemo(() => {
    if (!isStreaming) return false;
    return messages.some(
      (m) =>
        m.type === 'tool' && 'name' in m && m.name === 'create_app' && !('output' in m && m.output)
    );
  }, [messages, isStreaming]);

  type MsgGroup =
    | { kind: 'single'; msg: UnifiedChatEvent; originalIndex: number }
    | { kind: 'tools'; msgs: UnifiedChatEvent[]; groupIndex: number };
  // eslint-disable-next-line sonarjs/cognitive-complexity
  const messageGroups = useMemo((): MsgGroup[] => {
    const groups: MsgGroup[] = [];
    let i = 0,
      gc = 0;
    while (i < messages.length) {
      if (isToolMsg(messages[i])) {
        const batch: UnifiedChatEvent[] = [];
        while (i < messages.length && isToolMsg(messages[i])) batch.push(messages[i++]);
        if (batch.length > TOOL_COLLAPSE_THRESHOLD)
          groups.push({ kind: 'tools', msgs: batch, groupIndex: gc++ });
        else batch.forEach((m) => groups.push({ kind: 'single', msg: m, originalIndex: i }));
      } else {
        groups.push({ kind: 'single', msg: messages[i], originalIndex: i });
        i++;
      }
    }
    return groups;
  }, [messages]);

  // ── Shared: input box (tabs inside, gradient border) ─────────────────────
  const renderInput = (large: boolean) => (
    <div className="ai-gradient-ring overflow-hidden rounded-xl p-[1.5px]">
      <div className="rounded-[10px] bg-background">
        {/* Mode tabs */}
        <div className="flex items-center gap-0.5 px-3 pt-2.5">
          {(['ask', 'agent'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="relative rounded-md px-3 py-1 text-xs font-semibold transition-all duration-200"
              style={
                mode === m
                  ? {
                      background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                      color: '#fff',
                      boxShadow: '0 1px 6px rgba(124,58,237,0.45)',
                    }
                  : { color: 'hsl(var(--muted-foreground))', background: 'transparent' }
              }
            >
              {m === 'ask' ? 'Demander' : 'Agents'}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'agent' ? AGENT_PLACEHOLDER : ASK_PLACEHOLDERS[phIdx]}
          className={`resize-none border-0 bg-transparent px-4 pb-1 pt-2 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent ${large ? 'max-h-[200px] min-h-[72px]' : 'max-h-[120px] min-h-[40px]'}`}
          disabled={isStreaming}
          rows={large ? 3 : 1}
        />

        {/* Attached file chips */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {attachedFiles.map((file, i) => (
              <span
                key={`${file.name}-${i}`}
                className="flex items-center gap-1 rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                <FileIcon className="size-3 shrink-0" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachedFile(i)}
                  className="ml-0.5 rounded-full transition-colors duration-200 hover:text-foreground"
                  aria-label={`Retirer ${file.name}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                handleFilesPicked(e.target.files);
                e.target.value = '';
              }}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={!supportsFiles}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex size-6 items-center justify-center rounded-full border border-border/50 text-muted-foreground/70 transition-colors duration-200 hover:border-border hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border/50 disabled:hover:bg-transparent"
                  >
                    <Plus className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {supportsFiles
                    ? 'Joindre des fichiers (image, PDF)'
                    : 'Ce modèle ne prend pas en charge les fichiers'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ModelSelector
              models={availableModels}
              value={selectedModel}
              onChange={setSelectedModel}
              className="h-6 rounded-full border border-border/50 bg-transparent px-2 text-xs text-muted-foreground/70 shadow-none transition-colors duration-200 hover:border-border hover:bg-muted hover:text-foreground"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {isStreaming && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                En cours…
              </span>
            )}
            {isStreaming ? (
              <Button variant="ghost" size="icon-xs" className="size-7" onClick={handleStop}>
                <Square className="size-3 fill-current" />
              </Button>
            ) : (
              <button
                type="button"
                onClick={() => void sendMessage(input)}
                disabled={!input.trim() || isUploadingFiles}
                className="flex size-7 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:brightness-110 disabled:opacity-25"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5,#0ea5e9)' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Shared: action / agent card grid ─────────────────────────────────────
  const cards = mode === 'ask' ? ASK_CARDS : AGENT_CARDS;
  const renderCards = (delayStart: number) => (
    <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <button
            key={card.label}
            type="button"
            onClick={() => void sendMessage(card.prompt)}
            className={`ai-hero-enter-delay-${delayStart + i} group flex flex-col gap-1.5 rounded-xl p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
            style={{
              background: 'color-mix(in oklab, hsl(var(--card)) 70%, transparent)',
              border: `1px solid ${card.border}`,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <div
              className="flex size-7 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
              style={{ background: card.bg }}
            >
              <Icon className="size-3.5" style={{ color: card.color }} />
            </div>
            <span className="overflow-hidden break-words text-xs font-semibold leading-tight">
              {card.label}
            </span>
            <span className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
              {card.desc}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={`flex flex-col overflow-hidden ${className ?? ''}`}>
      {/* ── HERO (no messages) ────────────────────────────────────────── */}
      {!hasMessages && (
        <ScrollArea className="min-h-0 flex-1">
          <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-14">
            {/* Ambient background glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ zIndex: 0 }}
            >
              <div
                className="absolute left-1/2 top-1/3 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(124,58,237,0.6) 0%, rgba(79,70,229,0.4) 40%, transparent 70%)',
                }}
              />
              <div
                className="absolute left-2/3 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-3xl"
                style={{
                  background: 'radial-gradient(circle, rgba(14,165,233,0.8) 0%, transparent 70%)',
                }}
              />
            </div>

            {/* Icon + Title */}
            <div className="ai-hero-enter relative z-10 mb-2 flex items-center gap-3">
              <div
                className="ai-icon-float flex size-11 items-center justify-center rounded-2xl shadow-lg"
                style={{
                  background:
                    'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(79,70,229,0.2),rgba(14,165,233,0.2))',
                  border: '1px solid rgba(124,58,237,0.35)',
                  boxShadow: '0 0 24px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                {mode === 'ask' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id="icg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#c4b5fd" />
                        <stop offset="100%" stopColor="#7dd3fc" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
                      fill="url(#icg)"
                    />
                  </svg>
                ) : (
                  <Workflow className="size-5" style={{ color: '#c4b5fd' }} />
                )}
              </div>
              <div>
                <h1
                  className="bg-clip-text text-3xl font-bold tracking-tight text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(135deg,#c4b5fd,#818cf8,#7dd3fc)',
                  }}
                >
                  {mode === 'ask' ? 'AI Assistant' : 'Agent Builder'}
                </h1>
                <p className="text-xs text-muted-foreground/70">
                  {mode === 'ask'
                    ? 'Interrogez, créez et analysez'
                    : 'Construisez des workflows autonomes'}
                </p>
              </div>
            </div>

            {/* Gradient input — large */}
            <div className="ai-hero-enter-delay-1 relative z-10 mt-5 w-full max-w-xl">
              {renderInput(true)}
            </div>

            {/* Action / Agent cards */}
            <div className="ai-hero-enter-delay-2 relative z-10 mt-4">{renderCards(3)}</div>

            {/* Agent category chips */}
            {mode === 'agent' && (
              <div className="ai-hero-enter-delay-3 relative z-10 mt-4 flex w-full max-w-xl flex-wrap gap-1.5">
                {AGENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCat(cat)}
                    className="rounded-full px-3 py-0.5 text-xs font-medium transition-all duration-200 hover:scale-105"
                    style={
                      activeCat === cat
                        ? {
                            background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                            color: '#fff',
                            boxShadow: '0 1px 8px rgba(124,58,237,0.4)',
                          }
                        : {
                            border: '1px solid hsl(var(--border)/0.7)',
                            color: 'hsl(var(--muted-foreground))',
                            background: 'transparent',
                          }
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Extra suggestion groups */}
            {suggestionGroups && suggestionGroups.length > 0 && (
              <div className="relative z-10 mt-6 flex w-full max-w-xl flex-col gap-3">
                {suggestionGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="flex flex-col gap-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            className="flex items-center gap-2 rounded-md border bg-card/60 px-2.5 py-1.5 text-left text-xs backdrop-blur-sm transition-colors duration-200 hover:bg-accent/60 dark:border-slate-800/50 dark:bg-slate-900/60 dark:hover:bg-slate-800/60"
                            onClick={() => void sendMessage(item.label)}
                          >
                            <Icon className="size-3 shrink-0 text-muted-foreground" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* ── THREAD VIEW ───────────────────────────────────────────────── */}
      {hasMessages && (
        <>
          <ScrollArea className="min-h-0 flex-1">
            {isGeneratingApp && (
              <div
                className="mx-4 my-2 flex flex-col items-center gap-2 rounded-xl border py-6 text-center"
                style={{
                  background: 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(79,70,229,0.04))',
                  borderColor: 'rgba(124,58,237,0.2)',
                }}
              >
                <div
                  className="flex size-9 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(124,58,237,0.12)' }}
                >
                  <Loader2 className="size-4 animate-spin" style={{ color: '#a78bfa' }} />
                </div>
                <p className="text-sm font-semibold">Génération de l&apos;application…</p>
                <p className="text-xs text-muted-foreground">
                  L&apos;IA écrit le code, cela ne prendra pas longtemps.
                </p>
              </div>
            )}
            <div className="overflow-x-hidden px-3 py-2">
              {messageGroups.map((group, gi) => {
                if (group.kind === 'single')
                  return (
                    <MessageItem
                      key={gi}
                      message={group.msg}
                      spaceId={spaceId}
                      conversationId={conversationId ?? ''}
                      activeBaseId={activeBaseId}
                    />
                  );
                const expanded = expandedGroups.has(group.groupIndex);
                const visible = expanded
                  ? group.msgs
                  : group.msgs.slice(0, TOOL_COLLAPSE_THRESHOLD);
                const hidden = group.msgs.length - TOOL_COLLAPSE_THRESHOLD;
                return (
                  <div key={gi}>
                    {visible.map((m, mi) => (
                      <MessageItem
                        key={mi}
                        message={m}
                        spaceId={spaceId}
                        conversationId={conversationId ?? ''}
                        activeBaseId={activeBaseId}
                      />
                    ))}
                    <button
                      type="button"
                      className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                      onClick={() =>
                        setExpandedGroups((prev) => {
                          const n = new Set(prev);
                          expanded ? n.delete(group.groupIndex) : n.add(group.groupIndex);
                          return n;
                        })
                      }
                    >
                      {expanded ? (
                        <ChevronDown className="size-3" />
                      ) : (
                        <ChevronRight className="size-3" />
                      )}
                      {expanded ? 'Voir moins' : `+${hidden} outils`}
                    </button>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
          <div className="shrink-0 border-t px-3 pb-3 pt-2">
            <TaskProgressPanel messages={messages} isStreaming={isStreaming} className="mb-2" />
            {pendingProposals.length > 0 && (
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => void handleAcceptAll()}
                  disabled={isAcceptingAll}
                  className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1, #4f46e5)' }}
                >
                  {isAcceptingAll
                    ? 'Acceptation en cours…'
                    : `Accepter tout (${pendingProposals.length})`}
                </button>
              </div>
            )}
            {renderInput(false)}
          </div>
        </>
      )}
    </div>
  );
}
