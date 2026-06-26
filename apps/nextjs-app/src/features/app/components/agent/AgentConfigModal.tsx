import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@teable/ui-lib/shadcn/ui/sheet';
import React, { useState } from 'react';
import { InstructionsTab } from './tabs/InstructionsTab';
import { KnowledgeTab } from './tabs/KnowledgeTab';
import { MemoryTab } from './tabs/MemoryTab';
import { SkillsTab } from './tabs/SkillsTab';
import { TasksTab } from './tabs/TasksTab';
import { TriggersTab } from './tabs/TriggersTab';

interface AgentRecord {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface AgentConfigModalProps {
  agent: AgentRecord;
  spaceId?: string;
  onClose: () => void;
  onUpdated: (agent: AgentRecord) => void;
}

const TABS = [
  { id: 'instructions', label: 'Instructions' },
  { id: 'tasks', label: 'Travaux' },
  { id: 'skills', label: 'Compétences' },
  { id: 'triggers', label: 'Déclencheurs' },
  { id: 'knowledge', label: 'Connaissance' },
  { id: 'memory', label: 'Mémoire' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export const AgentConfigModal: React.FC<AgentConfigModalProps> = ({
  agent,
  spaceId,
  onClose,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('instructions');

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-[480px] flex-col p-0">
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
{agent.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <SheetTitle className="text-sm font-semibold">{agent.name}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex shrink-0 gap-0 overflow-x-auto border-b">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {activeTab === 'instructions' && <InstructionsTab agent={agent} onUpdated={onUpdated} />}
          {activeTab === 'tasks' && <TasksTab agent={agent} />}
          {activeTab === 'skills' && <SkillsTab agent={agent} onUpdated={onUpdated} />}
          {activeTab === 'triggers' && <TriggersTab agent={agent} />}
          {activeTab === 'knowledge' && (
            <KnowledgeTab agent={agent} spaceId={spaceId} onUpdated={onUpdated as never} />
          )}
          {activeTab === 'memory' && <MemoryTab agent={agent} />}
        </div>
      </SheetContent>
    </Sheet>
  );
};
