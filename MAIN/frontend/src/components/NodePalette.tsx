'use client';
/**
 * @file NodePalette.tsx
 * @description Sidebar palette containing draggable node types
 */
import React from 'react';
import { Brain, Wrench, GitBranch } from 'lucide-react';
import { NodeType } from '@/types/graph';

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-[220px] bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col gap-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nodes</div>
      
      <div 
        className="flex flex-col gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg cursor-grab active:cursor-grabbing hover:border-indigo-500 transition-colors"
        draggable
        onDragStart={(e) => onDragStart(e, 'llm_agent')}
      >
        <div className="flex items-center gap-2 text-indigo-400">
          <Brain size={18} />
          <span className="text-sm font-medium">LLM Agent</span>
        </div>
        <div className="text-xs text-zinc-400">Connect to any LLM</div>
      </div>

      <div 
        className="flex flex-col gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg cursor-grab active:cursor-grabbing hover:border-emerald-500 transition-colors"
        draggable
        onDragStart={(e) => onDragStart(e, 'tool')}
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <Wrench size={18} />
          <span className="text-sm font-medium">Tool</span>
        </div>
        <div className="text-xs text-zinc-400">Run tools & APIs</div>
      </div>

      <div 
        className="flex flex-col gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg cursor-grab active:cursor-grabbing hover:border-amber-500 transition-colors"
        draggable
        onDragStart={(e) => onDragStart(e, 'router')}
      >
        <div className="flex items-center gap-2 text-amber-400">
          <GitBranch size={18} />
          <span className="text-sm font-medium">Router</span>
        </div>
        <div className="text-xs text-zinc-400">Conditional branching</div>
      </div>
    </div>
  );
}
