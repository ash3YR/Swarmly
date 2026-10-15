'use client';
/**
 * @file CanvasStatusBar.tsx
 * @description Bottom status bar showing graph validation, topology counts, and zoom controls.
 */
import React from 'react';
import { CheckCircle2, AlertCircle, Maximize2, Loader2 } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { useReactFlow } from '@xyflow/react';

export function CanvasStatusBar() {
  const { nodes, edges, validationErrors, isValidating, setIsInspectorOpen } = useGraphStore();
  const { fitView } = useReactFlow();

  const errors = validationErrors.filter((e) => e.severity === 'error');
  const warnings = validationErrors.filter((e) => e.severity === 'warning');

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  return (
    <footer
      style={{
        height: 26,
        background: '#111A24',
        borderTop: '1px solid #2A3947',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: 11,
        fontFamily: 'var(--font-mono), monospace',
        color: '#8B98A5',
        userSelect: 'none',
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* ── Left: Validation Status ─────────────────────────────────────────── */}
      <button
        onClick={() => setIsInspectorOpen(true)}
        title="Click to view validation details in Inspector"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: 'none',
          color: isValidating
            ? '#8FA8BB'
            : hasErrors
            ? '#C97878'
            : hasWarnings
            ? '#D4A373'
            : '#7FAF9A',
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: 3,
          fontFamily: 'inherit',
          fontSize: 11,
        }}
      >
        {isValidating ? (
          <Loader2 size={11} className="animate-spin text-[#8FA8BB]" />
        ) : hasErrors ? (
          <AlertCircle size={11} style={{ color: '#C97878' }} />
        ) : hasWarnings ? (
          <AlertCircle size={11} style={{ color: '#D4A373' }} />
        ) : (
          <CheckCircle2 size={11} style={{ color: '#7FAF9A' }} />
        )}

        <span>
          {isValidating
            ? 'Validating…'
            : hasErrors
            ? `${errors.length} validation error${errors.length > 1 ? 's' : ''}`
            : hasWarnings
            ? `${warnings.length} warning${warnings.length > 1 ? 's' : ''}`
            : nodes.length === 0
            ? 'Canvas ready'
            : `Graph valid • ${nodes.length} node${nodes.length !== 1 ? 's' : ''} • ${edges.length} edge${edges.length !== 1 ? 's' : ''}`}
        </span>
      </button>

      {/* ── Right: Fit View & LangGraph Runtime indicator ────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#5B6A78', fontSize: 10 }}>
          LangGraph Python 3.11+
        </span>

        <button
          onClick={() => fitView({ padding: 0.2, duration: 200 })}
          title="Fit graph to viewport"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            color: '#8B98A5',
            cursor: 'pointer',
            padding: '2px 4px',
            fontSize: 10.5,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#DDD7CC')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#8B98A5')}
        >
          <Maximize2 size={10} />
          <span>Fit</span>
        </button>
      </div>
    </footer>
  );
}
