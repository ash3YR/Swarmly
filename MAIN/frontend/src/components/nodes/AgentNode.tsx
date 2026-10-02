/**
 * @file AgentNode.tsx
 * @description Custom ReactFlow node for LLM Agent nodes.
 *
 * Design: minimal card with a colored left-border accent.
 * Selected state uses a subtle ring + glow, not a heavy border.
 */
import React from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { Brain } from 'lucide-react';
import { NodeData } from '@/types/graph';

const ACCENT = '#7c6af7';

export function AgentNode({ data, selected }: NodeProps<Node<NodeData>>) {
  return (
    <div
      style={{
        minWidth: 150,
        background: '#222228',
        border: `1px solid ${selected ? ACCENT : '#2e2e38'}`,
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: 9,
        padding: '9px 13px 9px 11px',
        cursor: 'pointer',
        boxShadow: selected
          ? `0 0 0 2px ${ACCENT}30, 0 4px 20px rgba(124,106,247,0.2)`
          : '0 2px 12px rgba(0,0,0,0.4)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: -5 }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Type badge row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Brain size={11} style={{ color: ACCENT, flexShrink: 0 }} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: ACCENT,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            LLM Agent
          </span>
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#e4e4e7',
            lineHeight: 1.3,
          }}
        >
          {data.label}
        </div>

        {/* Meta info */}
        {(data.model || data.provider) && (
          <div
            style={{
              fontSize: 10,
              color: '#71717a',
              display: 'flex',
              gap: 4,
              alignItems: 'center',
            }}
          >
            {data.provider && (
              <span
                style={{
                  background: '#2a2a32',
                  border: '1px solid #363636',
                  borderRadius: 4,
                  padding: '1px 5px',
                }}
              >
                {data.provider}
              </span>
            )}
            {data.model && (
              <span style={{ color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
                {data.model}
              </span>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ bottom: -5 }}
      />
    </div>
  );
}
