/**
 * @file ToolNode.tsx
 * @description Custom ReactFlow node for Tool nodes.
 *
 * Design: same minimal left-border pattern as AgentNode, emerald accent.
 */
import React from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { Wrench } from 'lucide-react';
import { NodeData } from '@/types/graph';

const ACCENT = '#3ecf8e';

const TOOL_LABELS: Record<string, string> = {
  tavily_search: 'Tavily Search',
  wikipedia: 'Wikipedia',
  calculator: 'Calculator',
  python_repl: 'Python REPL',
};

export function ToolNode({ data, selected }: NodeProps<Node<NodeData>>) {
  return (
    <div
      style={{
        minWidth: 150,
        background: '#1e2622',
        border: `1px solid ${selected ? ACCENT : '#2a332e'}`,
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: 9,
        padding: '9px 13px 9px 11px',
        cursor: 'pointer',
        boxShadow: selected
          ? `0 0 0 2px ${ACCENT}30, 0 4px 20px rgba(62,207,142,0.15)`
          : '0 2px 12px rgba(0,0,0,0.4)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ top: -5 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Wrench size={11} style={{ color: ACCENT, flexShrink: 0 }} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: ACCENT,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Tool
          </span>
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7', lineHeight: 1.3 }}>
          {data.label}
        </div>

        {data.toolName && (
          <span
            style={{
              fontSize: 10,
              color: '#71717a',
              background: '#1a2e24',
              border: '1px solid #2a3e30',
              borderRadius: 4,
              padding: '1px 5px',
              alignSelf: 'flex-start',
            }}
          >
            {TOOL_LABELS[data.toolName] ?? data.toolName}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ bottom: -5 }} />
    </div>
  );
}
