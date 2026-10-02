/**
 * @file AgentNode.tsx
 * @description Custom ReactFlow node for LLM Agents
 */
import React from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { Brain } from 'lucide-react';
import { NodeData } from '@/types/graph';
import { cn } from '@/lib/utils';

export function AgentNode({ data, selected }: NodeProps<Node<NodeData>>) {
  return (
    <div className={cn(
      "min-w-[160px] rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 cursor-pointer",
      selected && "ring-2 ring-indigo-500"
    )}>
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !border-indigo-900 !w-2.5 !h-2.5" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-indigo-400">
          <Brain size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">LLM Agent</span>
        </div>
        <div className="text-sm font-medium text-white">{data.label}</div>
        {data.model && (
          <div className="text-xs text-zinc-400 truncate max-w-[140px]">{data.model}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !border-indigo-900 !w-2.5 !h-2.5" />
    </div>
  );
}
