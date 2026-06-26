import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  generateWorkflowFromPrompt,
  getWorkflow,
  getUserIntegrationList,
  listWorkflowRuns,
  runWorkflow,
  updateWorkflow,
  UserIntegrationProvider,
} from '@teable/openapi';
import type {
  IUserIntegrationItemVo,
  IWorkflowRunHistoryItem,
  IWorkflowRunVo,
} from '@teable/openapi';
import { ReactQueryKeys } from '@teable/sdk/config';
import { cn } from '@teable/ui-lib';
import { Badge } from '@teable/ui-lib/shadcn/ui/badge';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@teable/ui-lib/shadcn/ui/dialog';
import { Input } from '@teable/ui-lib/shadcn/ui/input';
import { Label } from '@teable/ui-lib/shadcn/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@teable/ui-lib/shadcn/ui/select';
import { Switch } from '@teable/ui-lib/shadcn/ui/switch';
import { Textarea } from '@teable/ui-lib/shadcn/ui/textarea';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code,
  Database,
  Edit,
  FileText,
  Filter,
  GitBranch,
  Globe,
  History,
  Mail,
  MessageSquare,
  Minus,
  MousePointer,
  Play,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Webhook,
  X,
} from 'lucide-react';
import {
  forwardRef,
  Fragment,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { IStepConfig, IWorkflowConfig, StepType, TriggerType } from './workflow-types';
import {
  getTriggerDef,
  getStepDef,
  isTriggerValid,
  isStepValid,
  STEP_GROUPS,
  TRIGGER_DEFS,
} from './workflow-types';

export interface WorkFlowPanelRef {
  getWorkflow?: () => unknown;
  checkCanActive?: () => { canActive: boolean; message: string };
  activeWorkflow?: () => Promise<void>;
}

interface WorkFlowPanelProps {
  baseId: string;
  workflowId: string;
  headLeft?: React.ReactNode;
}

// ── Icon registry ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Filter,
  Plus,
  RefreshCw,
  FileText,
  Clock,
  MousePointer,
  Webhook,
  Mail,
  Code,
  MessageSquare,
  Sparkles,
  Database,
  Globe,
  PlusCircle,
  Search,
  Edit,
  GitBranch,
  Trash2,
};

function getIcon(name: string): React.ElementType {
  return ICON_MAP[name] ?? Plus;
}

// ── Connector ──────────────────────────────────────────────────────────────────

function Connector({ height = 28 }: { height?: number }) {
  return (
    <div className="flex flex-col items-center" style={{ height }}>
      <div className="w-px flex-1 bg-border" />
    </div>
  );
}

// ── End node ───────────────────────────────────────────────────────────────────

function EndNode() {
  return (
    <div className="flex size-8 items-center justify-center rounded-full border-2 border-border bg-background text-muted-foreground">
      <Minus className="size-4" />
    </div>
  );
}

// ── Add step button ────────────────────────────────────────────────────────────

function AddStepButton({ onAdd }: { onAdd: (type: StepType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative flex flex-col items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 items-center justify-center rounded-full border-2 border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-4" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fermer"
            className="fixed inset-0 z-10 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-10 z-20 w-80 rounded-lg border bg-popover p-2 shadow-xl">
            {STEP_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-2 pt-2 text-xs font-semibold text-muted-foreground">
                  {group.label}
                </p>
                {group.steps.map((step) => {
                  const Icon = getIcon(step.iconName);
                  return (
                    <button
                      key={step.type}
                      onClick={() => {
                        onAdd(step.type);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <div
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-full',
                          step.color
                        )}
                      >
                        <Icon className="size-3.5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{step.label}</span>
                          {step.recommended && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-yellow-400 py-0 text-[10px] text-yellow-600"
                            >
                              ★ Recommandé
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{step.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Trigger placeholder ────────────────────────────────────────────────────────

function TriggerPlaceholder({ onSelect }: { onSelect: (type: TriggerType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-72 items-center justify-between rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-sm transition-colors hover:border-primary hover:bg-primary/10"
      >
        <span className="font-medium text-primary">Sélectionner un déclencheur</span>
        <Plus className="size-4 text-primary" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fermer"
            className="fixed inset-0 z-10 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-14 z-20 w-80 rounded-lg border bg-popover py-2 shadow-xl">
            <p className="px-3 pb-1 text-xs font-semibold text-muted-foreground">
              Sélectionnez un déclencheur :
            </p>
            {TRIGGER_DEFS.map((def) => {
              const Icon = getIcon(def.iconName);
              return (
                <button
                  key={def.type}
                  disabled={def.comingSoon}
                  onClick={() => {
                    if (def.comingSoon) return;
                    onSelect(def.type);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-sm',
                    def.comingSoon ? 'cursor-not-allowed opacity-50' : 'hover:bg-accent'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full',
                      def.color
                    )}
                  >
                    <Icon className="size-3.5 text-white" />
                  </div>
                  <span>{def.label}</span>
                  {def.comingSoon && (
                    <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Bientôt
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Trigger node card ──────────────────────────────────────────────────────────

function TriggerNodeCard({
  trigger,
  stepNum,
  isSelected,
  onClick,
}: {
  trigger: NonNullable<IWorkflowConfig['trigger']>;
  stepNum: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const def = getTriggerDef(trigger.type);
  const Icon = def ? getIcon(def.iconName) : Clock;
  const valid = isTriggerValid(trigger);

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-72 items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left shadow-sm transition-all hover:shadow',
        isSelected ? 'border-primary ring-1 ring-primary' : 'border-border'
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          def?.color ?? 'bg-slate-500'
        )}
      >
        <Icon className="size-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {stepNum}. {def?.label ?? trigger.type}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {def?.description ?? 'Configurer ce déclencheur'}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant="outline" className="py-0 text-[10px]">
          Déclencheur
        </Badge>
        {valid ? (
          <CheckCircle2 className="size-3.5 text-green-500" />
        ) : (
          <AlertTriangle className="size-3.5 text-orange-400" />
        )}
      </div>
    </button>
  );
}

// ── Step node card ─────────────────────────────────────────────────────────────

function StepNodeCard({
  step,
  stepNum,
  isSelected,
  onClick,
}: {
  step: IStepConfig;
  stepNum: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const def = getStepDef(step.type);
  const Icon = def ? getIcon(def.iconName) : Plus;
  const isLogic = step.type === 'if_condition';
  const valid = isStepValid(step);

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-72 items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left shadow-sm transition-all hover:shadow',
        isSelected ? 'border-primary ring-1 ring-primary' : 'border-border',
        isLogic && !isSelected && 'border-indigo-500/40'
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          def?.color ?? 'bg-slate-500'
        )}
      >
        <Icon className="size-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {stepNum}. {def?.label ?? step.type}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {def?.description ?? 'Configurer cette étape'}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge
          variant="outline"
          className={cn('py-0 text-[10px]', isLogic && 'border-indigo-400 text-indigo-600')}
        >
          {isLogic ? 'Logique' : 'Action'}
        </Badge>
        {valid ? (
          <CheckCircle2 className="size-3.5 text-green-500" />
        ) : (
          <AlertTriangle className="size-3.5 text-orange-400" />
        )}
      </div>
    </button>
  );
}

// ── Logic branch layout ────────────────────────────────────────────────────────

function LogicBranch({ onAdd }: { onAdd: (type: StepType) => void }) {
  return (
    <div className="flex w-full items-start justify-center">
      <div className="flex flex-col items-center">
        <div className="mb-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Alors
        </div>
        <Connector height={16} />
        <AddStepButton onAdd={onAdd} />
      </div>
      <div className="w-20" />
      <div className="flex flex-col items-center">
        <div className="mb-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Sinon
        </div>
        <Connector height={16} />
        <AddStepButton onAdd={onAdd} />
      </div>
    </div>
  );
}

// ── Flow canvas ────────────────────────────────────────────────────────────────

function FlowCanvas({
  config,
  selectedId,
  onSelectTrigger,
  onSelectStep,
  onAddTrigger,
  onAddStep,
}: {
  config: IWorkflowConfig;
  selectedId: string | null;
  onSelectTrigger: () => void;
  onSelectStep: (id: string) => void;
  onAddTrigger: (type: TriggerType) => void;
  onAddStep: (type: StepType) => void;
}) {
  return (
    <div
      className="flex-1 overflow-auto"
      style={{
        backgroundImage:
          'radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="flex min-h-full flex-col items-center py-12">
        {config.trigger ? (
          <TriggerNodeCard
            trigger={config.trigger}
            stepNum={1}
            isSelected={selectedId === config.trigger.id}
            onClick={onSelectTrigger}
          />
        ) : (
          <TriggerPlaceholder onSelect={onAddTrigger} />
        )}

        {config.steps.map((step, i) => (
          <Fragment key={step.id}>
            <Connector />
            <StepNodeCard
              step={step}
              stepNum={i + 2}
              isSelected={selectedId === step.id}
              onClick={() => onSelectStep(step.id)}
            />
            {step.type === 'if_condition' && (
              <>
                <Connector height={16} />
                <LogicBranch onAdd={onAddStep} />
                <Connector height={16} />
              </>
            )}
          </Fragment>
        ))}

        <Connector />
        <AddStepButton onAdd={onAddStep} />
        <Connector />
        <EndNode />
        <div className="h-16" />
      </div>
    </div>
  );
}

function intervalLabel(type: string): string {
  if (type === 'days') return 'jour à';
  if (type === 'hours') return 'heure(s) à';
  if (type === 'weeks') return 'semaine(s) à';
  if (type === 'months') return 'mois à';
  return 'minute(s)';
}

// ── Scheduled trigger config ───────────────────────────────────────────────────

function ScheduleDetails({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div>
        <Label className="text-xs">* Programmation</Label>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Tous les</span>
          <Input
            type="number"
            min={1}
            className="w-16 text-xs"
            value={(config.intervalValue as number) ?? 1}
            onChange={(e) => onChange({ ...config, intervalValue: Number(e.target.value) })}
          />
          <span className="text-muted-foreground">
            {intervalLabel(config.intervalType as string)}
          </span>
          {config.intervalType !== 'minutes' && (
            <Input
              type="time"
              className="w-28 text-xs"
              value={(config.time as string) ?? '09:00'}
              onChange={(e) => onChange({ ...config, time: e.target.value })}
            />
          )}
        </div>
      </div>
      <div>
        <Label className="text-xs">* Début</Label>
        <Input
          type="date"
          className="mt-1 text-xs"
          value={(config.startDate as string) ?? new Date().toISOString().slice(0, 10)}
          onChange={(e) => onChange({ ...config, startDate: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Fin</Label>
        <p className="mb-1 text-xs text-muted-foreground">
          En option, définissez une heure de fin.
        </p>
        <Input
          type="date"
          className="text-xs"
          value={(config.endDate as string) ?? ''}
          onChange={(e) => onChange({ ...config, endDate: e.target.value || undefined })}
        />
      </div>
    </>
  );
}

function ScheduledTriggerConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Configuration
      </p>
      <div>
        <Label className="text-xs">* Type d&apos;intervalle</Label>
        <Select
          value={(config.intervalType as string) ?? ''}
          onValueChange={(v) => onChange({ ...config, intervalType: v })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Sélectionner..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="hours">Heures</SelectItem>
            <SelectItem value="days">Jours</SelectItem>
            <SelectItem value="weeks">Semaines</SelectItem>
            <SelectItem value="months">Mois</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(config.intervalType as string | undefined) && (
        <ScheduleDetails config={config} onChange={onChange} />
      )}
    </div>
  );
}

// ── Properties panel ───────────────────────────────────────────────────────────

function IntegrationPicker({
  integrations,
  provider,
  integrationId,
  onSelect,
}: {
  integrations: IUserIntegrationItemVo[] | undefined;
  provider: UserIntegrationProvider;
  integrationId: string;
  onSelect: (id: string) => void;
}) {
  const label = provider === UserIntegrationProvider.Slack ? 'Slack' : 'Email';
  return (
    <div>
      <Label className="text-xs">Compte {label}</Label>
      <Select value={integrationId} onValueChange={onSelect}>
        <SelectTrigger className="mt-1 text-xs">
          <SelectValue placeholder={`Sélectionner un compte ${label}…`} />
        </SelectTrigger>
        <SelectContent>
          {(integrations ?? []).map((i) => (
            <SelectItem key={i.id} value={i.id} className="text-xs">
              {i.name}
            </SelectItem>
          ))}
          {(integrations ?? []).length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Aucun compte connecté — connectez-en un dans Paramètres › Intégrations
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function StepConfig({
  step,
  slackIntegrations,
  emailIntegrations,
  updateStepConfig,
}: {
  step: IWorkflowConfig['steps'][number];
  slackIntegrations: IUserIntegrationItemVo[] | undefined;
  emailIntegrations: IUserIntegrationItemVo[] | undefined;
  updateStepConfig: (p: Record<string, unknown>) => void;
}) {
  const stepDef = getStepDef(step.type);
  return (
    <>
      <div className="flex items-center gap-2">
        {stepDef && (
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full',
              stepDef.color
            )}
          >
            {(() => {
              const Icon = getIcon(stepDef.iconName);
              return <Icon className="size-4 text-white" />;
            })()}
          </div>
        )}
        <p className="text-sm font-medium">{stepDef?.label ?? step.type}</p>
      </div>

      {step.type === 'if_condition' && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Condition
          </p>
          <textarea
            className="w-full resize-none rounded-md border bg-background p-2 font-mono text-xs"
            rows={4}
            placeholder={
              "record.fields.Status == 'Terminé'\nrecord.fields.Priority > 3 && record.fields.Status != 'Annulé'"
            }
            value={(step.config.condition as string) ?? ''}
            onChange={(e) => updateStepConfig({ condition: e.target.value })}
          />
          <div className="space-y-0.5 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Syntaxe</p>
            <p>
              Champs : <code>record.fields.NomDuChamp</code>
            </p>
            <p>
              Opérateurs :{' '}
              <code>
                == != &gt; &lt; &gt;= &lt;= contains startsWith endsWith isEmpty isNotEmpty
              </code>
            </p>
            <p>
              Logique : <code>&amp;&amp;</code> (ET) · <code>||</code> (OU)
            </p>
          </div>
        </div>
      )}

      {(step.type === 'create_record' ||
        step.type === 'update_record' ||
        step.type === 'get_records' ||
        step.type === 'record_action') && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Configuration
          </p>
          {step.type === 'record_action' && (
            <div>
              <Label className="text-xs">* Action</Label>
              <select
                className="mt-1 w-full rounded-md border bg-background p-1.5 text-xs"
                value={(step.config.action as string) ?? 'create'}
                onChange={(e) => updateStepConfig({ action: e.target.value })}
              >
                <option value="create">Créer un enregistrement</option>
                <option value="update">Mettre à jour un enregistrement</option>
                <option value="get">Obtenir des enregistrements</option>
              </select>
            </div>
          )}
          <div>
            <Label className="text-xs">ID de la table</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="tbl..."
              value={(step.config.tableId as string) ?? ''}
              onChange={(e) => updateStepConfig({ tableId: e.target.value })}
            />
          </div>
          {(step.type === 'update_record' ||
            (step.type === 'record_action' && (step.config.action as string) === 'update')) && (
            <div>
              <Label className="text-xs">
                ID de l&apos;enregistrement{' '}
                <span className="text-muted-foreground">
                  (vide = utiliser l&apos;enregistrement du déclencheur)
                </span>
              </Label>
              <Input
                className="mt-1 text-xs"
                placeholder="rec... (optionnel)"
                value={(step.config.recordId as string) ?? ''}
                onChange={(e) => updateStepConfig({ recordId: e.target.value })}
              />
            </div>
          )}
          {(step.type === 'create_record' ||
            step.type === 'update_record' ||
            (step.type === 'record_action' &&
              ((step.config.action as string) === 'create' ||
                (step.config.action as string) === 'update'))) && (
            <div>
              <Label className="text-xs">
                Champs (JSON){' '}
                <span className="text-muted-foreground">{'{"fieldId": "valeur"}'}</span>
              </Label>
              <textarea
                className="mt-1 w-full resize-none rounded-md border bg-background p-2 font-mono text-xs"
                rows={4}
                placeholder={'{\n  "fld...": "valeur",\n  "fld...": "{{record.fields.Status}}"\n}'}
                value={
                  typeof step.config.fields === 'object'
                    ? JSON.stringify(step.config.fields, null, 2)
                    : (step.config.fields as string) ?? ''
                }
                onChange={(e) => {
                  try {
                    updateStepConfig({ fields: JSON.parse(e.target.value) });
                  } catch {
                    updateStepConfig({ fields: e.target.value });
                  }
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Variables :{' '}
                <code className="rounded bg-muted px-0.5">{'{{record.fields.fieldId}}'}</code>{' '}
                (déclencheur),{' '}
                <code className="rounded bg-muted px-0.5">{'{{steps.0.output.text}}'}</code> (sortie
                de l&apos;étape 0).
              </p>
            </div>
          )}
          {(step.type === 'get_records' ||
            (step.type === 'record_action' && (step.config.action as string) === 'get')) && (
            <div>
              <Label className="text-xs">Nombre max d&apos;enregistrements</Label>
              <Input
                className="mt-1 text-xs"
                type="number"
                min={1}
                max={100}
                placeholder="20"
                value={(step.config.take as number) ?? 20}
                onChange={(e) => updateStepConfig({ take: Number(e.target.value) })}
              />
            </div>
          )}
        </div>
      )}

      {step.type === 'send_email' && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Configuration
          </p>
          <IntegrationPicker
            integrations={emailIntegrations}
            provider={UserIntegrationProvider.Gmail}
            integrationId={(step.config.integrationId as string) ?? ''}
            onSelect={(v) => updateStepConfig({ integrationId: v })}
          />
          <div>
            <Label className="text-xs">Destinataire</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="email@example.com"
              value={(step.config.to as string) ?? ''}
              onChange={(e) => updateStepConfig({ to: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Sujet</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="Sujet de l'e-mail"
              value={(step.config.subject as string) ?? ''}
              onChange={(e) => updateStepConfig({ subject: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Corps</Label>
            <textarea
              className="mt-1 w-full resize-none rounded-md border bg-background p-2 text-xs"
              rows={4}
              placeholder="Contenu de l'e-mail…"
              value={(step.config.body as string) ?? ''}
              onChange={(e) => updateStepConfig({ body: e.target.value })}
            />
          </div>
        </div>
      )}

      {step.type === 'http_request' && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Configuration
          </p>
          <div>
            <Label className="text-xs">Méthode</Label>
            <Select
              value={(step.config.method as string) ?? 'POST'}
              onValueChange={(v) => updateStepConfig({ method: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">URL</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="https://api.example.com/endpoint"
              value={(step.config.url as string) ?? ''}
              onChange={(e) => updateStepConfig({ url: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">En-tête Authorization</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="Bearer mon-token (optionnel)"
              value={(step.config.authHeader as string) ?? ''}
              onChange={(e) => updateStepConfig({ authHeader: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Corps (JSON)</Label>
            <textarea
              className="mt-1 w-full resize-none rounded-md border bg-background p-2 font-mono text-xs"
              rows={5}
              placeholder={'{\n  "key": "value"\n}'}
              value={(step.config.body as string) ?? ''}
              onChange={(e) => updateStepConfig({ body: e.target.value })}
            />
          </div>
        </div>
      )}

      {step.type === 'execute_script' && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Script (JavaScript sandboxé)
          </p>
          <textarea
            className="w-full resize-none rounded-md border bg-background p-2 font-mono text-xs"
            rows={8}
            placeholder={
              "// data = données du déclencheur + steps précédents\n// data.steps[0].text = sortie de l'étape 0\nconst val = data.record?.fields?.Status;\nresult = `Statut: ${val}`;"
            }
            value={(step.config.script as string) ?? ''}
            onChange={(e) => updateStepConfig({ script: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            <code className="rounded bg-muted px-0.5">data</code> contient les données du
            déclencheur et <code className="rounded bg-muted px-0.5">data.steps[N]</code> la sortie
            des étapes précédentes. Assignez <code className="rounded bg-muted px-0.5">result</code>{' '}
            pour transmettre une valeur à l&apos;étape suivante.
          </p>
        </div>
      )}

      {step.type === 'ai_generate' && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Configuration
          </p>
          <div>
            <Label className="text-xs">Prompt</Label>
            <textarea
              className="mt-1 w-full resize-none rounded-md border bg-background p-2 text-xs"
              rows={4}
              placeholder={
                "Résume les données suivantes : {{record.fields.Notes}}\nSortie de l'étape 0 : {{steps.0.output.text}}"
              }
              value={(step.config.prompt as string) ?? ''}
              onChange={(e) => updateStepConfig({ prompt: e.target.value })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Variables :{' '}
              <code className="rounded bg-muted px-0.5">{'{{record.fields.fieldId}}'}</code>,{' '}
              <code className="rounded bg-muted px-0.5">{'{{steps.N.output.text}}'}</code>. La
              sortie (texte) est disponible dans les étapes suivantes via{' '}
              <code className="rounded bg-muted px-0.5">{'{{steps.N.output.text}}'}</code>.
            </p>
          </div>
        </div>
      )}

      {step.type === 'send_slack' && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Configuration
          </p>
          <IntegrationPicker
            integrations={slackIntegrations}
            provider={UserIntegrationProvider.Slack}
            integrationId={(step.config.integrationId as string) ?? ''}
            onSelect={(v) => updateStepConfig({ integrationId: v })}
          />
          <div>
            <Label className="text-xs">Canal</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="#général"
              value={(step.config.channel as string) ?? ''}
              onChange={(e) => updateStepConfig({ channel: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <textarea
              className="mt-1 w-full resize-none rounded-md border bg-background p-2 text-xs"
              rows={3}
              placeholder="Votre message..."
              value={(step.config.message as string) ?? ''}
              onChange={(e) => updateStepConfig({ message: e.target.value })}
            />
          </div>
        </div>
      )}
    </>
  );
}

function PropertiesPanel({
  config,
  selectedId,
  onChange,
  onClose,
}: {
  config: IWorkflowConfig;
  selectedId: string;
  onChange: (c: IWorkflowConfig) => void;
  onClose: () => void;
}) {
  const isTrigger = config.trigger?.id === selectedId;
  const step = config.steps.find((s) => s.id === selectedId);

  const needsSlackIntegration = step?.type === 'send_slack';
  const needsEmailIntegration = step?.type === 'send_email';

  const { data: slackIntegrations } = useQuery({
    queryKey: ['userIntegrations', 'slack'],
    queryFn: () =>
      getUserIntegrationList({ provider: UserIntegrationProvider.Slack }).then(
        (r) => r.data.integrations
      ),
    enabled: needsSlackIntegration,
  });

  const { data: emailIntegrations } = useQuery({
    queryKey: ['userIntegrations', 'email'],
    queryFn: () =>
      getUserIntegrationList({
        provider: UserIntegrationProvider.Gmail,
      }).then((r) => r.data.integrations),
    enabled: needsEmailIntegration,
  });

  if (!isTrigger && !step) return null;

  const updateTriggerConfig = (partial: Record<string, unknown>) => {
    if (!config.trigger) return;
    onChange({ ...config, trigger: { ...config.trigger, config: partial } });
  };

  const updateStepConfig = (partial: Record<string, unknown>) => {
    onChange({
      ...config,
      steps: config.steps.map((s) =>
        s.id === selectedId ? { ...s, config: { ...s.config, ...partial } } : s
      ),
    });
  };

  return (
    <div className="flex w-96 shrink-0 flex-col overflow-hidden border-l bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Propriétés</p>
          <p className="font-mono text-[10px] text-muted-foreground">ID: {selectedId}</p>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-accent">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isTrigger && config.trigger && (
          <>
            <div>
              <Label className="text-xs font-medium">Type de déclencheur</Label>
              <Select
                value={config.trigger.type}
                onValueChange={(v) =>
                  onChange({
                    ...config,
                    trigger: { id: config.trigger!.id, type: v as TriggerType, config: {} },
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_DEFS.map((def) => {
                    const Icon = getIcon(def.iconName);
                    return (
                      <SelectItem key={def.type} value={def.type} disabled={def.comingSoon}>
                        <div className="flex items-center gap-2">
                          <Icon className="size-3.5" />
                          <span className="truncate">{def.label}</span>
                          {def.comingSoon && (
                            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Bientôt
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {config.trigger.type === 'scheduled' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Les dates et heures sont affichées dans votre fuseau horaire local
                </p>
              )}
            </div>

            {config.trigger.type === 'scheduled' && (
              <ScheduledTriggerConfig
                config={config.trigger.config}
                onChange={updateTriggerConfig}
              />
            )}

            {(config.trigger.type === 'record_created' ||
              config.trigger.type === 'record_updated' ||
              config.trigger.type === 'record_deleted' ||
              config.trigger.type === 'record_matches_conditions') && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Configuration
                </p>
                <div>
                  <Label className="text-xs">* ID de la table</Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="tbl..."
                    value={(config.trigger.config.tableId as string) ?? ''}
                    onChange={(e) =>
                      updateTriggerConfig({ ...config.trigger!.config, tableId: e.target.value })
                    }
                  />
                </div>
                {config.trigger.type === 'record_matches_conditions' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Conditions (toutes doivent être vraies)</Label>
                    {(
                      (config.trigger.config.conditions as Array<{
                        field: string;
                        operator: string;
                        value: string;
                      }>) ?? []
                    ).map((cond, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <Input
                          className="h-7 flex-1 text-xs"
                          placeholder="ID du champ"
                          value={cond.field}
                          onChange={(e) => {
                            const conditions = [
                              ...((config.trigger!.config.conditions as Array<{
                                field: string;
                                operator: string;
                                value: string;
                              }>) ?? []),
                            ];
                            conditions[idx] = { ...conditions[idx], field: e.target.value };
                            updateTriggerConfig({ ...config.trigger!.config, conditions });
                          }}
                        />
                        <select
                          className="h-7 rounded-md border bg-background px-1 text-xs"
                          value={cond.operator}
                          onChange={(e) => {
                            const conditions = [
                              ...((config.trigger!.config.conditions as Array<{
                                field: string;
                                operator: string;
                                value: string;
                              }>) ?? []),
                            ];
                            conditions[idx] = { ...conditions[idx], operator: e.target.value };
                            updateTriggerConfig({ ...config.trigger!.config, conditions });
                          }}
                        >
                          {[
                            '==',
                            '!=',
                            '>',
                            '<',
                            '>=',
                            '<=',
                            'contains',
                            'isEmpty',
                            'isNotEmpty',
                          ].map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                        <Input
                          className="h-7 flex-1 text-xs"
                          placeholder="valeur"
                          value={cond.value}
                          onChange={(e) => {
                            const conditions = [
                              ...((config.trigger!.config.conditions as Array<{
                                field: string;
                                operator: string;
                                value: string;
                              }>) ?? []),
                            ];
                            conditions[idx] = { ...conditions[idx], value: e.target.value };
                            updateTriggerConfig({ ...config.trigger!.config, conditions });
                          }}
                        />
                        <button
                          className="text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const conditions = (
                              (config.trigger!.config.conditions as Array<unknown>) ?? []
                            ).filter((_, i) => i !== idx);
                            updateTriggerConfig({ ...config.trigger!.config, conditions });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => {
                        const conditions = [
                          ...((config.trigger!.config.conditions as Array<{
                            field: string;
                            operator: string;
                            value: string;
                          }>) ?? []),
                          { field: '', operator: '==', value: '' },
                        ];
                        updateTriggerConfig({ ...config.trigger!.config, conditions });
                      }}
                    >
                      + Ajouter une condition
                    </button>
                  </div>
                )}
              </div>
            )}

            {config.trigger.type === 'button_clicked' && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Configuration
                </p>
                <div>
                  <Label className="text-xs">* ID de la table</Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="tbl..."
                    value={(config.trigger.config?.tableId as string) ?? ''}
                    onChange={(e) =>
                      updateTriggerConfig({ ...config.trigger!.config, tableId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    ID du champ bouton{' '}
                    <span className="text-muted-foreground">
                      (optionnel — vide = tout bouton de la table)
                    </span>
                  </Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="fld..."
                    value={(config.trigger.config?.fieldId as string) ?? ''}
                    onChange={(e) =>
                      updateTriggerConfig({ ...config.trigger!.config, fieldId: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {config.trigger.type === 'webhook_received' && (
              <div className="space-y-3">
                <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p className="mb-1.5 font-medium text-foreground">URL du webhook</p>
                  <code className="select-all break-all">
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/api/base/${config.trigger.id?.split('_')[0] ?? '[baseId]'}/workflow/[workflowId]/webhook`
                      : '/api/base/[baseId]/workflow/[workflowId]/webhook'}
                  </code>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Secret (optionnel — envoyé dans X-Webhook-Secret)
                  </Label>
                  <Input
                    className="h-8 font-mono text-xs"
                    placeholder="mon-secret-token"
                    value={(config.trigger.config?.secret as string) ?? ''}
                    onChange={(e) =>
                      updateTriggerConfig({ ...config.trigger!.config, secret: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </>
        )}

        {step && (
          <StepConfig
            step={step}
            slackIntegrations={slackIntegrations}
            emailIntegrations={emailIntegrations}
            updateStepConfig={updateStepConfig}
          />
        )}

        {/* Test section */}
        <div className="rounded-lg border p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Étape de test
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            {isTrigger
              ? 'Testez ce déclencheur pour confirmer que sa configuration est correcte. Les données de ce test peuvent être utilisées dans les étapes suivantes.'
              : 'Testez cette étape pour confirmer sa configuration.'}
          </p>
          <Button size="sm" variant="outline" className="w-full text-xs">
            {isTrigger ? 'Tester le déclencheur' : 'Tester cette étape'}
          </Button>
        </div>

        {/* Results placeholder */}
        <div className="rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Résultats
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const WorkFlowPanel = forwardRef<WorkFlowPanelRef, WorkFlowPanelProps>(
  ({ baseId, workflowId, headLeft }, ref) => {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [localConfig, setLocalConfig] = useState<IWorkflowConfig | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [testRunOpen, setTestRunOpen] = useState(false);
    const [testRunResult, setTestRunResult] = useState<IWorkflowRunVo | null>(null);
    const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');

    const { data: workflow, isLoading } = useQuery({
      queryKey: ReactQueryKeys.workflowItem(baseId, workflowId),
      queryFn: () => getWorkflow(baseId, workflowId).then((r) => r.data),
      enabled: Boolean(baseId) && Boolean(workflowId),
    });

    const remoteConfig = useMemo<IWorkflowConfig>(() => {
      if (workflow?.config && typeof workflow.config === 'object') {
        const c = workflow.config as Partial<IWorkflowConfig>;
        return { trigger: c.trigger ?? null, steps: c.steps ?? [] };
      }
      return { trigger: null, steps: [] };
    }, [workflow]);

    const config: IWorkflowConfig = localConfig ?? remoteConfig;

    const { mutate: saveWorkflow, isPending: isSaving } = useMutation({
      mutationFn: (data: { config?: IWorkflowConfig; isActive?: boolean }) =>
        updateWorkflow(baseId, workflowId, data),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ReactQueryKeys.workflowItem(baseId, workflowId),
        });
        queryClient.invalidateQueries({ queryKey: ReactQueryKeys.workflowList(baseId) });
        setLocalConfig(null);
      },
    });

    const { mutate: doTestRun, isPending: testRunning } = useMutation({
      mutationFn: () => runWorkflow(baseId, workflowId).then((r) => r.data),
      onSuccess: (data) => {
        setTestRunResult(data);
        setTestRunOpen(true);
        queryClient.invalidateQueries({
          queryKey: ReactQueryKeys.workflowRuns(baseId, workflowId),
        });
      },
    });

    const { mutate: doAiGenerate, isPending: aiGenerating } = useMutation({
      mutationFn: (prompt: string) =>
        generateWorkflowFromPrompt(baseId, prompt).then((r) => r.data),
      onSuccess: (data) => {
        if (data.config && typeof data.config === 'object') {
          const c = data.config as Partial<IWorkflowConfig>;
          setLocalConfig({ trigger: c.trigger ?? null, steps: c.steps ?? [] });
        }
        setAiGenerateOpen(false);
        setAiPrompt('');
        queryClient.invalidateQueries({
          queryKey: ReactQueryKeys.workflowItem(baseId, workflowId),
        });
        queryClient.invalidateQueries({ queryKey: ReactQueryKeys.workflowList(baseId) });
      },
    });

    const { data: runHistory = [] } = useQuery<IWorkflowRunHistoryItem[]>({
      queryKey: ReactQueryKeys.workflowRuns(baseId, workflowId),
      queryFn: () => listWorkflowRuns(baseId, workflowId).then((r) => r.data),
      enabled: showHistory && Boolean(baseId) && Boolean(workflowId),
      refetchInterval: showHistory ? 5000 : false,
    });

    const handleSave = useCallback(() => {
      saveWorkflow({ config });
    }, [config, saveWorkflow]);

    const handleToggleActive = useCallback(() => {
      saveWorkflow({ isActive: !workflow?.isActive });
    }, [workflow, saveWorkflow]);

    useImperativeHandle(ref, () => ({
      getWorkflow: () => workflow,
      checkCanActive: () => {
        const hasValidTrigger = config.trigger !== null && isTriggerValid(config.trigger);
        return {
          canActive: hasValidTrigger,
          message: hasValidTrigger ? '' : 'Le déclencheur doit être configuré avant activation.',
        };
      },
      activeWorkflow: async () => {
        saveWorkflow({ isActive: true });
      },
    }));

    const handleAddTrigger = useCallback(
      (type: TriggerType) => {
        const newConfig: IWorkflowConfig = {
          ...config,
          trigger: { id: `trigger_${Date.now()}`, type, config: {} },
        };
        setLocalConfig(newConfig);
        setSelectedId(newConfig.trigger!.id);
      },
      [config]
    );

    const handleAddStep = useCallback(
      (type: StepType) => {
        const newStep: IStepConfig = { id: `step_${Date.now()}`, type, config: {} };
        const newConfig: IWorkflowConfig = { ...config, steps: [...config.steps, newStep] };
        setLocalConfig(newConfig);
        setSelectedId(newStep.id);
      },
      [config]
    );

    const handleConfigChange = useCallback((newConfig: IWorkflowConfig) => {
      setLocalConfig(newConfig);
    }, []);

    const isDirty = localConfig !== null;

    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      );
    }

    return (
      <>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2">
              {headLeft}
              <Switch checked={workflow?.isActive ?? false} onCheckedChange={handleToggleActive} />
              <span className="text-sm font-medium">
                {workflow?.name ?? 'Nouvelle automatisation'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isDirty && (
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={testRunning || !config.trigger}
                onClick={() => doTestRun()}
              >
                <Play className="size-3.5" />
                {testRunning ? 'Test…' : 'Exécuter le test'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setAiGenerateOpen(true)}
              >
                <Sparkles className="size-3.5" /> Générer avec IA
              </Button>
              <Button
                size="sm"
                variant={showHistory ? 'secondary' : 'outline'}
                className="gap-1.5"
                onClick={() => setShowHistory((v) => !v)}
              >
                <History className="size-3.5" /> Historique d&apos;exécution
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1">
            <FlowCanvas
              config={config}
              selectedId={selectedId}
              onSelectTrigger={() => setSelectedId(config.trigger?.id ?? null)}
              onSelectStep={setSelectedId}
              onAddTrigger={handleAddTrigger}
              onAddStep={handleAddStep}
            />

            {selectedId && !showHistory && (
              <PropertiesPanel
                config={config}
                selectedId={selectedId}
                onChange={handleConfigChange}
                onClose={() => setSelectedId(null)}
              />
            )}

            {showHistory && (
              <div className="flex w-80 shrink-0 flex-col border-l bg-card">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <p className="text-sm font-semibold">Historique d&apos;exécution</p>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="rounded p-1 hover:bg-accent"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {runHistory.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-4">
                      <p className="text-sm text-muted-foreground">Aucune exécution enregistrée.</p>
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {runHistory.map((run) => (
                        <li key={run.runId} className="px-4 py-3 text-xs">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 font-medium',
                                run.status === 'success' &&
                                  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
                                run.status === 'error' &&
                                  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
                                run.status === 'dry_run' &&
                                  'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              )}
                            >
                              {run.status === 'dry_run'
                                ? 'Test'
                                : run.status === 'success'
                                  ? 'Succès'
                                  : 'Erreur'}
                            </span>
                            <span className="text-muted-foreground">{run.durationMs} ms</span>
                          </div>
                          <p className="text-muted-foreground">
                            {new Date(run.startedAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' · '}
                            {run.trigger}
                          </p>
                          <ul className="mt-1.5 space-y-0.5">
                            {run.steps.map((s, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span
                                  className={cn(
                                    'mt-0.5 size-1.5 shrink-0 rounded-full',
                                    s.status === 'success' && 'bg-green-500',
                                    s.status === 'error' && 'bg-red-500',
                                    s.status === 'skipped' && 'bg-zinc-400'
                                  )}
                                />
                                <span className="text-muted-foreground">
                                  <span className="font-medium text-foreground">{s.type}</span>
                                  {' — '}
                                  {s.note}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test run result dialog */}
        <Dialog open={testRunOpen} onOpenChange={setTestRunOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="size-4 text-primary" />
                Résultat du test
              </DialogTitle>
            </DialogHeader>
            {testRunResult && (
              <div className="flex flex-col gap-4 text-sm">
                {/* Trigger */}
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Déclencheur
                  </p>
                  <div className="rounded-lg border bg-muted/30 px-3 py-2">
                    <p className="font-medium">
                      {(testRunResult.trigger as { type?: string } | null)?.type ?? '—'}
                    </p>
                    <pre className="mt-1 max-h-32 overflow-auto text-xs text-muted-foreground">
                      {JSON.stringify(
                        (testRunResult.trigger as { mockData?: unknown } | null)?.mockData,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
                {/* Steps */}
                {testRunResult.steps.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Étapes ({testRunResult.steps.length})
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {testRunResult.steps.map((step, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2"
                        >
                          {step.status === 'error' ? (
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                          ) : step.status === 'skipped' ? (
                            <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{step.type}</span>
                            {step.status === 'error' && (
                              <span className="ml-2 text-xs text-destructive">Erreur</span>
                            )}
                            <p className="text-xs text-muted-foreground">{step.note}</p>
                            {step.output && Object.keys(step.output).length > 0 && (
                              <pre className="mt-1 max-h-24 overflow-auto rounded bg-muted p-1.5 text-[10px] leading-tight">
                                {JSON.stringify(step.output, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Ceci est une simulation — aucune donnée réelle n&apos;a été modifiée.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* AI Generate dialog */}
        <Dialog open={aiGenerateOpen} onOpenChange={setAiGenerateOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-violet-500" />
                Générer une automatisation avec IA
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <p className="text-sm text-muted-foreground">
                Décrivez en langage naturel ce que vous souhaitez automatiser. L&apos;IA générera la
                configuration du workflow.
              </p>
              <Textarea
                placeholder="Ex: Envoyer un email à mon équipe chaque lundi matin avec un résumé des nouvelles entrées de la semaine dernière."
                rows={4}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="resize-none text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setAiGenerateOpen(false)}>
                  Annuler
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={aiGenerating || aiPrompt.trim().length < 10}
                  onClick={() => doAiGenerate(aiPrompt.trim())}
                >
                  <Sparkles className="size-3.5" />
                  {aiGenerating ? 'Génération…' : 'Générer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

WorkFlowPanel.displayName = 'WorkFlowPanel';

export { WorkFlowPanel };
