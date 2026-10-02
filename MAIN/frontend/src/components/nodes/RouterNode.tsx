/**
 * @file RouterNode.tsx
 * @description Custom ReactFlow node for Routers
 */
import React from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { NodeData } from '@/types/graph';
import { cn } from '@/lib/utils';

export function RouterNode({ data, selected }: NodeProps<Node<NodeData>>) {
  return (
    <div className={cn(
      "min-w-[160px] rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 cursor-pointer",
      selected && "ring-2 ring-amber-500"
    )}>
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !border-amber-900 !w-2.5 !h-2.5" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-amber-400">
          <GitBranch size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">Router</span>
        </div>
        <div className="text-sm font-medium text-white">{data.label}</div>
        {data.conditions && data.conditions.length > 0 && (
          <div className="text-xs text-zinc-400">{data.conditions.length} condition(s)</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !border-amber-900 !w-2.5 !h-2.5" />
    </div>
  );
}
