'use client';

import { useEffect, useState } from 'react';

interface Memory {
  id: string;
  content: string;
  memoryType: string;
  createdTime: string;
}

interface Connection {
  provider: string;
  isConnected: boolean;
  isEnabled: boolean;
  scopes: string[];
}

interface ContextSidebarProps {
  agentId: string;
}

export function ContextSidebar({ agentId }: ContextSidebarProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [connections, setConnections] = useState<Record<string, Connection>>({});
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [agentId]);

  const fetchData = async () => {
    try {
      // Fetch memories
      const memRes = await fetch(`/api/agent/${agentId}/memories`);
      const memData = await memRes.json();
      setMemories(memData.slice(0, 10)); // Show top 10 memories

      // Fetch OAuth connections
      const connRes = await fetch(`/api/agent/${agentId}/oauth/status`);
      const connData = await connRes.json();
      setConnections(connData.providers);

      // Pre-select all memories
      setSelectedMemories(new Set(memData.map((m: Memory) => m.id)));
    } catch (error) {
      console.error('Failed to fetch context:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMemory = (id: string) => {
    const newSelected = new Set(selectedMemories);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMemories(newSelected);
  };

  return (
    <div className="w-64 border-l border-slate-200 bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-900 text-sm">Context</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* OAuth Connections */}
        <section>
          <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">
            Connected Services
          </h3>
          <div className="space-y-2">
            {Object.entries(connections).map(([provider, conn]) => (
              <div
                key={provider}
                className={`p-2 rounded-lg text-xs ${
                  conn.isConnected
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-slate-50 border border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="capitalize font-medium text-slate-900">{provider}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      conn.isConnected ? 'bg-green-500' : 'bg-slate-300'
                    }`}
                  />
                </div>
                {conn.isConnected && (
                  <p className="text-xs text-slate-600 mt-1">
                    {conn.scopes.slice(0, 2).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Memories */}
        <section>
          <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">
            Recent Memories ({selectedMemories.size})
          </h3>
          <div className="space-y-1">
            {loading ? (
              <p className="text-xs text-slate-500">Loading...</p>
            ) : memories.length > 0 ? (
              memories.map((memory) => (
                <label
                  key={memory.id}
                  className="flex items-start space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMemories.has(memory.id)}
                    onChange={() => toggleMemory(memory.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-900 truncate">
                      {memory.content.substring(0, 50)}...
                    </p>
                    <p className="text-xs text-slate-500">{memory.memoryType}</p>
                  </div>
                </label>
              ))
            ) : (
              <p className="text-xs text-slate-500">No memories yet</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
