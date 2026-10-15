/**
 * @file AgentNode.tsx
 * @description Custom ReactFlow node for LLM Agent nodes in Navy / Slate / Warm Stone aesthetic.
 */
import React from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { Brain, AlertCircle } from 'lucide-react';
import { NodeData } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';

const ACCENT = '#8FA8BB';

export function AgentNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const { validationErrors } = useGraphStore();
  const errors = validationErrors.filter((e) => e.node_id === id);
  const hasError = errors.some((e) => e.severity === 'error');
  const hasWarning = errors.some((e) => e.severity === 'warning');

  const borderColor = hasError
    ? '#C97878'
    : selected
    ? ACCENT
    : '#2A3947';

  return (
    <div
      style={{
        minWidth: 170,
        background: '#111A24',
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${hasError ? '#C97878' : ACCENT}`,
        borderRadius: 6,
        padding: '8px 12px 8px 10px',
        cursor: 'pointer',
        boxShadow: hasError
          ? '0 0 0 1px #C97878, 0 4px 16px rgba(201,120,120,0.15)'
          : selected
          ? '0 0 0 1px #8FA8BB, 0 4px 16px rgba(143,168,187,0.15)'
          : '0 2px 8px rgba(0,0,0,0.5)',
        transition: 'border-color 0.12s, box-shadow 0.12s',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ top: -4 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Type header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Brain size={11} style={{ color: ACCENT, flexShrink: 0 }} />
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
              LLM AGENT
            </span>
          </div>

          {/* Validation badge */}
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

        {/* Node Label */}
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
          {data.label || 'Agent'}
        </div>

        {/* Model Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <span
            style={{
              fontSize: 9.5,
              color: '#8B98A5',
              background: '#182330',
              border: '1px solid #1E2A36',
              padding: '1px 5px',
              borderRadius: 3,
              fontFamily: 'var(--font-mono), monospace',
            }}
          >
            {data.model || 'gpt-4o'}
          </span>
          {Array.isArray(data.tools) && data.tools.length > 0 && (
            <span style={{ fontSize: 9.5, color: '#5B6A78' }}>
              +{data.tools.length} tool{data.tools.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ bottom: -4 }} />
    </div>
  );
}
