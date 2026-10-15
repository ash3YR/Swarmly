/**
 * @file ToolNode.tsx
 * @description Custom ReactFlow node for Tool nodes in Navy / Slate / Stone aesthetic.
 */
import React from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { Wrench, AlertCircle } from 'lucide-react';
import { NodeData } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';

const ACCENT = '#7FAF9A';

const TOOL_LABELS: Record<string, string> = {
  tavily_search: 'Tavily Search',
  wikipedia: 'Wikipedia',
  calculator: 'Calculator',
  python_repl: 'Python REPL',
};

export function ToolNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const { validationErrors } = useGraphStore();
  const errors = validationErrors.filter((e) => e.node_id === id);
  const hasError = errors.some((e) => e.severity === 'error');
  const hasWarning = errors.some((e) => e.severity === 'warning');

  const isUnsupported = data.toolName === 'calculator' || data.toolName === 'python_repl';

  const borderColor = (hasError || isUnsupported)
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
        borderLeft: `3px solid ${hasError || isUnsupported ? '#C97878' : ACCENT}`,
        borderRadius: 6,
        padding: '8px 12px 8px 10px',
        cursor: 'pointer',
        boxShadow: hasError || isUnsupported
          ? '0 0 0 1px #C97878, 0 4px 16px rgba(201,120,120,0.15)'
          : selected
          ? '0 0 0 1px #7FAF9A, 0 4px 16px rgba(127,175,154,0.15)'
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
            <Wrench size={11} style={{ color: ACCENT, flexShrink: 0 }} />
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
              TOOL
            </span>
          </div>

          {hasError || isUnsupported ? (
            <span
              title={
                isUnsupported
                  ? `'${data.toolName}' is deprecated/unsupported in Phase 1.`
                  : errors.map((e) => e.message).join('\n')
              }
            >
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
          {data.label || TOOL_LABELS[data.toolName || ''] || 'Tool'}
        </div>

        <div style={{ marginTop: 2 }}>
          <span
            style={{
              fontSize: 9.5,
              color: isUnsupported ? '#C97878' : '#8B98A5',
              background: '#182330',
              border: `1px solid ${isUnsupported ? '#C97878' : '#1E2A36'}`,
              padding: '1px 5px',
              borderRadius: 3,
              fontFamily: 'var(--font-mono), monospace',
            }}
          >
            {data.toolName || 'unconfigured'}
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ bottom: -4 }} />
    </div>
  );
}
