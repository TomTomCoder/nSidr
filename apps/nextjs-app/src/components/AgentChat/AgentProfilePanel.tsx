'use client';

import { useSession } from '@teable/sdk/hooks';
import { cn } from '@teable/ui-lib/shadcn';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@teable/ui-lib/shadcn/ui/dialog';
import { Input } from '@teable/ui-lib/shadcn/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@teable/ui-lib/shadcn/ui/select';
import { Separator } from '@teable/ui-lib/shadcn/ui/separator';
import { toast } from '@teable/ui-lib/shadcn/ui/sonner';
import { Switch } from '@teable/ui-lib/shadcn/ui/switch';
import { Textarea } from '@teable/ui-lib/shadcn/ui/textarea';
import {
  Activity,
  AtSign,
  Calendar,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Globe,
  History,
  Link2,
  Maximize2,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  Server,
  Share2,
  Sparkles,
  ThumbsUp,
  Trash2,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Trigger {
  id: string;
  triggerType: string;
  config: Record<string, unknown>;
  isActive: boolean;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const SectionTitle = ({
  label,
  badge,
  subtitle,
  action,
}: {
  label: string;
  badge?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="mb-1">
    <div className="flex items-baseline justify-between">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {badge && <span className="text-xs text-muted-foreground">{badge}</span>}
      </div>
      {action}
    </div>
    {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
  </div>
);

const SubLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
    {children}
  </p>
);

const Row = ({
  icon,
  title,
  description,
  checked,
  onToggle,
  onDelete,
  disabled,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  checked: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  badge?: string;
}) => (
  <div className="group flex items-start gap-2.5 rounded-lg px-1.5 py-2 transition-colors hover:bg-muted/60">
    <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium leading-tight text-foreground">{title}</p>
        {badge && (
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
      )}
    </div>
    <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
      <Switch checked={checked} onCheckedChange={onToggle} disabled={disabled} size="sm" />
      {onDelete && (
        <button
          onClick={onDelete}
          className="hidden text-muted-foreground/50 transition-colors group-hover:block hover:text-destructive"
          title="Supprimer"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  </div>
);

const AddLink = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 px-1.5 py-1 text-sm font-medium text-primary transition-opacity hover:opacity-80"
  >
    <Plus className="size-3.5" /> {label}
  </button>
);

const EmptyState = ({
  icon,
  text,
  cta,
  onCta,
}: {
  icon: React.ReactNode;
  text: string;
  cta: string;
  onCta: () => void;
}) => (
  <div className="my-1 flex flex-col items-center rounded-xl border border-border bg-gradient-to-b from-muted/30 to-transparent py-5 text-center transition-all duration-200 hover:border-primary/30 hover:shadow-sm">
    <div
      className="mb-2 flex size-9 items-center justify-center rounded-lg"
      style={{
        background:
          'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(79,70,229,0.08),rgba(14,165,233,0.08))',
        border: '1px solid rgba(124,58,237,0.18)',
        color: '#a78bfa',
      }}
    >
      {icon}
    </div>
    <p className="mb-3 px-4 text-xs text-muted-foreground">{text}</p>
    <button
      type="button"
      onClick={onCta}
      className="flex h-7 items-center gap-1 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
    >
      <Plus className="size-3.5" /> {cta}
    </button>
  </div>
);

// ─── Modals ───────────────────────────────────────────────────────────────────

const CronModal = ({ onSave, onClose }: { onSave: (c: string) => void; onClose: () => void }) => {
  const PRESETS = [
    { label: 'Chaque jour à 8h', value: '0 8 * * *' },
    { label: 'Chaque jour à 9h', value: '0 9 * * *' },
    { label: 'Chaque lundi à 9h', value: '0 9 * * 1' },
    { label: 'Chaque heure', value: '0 * * * *' },
    { label: 'Personnalisé', value: '' },
  ];
  const [sel, setSel] = useState(PRESETS[0].value);
  const [custom, setCustom] = useState('');
  const val = sel !== '' ? sel : custom;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter une planification</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setSel(p.value)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                sel === p.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {sel === '' && (
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="ex: 0 9 * * *"
            className="font-mono text-xs"
          />
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button size="sm" disabled={!val.trim()} onClick={() => val.trim() && onSave(val.trim())}>
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const McpServerModal = ({
  onSave,
  onClose,
}: {
  onSave: (name: string, url: string) => void;
  onClose: () => void;
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const valid = name.trim().length > 0 && url.trim().startsWith('http');
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter un serveur MCP</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du serveur"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL (ex: https://mcp.example.com/api)"
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            disabled={!valid}
            onClick={() => valid && onSave(name.trim(), url.trim())}
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RecordModal = ({
  onSave,
  onClose,
}: {
  onSave: (t: string, id: string) => void;
  onClose: () => void;
}) => {
  const [type, setType] = useState<'record_created' | 'record_updated'>('record_created');
  const [tableId, setTableId] = useState('');
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter une automatisation</DialogTitle>
        </DialogHeader>
        <Select
          value={type}
          onValueChange={(v) => setType(v as 'record_created' | 'record_updated')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="record_created">Quand un enregistrement est créé</SelectItem>
            <SelectItem value="record_updated">Quand un enregistrement est modifié</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={tableId}
          onChange={(e) => setTableId(e.target.value)}
          placeholder="Table ID (ex: tblXXXXXX)"
          className="font-mono text-xs"
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            disabled={!tableId.trim()}
            onClick={() => tableId.trim() && onSave(type, tableId.trim())}
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Section helpers ──────────────────────────────────────────────────────────

function cronLabel(expr: string) {
  const map: Record<string, string> = {
    '0 8 * * *': 'Chaque jour à 8h00',
    '0 9 * * *': 'Chaque jour à 9h00',
    '0 9 * * 1': 'Chaque lundi à 9h00',
    '0 * * * *': 'Chaque heure',
    '*/15 * * * *': 'Toutes les 15 min',
  };
  return map[expr] ?? expr;
}

const TEABLE_TOOLS = [
  { name: 'search_records', desc: 'Rechercher dans les enregistrements' },
  { name: 'get_records', desc: "Récupérer une liste d'enregistrements" },
  { name: 'get_record', desc: 'Récupérer un enregistrement unique' },
  { name: 'create_record', desc: 'Créer un enregistrement' },
  { name: 'update_record', desc: 'Modifier un enregistrement' },
  { name: 'delete_record', desc: 'Supprimer un enregistrement' },
  { name: 'create_comment', desc: 'Ajouter un commentaire' },
  { name: 'get_record_activity', desc: "Voir l'historique d'un enregistrement" },
  { name: 'save_memory', desc: 'Mémoriser une information' },
  { name: 'search_memory', desc: 'Rechercher dans la mémoire' },
  { name: 'get_context_graph', desc: 'Graphe de contexte (tables, champs, relations)' },
  { name: 'search_knowledge_base', desc: 'Rechercher dans la base de connaissances' },
];

// ─── Tabs / sections ──────────────────────────────────────────────────────────

type SectionId = 'instructions' | 'travaux' | 'competences' | 'connaissance' | 'memoire';

const TABS: { id: SectionId; label: string }[] = [
  { id: 'instructions', label: 'Instructions' },
  { id: 'travaux', label: 'Travaux' },
  { id: 'competences', label: 'Compétences' },
  { id: 'connaissance', label: 'Connaissance' },
  { id: 'memoire', label: 'Mémoire' },
];

const GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
];
const gradient = (name: string) => GRADIENTS[(name?.charCodeAt(0) ?? 0) % GRADIENTS.length];

interface AgentProfilePanelProps {
  agent: {
    id: string;
    name: string;
    description?: string | null;
    isPublic?: boolean;
    isActive?: boolean;
    instructions?: string;
    [key: string]: unknown;
  };
  onUpdated: (a: unknown) => void;
  onRunAgent: () => void;
  onDeleted?: () => void;
  isRunning?: boolean;
}

export function AgentProfilePanel({
  agent,
  onUpdated,
  onRunAgent,
  onDeleted,
  isRunning,
}: AgentProfilePanelProps) {
  const { user } = useSession();
  const [activeSection, setActiveSection] = useState<SectionId>('instructions');
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [instructions, setInstructions] = useState(agent.instructions ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [enabledTools, setEnabledTools] = useState(new Set(TEABLE_TOOLS.map((t) => t.name)));
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [workspaceEnabled, setWorkspaceEnabled] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [mcpServers, setMcpServers] = useState<
    { id: string; name: string; url: string; transport: string; enabled: boolean }[]
  >([]);
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [showCronModal, setShowCronModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sectionRefs: Record<SectionId, React.RefObject<HTMLDivElement>> = {
    instructions: useRef<HTMLDivElement>(null),
    travaux: useRef<HTMLDivElement>(null),
    competences: useRef<HTMLDivElement>(null),
    connaissance: useRef<HTMLDivElement>(null),
    memoire: useRef<HTMLDivElement>(null),
  };

  const loadTriggers = async () => {
    const res = await fetch(`/api/agent/${agent.id}/triggers`);
    if (res.ok) setTriggers(await res.json());
  };

  const loadTools = async () => {
    const res = await fetch(`/api/agent/${agent.id}/tools`);
    if (!res.ok) return;
    const rows = (await res.json()) as { toolName: string; isEnabled: boolean }[];
    const map = new Map(rows.map((r) => [r.toolName, r.isEnabled]));
    // web_search defaults OFF unless explicitly enabled
    setWebSearchEnabled(map.get('web_search') ?? false);
    // Initialize Teable tool toggles from saved agentTool rows.
    // Missing-row default: if no row exists for a Teable tool, treat it as ON
    // (matches the UX convention that built-in tools are enabled out of the box).
    // Only an explicit isEnabled:false row disables a tool.
    const derivedEnabled = new Set(
      TEABLE_TOOLS.filter((t) => map.get(t.name) !== false).map((t) => t.name)
    );
    setEnabledTools(derivedEnabled);
  };

  const loadMcpServers = async () => {
    const res = await fetch(`/api/agent/${agent.id}/mcp-servers`);
    if (res.ok) setMcpServers(await res.json());
  };

  const deleteAgent = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agent/${agent.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Agent supprimé');
      onDeleted?.();
    } catch {
      toast.error('Échec de la suppression');
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const addMcpServer = async (name: string, url: string) => {
    const res = await fetch(`/api/agent/${agent.id}/mcp-servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url }),
    });
    if (res.ok) {
      await loadMcpServers();
      toast.success('Serveur MCP ajouté');
    } else toast.error("Erreur lors de l'ajout du serveur MCP");
  };

  const toggleMcpServer = async (serverId: string, enabled: boolean) => {
    setMcpServers((prev) => prev.map((s) => (s.id === serverId ? { ...s, enabled } : s)));
    await fetch(`/api/agent/${agent.id}/mcp-servers/${serverId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
  };

  const deleteMcpServer = async (serverId: string) => {
    setMcpServers((prev) => prev.filter((s) => s.id !== serverId));
    await fetch(`/api/agent/${agent.id}/mcp-servers/${serverId}`, { method: 'DELETE' });
    toast.success('Serveur MCP supprimé');
  };

  useEffect(() => {
    void loadTriggers();
    void loadTools();
    void loadMcpServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

  const toggleWebSearch = async () => {
    const next = !webSearchEnabled;
    setWebSearchEnabled(next);
    await fetch(`/api/agent/${agent.id}/tools/web_search`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: next }),
    });
    toast.success(next ? 'Recherche Web activée' : 'Recherche Web désactivée');
  };

  const scrollTo = (id: SectionId) => {
    setActiveSection(id);
    sectionRefs[id].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const saveInstructions = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions }),
      });
      if (!res.ok) throw new Error();
      onUpdated(await res.json());
      toast.success('Instructions enregistrées');
    } catch {
      toast.error("Échec de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const addCron = async (cron: string) => {
    setShowCronModal(false);
    await fetch(`/api/agent/${agent.id}/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggerType: 'cron', config: { cron } }),
    });
    await loadTriggers();
    toast.success('Planification ajoutée');
  };

  const addRecord = async (type: string, tableId: string) => {
    setShowRecordModal(false);
    await fetch(`/api/agent/${agent.id}/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggerType: type, config: { tableId } }),
    });
    await loadTriggers();
    toast.success('Automatisation ajoutée');
  };

  const addWebhook = async () => {
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await fetch(`/api/agent/${agent.id}/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggerType: 'webhook', config: { secret } }),
    });
    await loadTriggers();
    toast.success('Webhook créé');
  };

  const toggleTrigger = async (t: Trigger) => {
    setTriggers((prev) => prev.map((x) => (x.id === t.id ? { ...x, isActive: !x.isActive } : x)));
    await fetch(`/api/agent/${agent.id}/triggers/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
  };

  const deleteTrigger = async (id: string) => {
    setTriggers((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/agent/${agent.id}/triggers/${id}`, { method: 'DELETE' });
    toast.success('Déclencheur supprimé');
  };

  const toggleTool = async (name: string) => {
    const isEnabled = !enabledTools.has(name);
    setEnabledTools((prev) => {
      const n = new Set(prev);
      if (isEnabled) n.add(name);
      else n.delete(name);
      return n;
    });
    await fetch(`/api/agent/${agent.id}/tools/${name}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled }),
    });
  };

  const cronTriggers = triggers.filter((t) => t.triggerType === 'cron');
  const autoTriggers = triggers.filter((t) =>
    ['record_created', 'record_updated', 'webhook'].includes(t.triggerType)
  );
  const manualCount = 2;
  const travauxCount = cronTriggers.length + autoTriggers.length + manualCount;
  const plural = (n: number) => (n <= 1 ? 'travail' : 'travaux');

  return (
    <div className="flex w-[400px] shrink-0 flex-col border-l border-border bg-background">
      {/* ── Identity header (ClickUp signature) ─────────── */}
      <div className="border-b border-border px-4 pb-3 pt-4">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div
              className={cn(
                'flex size-11 items-center justify-center rounded-full bg-gradient-to-br text-base font-bold text-white shadow-sm',
                gradient(agent.name)
              )}
            >
              {agent.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold leading-tight text-foreground">
              {agent.name}
            </h2>
            {agent.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {agent.description}
              </p>
            )}
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {agent.isActive !== false && (
                <>
                  <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> Actif
                  </span>
                  <span>·</span>
                </>
              )}
              <span>{agent.isPublic ? 'Public' : 'Privé'}</span>
              <span>·</span>
              <span>Géré par {user?.name ?? 'vous'}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              title="Partager"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).catch(() => undefined);
                toast.success('Lien copié');
              }}
            >
              <Share2 className="size-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon-xs" className="shrink-0" title="Activité">
              <Activity className="size-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-1 gap-1.5"
            onClick={() => window.dispatchEvent(new CustomEvent('agent:focus-chat'))}
          >
            <MessageSquare className="size-3.5" /> Demander
          </Button>
          <button
            type="button"
            onClick={onRunAgent}
            disabled={isRunning}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium text-white shadow-sm transition-all duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5,#0ea5e9)' }}
          >
            <Play className="size-3.5" /> {isRunning ? 'En cours…' : "Lancer l'agent"}
          </button>
        </div>
      </div>

      {/* ── Sticky tab bar ──────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-3 py-2 backdrop-blur">
        {TABS.map((tab) => {
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollTo(tab.id)}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 hover:scale-105"
              style={
                active
                  ? {
                      background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
                    }
                  : {
                      color: 'hsl(var(--muted-foreground))',
                      background: 'transparent',
                    }
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Single scrollable content page ─────────────── */}
      <div className="flex-1 space-y-0 overflow-y-auto p-4">
        {/* ── INSTRUCTIONS ──────────────────────────────── */}
        <div ref={sectionRefs.instructions} className="scroll-mt-14">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Instructions</p>
              <p className="text-xs text-muted-foreground">
                Que doit faire l'agent lorsqu'il s'exécute ?
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">
                <Sparkles className="size-3" /> Auto
                <ChevronDown className="size-3" />
              </button>
              <Button variant="ghost" size="icon-xs" title="Historique">
                <History className="size-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                title={instructionsExpanded ? 'Réduire' : 'Agrandir'}
                onClick={() => setInstructionsExpanded((v) => !v)}
              >
                <Maximize2 className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
          <div className="ai-gradient-ring overflow-hidden rounded-xl p-[1.5px]">
            <div className="rounded-[10px] bg-background dark:bg-[color-mix(in_oklab,white_5%,hsl(var(--background)))]">
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Décrivez ce que l'agent doit faire…"
                rows={instructionsExpanded ? 16 : 6}
                className="resize-none border-0 bg-transparent px-3 pb-2 pt-2.5 text-sm shadow-none transition-all focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => void saveInstructions()}
              disabled={isSaving}
              className="flex h-7 items-center gap-1 rounded-md px-3 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5,#0ea5e9)' }}
            >
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* ── TRAVAUX ───────────────────────────────────── */}
        <div ref={sectionRefs.travaux} className="scroll-mt-14">
          <SectionTitle
            label="Travaux"
            badge={`${travauxCount} ${plural(travauxCount)}`}
            subtitle="Quand cet agent doit-il s'exécuter ?"
          />

          <p className="mb-1.5 mt-3 text-xs font-semibold text-muted-foreground">
            Manuel {manualCount}
          </p>
          <Row
            icon={<AtSign className="size-4" />}
            title="Mention"
            description="Lorsque tu es mentionné sur un enregistrement, l'agent analyse et répond."
            checked
            disabled
          />
          <Row
            icon={<MessageSquare className="size-4" />}
            title="Message privé"
            description="Transforme le texte que l'utilisateur envoie en plan structuré."
            checked
            disabled
          />

          <p className="mb-1.5 mt-3 text-xs font-semibold text-muted-foreground">Planifié</p>
          {cronTriggers.length === 0 ? (
            <EmptyState
              icon={<Calendar className="size-6" />}
              text="Exécutez votre agent une fois par heure, jour, semaine, mois ou selon un calendrier personnalisé."
              cta="Ajouter un horaire"
              onCta={() => setShowCronModal(true)}
            />
          ) : (
            <>
              {cronTriggers.map((t) => (
                <Row
                  key={t.id}
                  icon={<Calendar className="size-4" />}
                  title={cronLabel((t.config as { cron?: string }).cron ?? '')}
                  description="Exécute l'agent selon le planning."
                  checked={t.isActive}
                  onToggle={() => void toggleTrigger(t)}
                  onDelete={() => void deleteTrigger(t.id)}
                />
              ))}
              <AddLink label="Ajouter un horaire" onClick={() => setShowCronModal(true)} />
            </>
          )}

          <p className="mb-1.5 mt-3 text-xs font-semibold text-muted-foreground">Automatisé</p>
          {autoTriggers.length === 0 ? (
            <EmptyState
              icon={<Zap className="size-6" />}
              text="Créez une automatisation qui exécute votre agent lorsque les critères sont remplis."
              cta="Ajouter une automatisation"
              onCta={() => setShowRecordModal(true)}
            />
          ) : (
            <>
              {autoTriggers.map((t) => {
                const cfg = t.config as { tableId?: string; secret?: string };
                const icon =
                  t.triggerType === 'webhook' ? (
                    <Link2 className="size-4" />
                  ) : t.triggerType === 'record_updated' ? (
                    <Pencil className="size-4" />
                  ) : (
                    <Zap className="size-4" />
                  );
                const label =
                  t.triggerType === 'webhook'
                    ? 'Webhook entrant'
                    : t.triggerType === 'record_updated'
                      ? 'Enregistrement modifié'
                      : 'Enregistrement créé';
                return (
                  <Row
                    key={t.id}
                    icon={icon}
                    title={label}
                    description={
                      t.triggerType === 'webhook'
                        ? `Secret : ${cfg.secret?.slice(0, 14)}…`
                        : `Table : ${cfg.tableId}`
                    }
                    checked={t.isActive}
                    onToggle={() => void toggleTrigger(t)}
                    onDelete={() => void deleteTrigger(t.id)}
                  />
                );
              })}
              <AddLink
                label="Ajouter une automatisation"
                onClick={() => setShowRecordModal(true)}
              />
              <AddLink label="Ajouter un webhook" onClick={() => void addWebhook()} />
            </>
          )}
        </div>

        <Separator className="my-4" />

        {/* ── COMPÉTENCES ───────────────────────────────── */}
        <div ref={sectionRefs.competences} className="scroll-mt-14">
          <SectionTitle
            label="Compétences"
            badge={`${enabledTools.size} outils`}
            subtitle="Quelles actions l'agent peut-il effectuer ?"
          />
          <button
            onClick={() => setToolsExpanded((v) => !v)}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-1.5 py-2 transition-colors hover:bg-muted/60"
          >
            <Database className="size-4 text-muted-foreground" />
            <span className="flex-1 text-left text-sm font-medium text-foreground">
              Teable · {TEABLE_TOOLS.length} outils
            </span>
            {toolsExpanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>
          {toolsExpanded && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
              {TEABLE_TOOLS.map((tool) => (
                <Row
                  key={tool.name}
                  icon={<span className="text-muted-foreground/50">·</span>}
                  title={tool.name}
                  description={tool.desc}
                  checked={enabledTools.has(tool.name)}
                  onToggle={() => void toggleTool(tool.name)}
                />
              ))}
            </div>
          )}
          <AddLink label="Ajouter des outils" onClick={() => toast.info('Bientôt disponible')} />
        </div>

        <Separator className="my-4" />

        {/* ── CONNAISSANCE ──────────────────────────────── */}
        <div ref={sectionRefs.connaissance} className="scroll-mt-14">
          <SectionTitle label="Connaissance" subtitle="À quoi cet agent peut-il accéder ?" />
          <SubLabel>Accès à l'environnement de travail</SubLabel>
          <Row
            icon={<Database className="size-4" />}
            title="Espace de travail Teable"
            description="Lire et écrire dans les bases accessibles à cet agent."
            checked={workspaceEnabled}
            onToggle={() => setWorkspaceEnabled((v) => !v)}
          />
          <AddLink label="Ajouter depuis Teable" onClick={() => toast.info('Bientôt disponible')} />
          <SubLabel>Recherche externe</SubLabel>
          <Row
            icon={<Globe className="size-4" />}
            title="Recherche sur le Web"
            description="Permettre à l'agent de chercher sur internet (Google)."
            checked={webSearchEnabled}
            onToggle={() => void toggleWebSearch()}
          />
          <SubLabel>Connecteurs MCP</SubLabel>
          {mcpServers.map((srv) => (
            <div
              key={srv.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
            >
              <Server className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{srv.name}</div>
                <div className="truncate text-xs text-muted-foreground">{srv.url}</div>
              </div>
              <Switch
                checked={srv.enabled}
                onCheckedChange={(v) => void toggleMcpServer(srv.id, v)}
                className="shrink-0"
              />
              <button
                onClick={() => void deleteMcpServer(srv.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          <AddLink label="Ajouter un serveur MCP" onClick={() => setShowMcpModal(true)} />
        </div>

        <Separator className="my-4" />

        {/* ── MÉMOIRE ───────────────────────────────────── */}
        <div ref={sectionRefs.memoire} className="scroll-mt-14 pb-6">
          <SectionTitle
            label="Mémoire"
            subtitle="Quels éléments peuvent être enregistrés dans la mémoire de cet agent ?"
            action={
              <button className="text-xs font-medium text-primary transition-opacity hover:opacity-80">
                Voir les souvenirs
              </button>
            }
          />
          <div className="mt-2 space-y-0.5">
            <Row
              icon={<Globe className="size-4" />}
              title="Récent"
              description="Mémoire privée à court terme de votre travail récent."
              checked
              disabled
            />
            <Row
              icon={<ThumbsUp className="size-4" />}
              title="Préférences"
              description="S'améliore lorsque les humains donnent des directives."
              checked
              disabled
            />
            <Row
              icon={<FileText className="size-4" />}
              title="Renseignements"
              description="Apprenez et enregistrez automatiquement des infos clés."
              checked={false}
              disabled
              badge="Bêta"
            />
          </div>
        </div>
      </div>

      {/* ── Delete zone ─────────────────────────────── */}
      {onDeleted && (
        <div className="border-t border-border px-4 py-4">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
            >
              <Trash2 className="size-4" /> Supprimer cet agent
            </button>
          ) : (
            <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-destructive">
                Supprimer «&nbsp;{agent.name}&nbsp;» ?
              </p>
              <p className="text-xs text-muted-foreground">Cette action est irréversible.</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => void deleteAgent()}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Suppression…' : 'Confirmer'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCronModal && <CronModal onSave={addCron} onClose={() => setShowCronModal(false)} />}
      {showRecordModal && (
        <RecordModal onSave={addRecord} onClose={() => setShowRecordModal(false)} />
      )}
      {showMcpModal && (
        <McpServerModal
          onSave={(name, url) => {
            void addMcpServer(name, url);
            setShowMcpModal(false);
          }}
          onClose={() => setShowMcpModal(false)}
        />
      )}
    </div>
  );
}
