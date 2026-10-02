/**
 * @file RouterNode.tsx
 * @description Custom ReactFlow node for Router (conditional branching) nodes.
 *
 * Design: left-border accent in amber. Shows condition count badge.
 */
import React from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { NodeData } from '@/types/graph';

const ACCENT = '#f59e0b';

export function RouterNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const condCount = data.conditions?.length ?? 0;

  return (
    <div
      style={{
        minWidth: 150,
        background: '#221f14',
        border: `1px solid ${selected ? ACCENT : '#332e1a'}`,
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: 9,
        padding: '9px 13px 9px 11px',
        cursor: 'pointer',
        boxShadow: selected
          ? `0 0 0 2px ${ACCENT}30, 0 4px 20px rgba(245,158,11,0.15)`
          : '0 2px 12px rgba(0,0,0,0.4)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ top: -5 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <GitBranch size={11} style={{ color: ACCENT, flexShrink: 0 }} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: ACCENT,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Router
          </span>
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7', lineHeight: 1.3 }}>
          {data.label}
        </div>

        <span
          style={{
            fontSize: 10,
            color: '#71717a',
            alignSelf: 'flex-start',
          }}
        >
          {condCount === 0 ? 'No conditions' : `${condCount} condition${condCount !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Router has one source per branch — use default bottom handle */}
      <Handle type="source" position={Position.Bottom} style={{ bottom: -5 }} />
    </div>
  );
}
