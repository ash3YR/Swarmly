'use client';
/**
 * @file ConfigPanel.tsx
 * @description Slide-in panel for editing selected node properties
 */
import React from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { LLMProvider, ToolName, RouterCondition } from '@/types/graph';
import { cn } from '@/lib/utils';

export function ConfigPanel() {
  const { nodes, selectedNodeId, selectNode, updateNodeData } = useGraphStore();

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const isOpen = !!selectedNode;

  if (!isOpen || !selectedNode) {
    return (
      <div className={cn(
        "fixed right-0 top-[56px] bottom-0 w-80 bg-zinc-900 border-l border-zinc-800 p-4 overflow-y-auto z-10 transition-transform duration-200 ease-in-out",
        "translate-x-full"
      )} />
    );
  }

  const { data } = selectedNode;
  
  const updateData = (updates: any) => {
    updateNodeData(selectedNode.id, updates);
  };

  return (
    <div className={cn(
      "fixed right-0 top-[56px] bottom-0 w-80 bg-zinc-900 border-l border-zinc-800 p-4 overflow-y-auto z-10 transition-transform duration-200 ease-in-out",
      "translate-x-0"
    )}>
      <div className="flex items-center justify-between mb-6">
        <input
          type="text"
          value={data.label}
          onChange={(e) => updateData({ label: e.target.value })}
          className="bg-transparent text-lg font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1 w-full"
        />
        <button 
          onClick={() => selectNode(null)}
          className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-5">
        {data.nodeType === 'llm_agent' && (
          <>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300">Provider</label>
              <select 
                value={data.provider || ''} 
                onChange={(e) => updateData({ provider: e.target.value as LLMProvider })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="" disabled>Select a provider</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300">Model</label>
              <input 
                type="text" 
                value={data.model || ''}
                onChange={(e) => updateData({ model: e.target.value })}
                placeholder={data.provider === 'openai' ? 'gpt-4o' : data.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'Model name'}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300">API Key</label>
              <input 
                type="password" 
                value={data.apiKey || ''}
                onChange={(e) => updateData({ apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300">System Prompt</label>
              <textarea 
                value={data.systemPrompt || ''}
                onChange={(e) => updateData({ systemPrompt: e.target.value })}
                rows={4}
                placeholder="You are a helpful assistant..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300">Temperature</label>
              <input 
                type="number" 
                min="0" max="1" step="0.1"
                value={data.temperature !== undefined ? data.temperature : 0.7}
                onChange={(e) => updateData({ temperature: parseFloat(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {data.nodeType === 'tool' && (
          <>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300">Tool</label>
              <select 
                value={data.toolName || ''} 
                onChange={(e) => updateData({ toolName: e.target.value as ToolName })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="" disabled>Select a tool</option>
                <option value="tavily_search">Tavily Search</option>
                <option value="wikipedia">Wikipedia</option>
                <option value="calculator">Calculator</option>
                <option value="python_repl">Python REPL</option>
              </select>
            </div>
            
            {data.toolName === 'tavily_search' && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-300">Tavily API Key</label>
                <input 
                  type="password" 
                  value={data.toolApiKey || ''}
                  onChange={(e) => updateData({ toolApiKey: e.target.value })}
                  placeholder="tvly-..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </>
        )}

        {data.nodeType === 'router' && (
          <>
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300">Conditions</label>
              {(data.conditions || []).map((cond: RouterCondition, idx: number) => (
                <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-md space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500 font-semibold">Condition {idx + 1}</span>
                    <button 
                      onClick={() => {
                        const newConds = [...(data.conditions || [])];
                        newConds.splice(idx, 1);
                        updateData({ conditions: newConds });
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={cond.keyword}
                    onChange={(e) => {
                      const newConds = [...(data.conditions || [])];
                      newConds[idx] = { ...newConds[idx], keyword: e.target.value };
                      updateData({ conditions: newConds });
                    }}
                    placeholder="If message contains..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <select
                    value={cond.targetNodeId}
                    onChange={(e) => {
                      const newConds = [...(data.conditions || [])];
                      newConds[idx] = { ...newConds[idx], targetNodeId: e.target.value };
                      updateData({ conditions: newConds });
                    }}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="" disabled>Select target node</option>
                    {nodes.filter(n => n.id !== selectedNode.id).map(n => (
                      <option key={n.id} value={n.id}>{n.data.label}</option>
                    ))}
                  </select>
                </div>
              ))}
              
              <button 
                onClick={() => {
                  const newConds = [...(data.conditions || []), { keyword: '', targetNodeId: '' }];
                  updateData({ conditions: newConds });
                }}
                className="w-full flex items-center justify-center gap-2 p-2 border border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 rounded-md text-sm transition-colors"
              >
                <Plus size={16} /> Add Condition
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
