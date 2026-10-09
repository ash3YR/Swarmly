/**
 * @file RouterNode.tsx
 * @description Custom ReactFlow node for Router nodes in Navy / Slate / Warm Stone aesthetic.
 */
import React from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { GitBranch, AlertCircle } from 'lucide-react';
import { NodeData } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';

const ACCENT = '#D4A373';

export function RouterNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const { validationErrors } = useGraphStore();
  const errors = validationErrors.filter((e) => e.node_id === id);
  const hasError = errors.some((e) => e.severity === 'error');
  const hasWarning = errors.some((e) => e.severity === 'warning');

  const condCount = data.conditions?.length ?? 0;

  const borderColor = hasError
    ? '#C97878'
    : selected
    ? ACCENT
    : '#2A3947';

  return (
    <div
      style={{
        minWidth: 160,
        background: '#111A24',
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${hasError ? '#C97878' : ACCENT}`,
        borderRadius: 6,
        padding: '8px 12px 8px 10px',
        cursor: 'pointer',
        boxShadow: hasError
          ? '0 0 0 1px #C97878, 0 4px 16px rgba(201,120,120,0.15)'
          : selected
          ? '0 0 0 1px #D4A373, 0 4px 16px rgba(212,163,115,0.15)'
          : '0 2px 8px rgba(0,0,0,0.5)',
        transition: 'border-color 0.12s, box-shadow 0.12s',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ top: -4 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <GitBranch size={11} style={{ color: ACCENT, flexShrink: 0 }} />
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: ACCENT,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono), monospace',
              }}
            >
              ROUTER
            </span>
          </div>

          {hasError ? (
            <span title={errors.map((e) => e.message).join('\n')}>
              <AlertCircle size={11} style={{ color: '#C97878' }} />
            </span>
          ) : hasWarning ? (
            <span title={errors.map((e) => e.message).join('\n')}>
              <AlertCircle size={11} style={{ color: '#D4A373' }} />
            </span>
          ) : null}
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#E7EBEF',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.label || 'Router'}
        </div>

        <div style={{ marginTop: 2 }}>
          <span
            style={{
              fontSize: 9.5,
              color: condCount === 0 ? '#C97878' : '#8B98A5',
              background: '#182330',
              border: `1px solid ${condCount === 0 ? '#C97878' : '#1E2A36'}`,
              padding: '1px 5px',
              borderRadius: 3,
              fontFamily: 'var(--font-mono), monospace',
            }}
          >
            {condCount === 0 ? 'no branches' : `${condCount} branch${condCount !== 1 ? 'es' : ''}`}
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ bottom: -4 }} />
    </div>
  );
}
