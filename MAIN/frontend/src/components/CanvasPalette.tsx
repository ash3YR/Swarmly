'use client';
/**
 * @file CanvasPalette.tsx
 * @description Single source of truth editor palette floating above the canvas.
 */
import React from 'react';
import { Brain, Wrench, GitBranch, LayoutTemplate, Plus } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { createDefaultNode } from '@/lib/nodeFactory';
import { useReactFlow } from '@xyflow/react';

export function CanvasPalette() {
  const { addNode, setIsTemplateModalOpen } = useGraphStore();
  const { screenToFlowPosition } = useReactFlow();

  const handleAdd = (type: 'llm_agent' | 'tool' | 'router') => {
    // Spawn in visible center of viewport with slight jitter
    const jitter = Math.floor(Math.random() * 40) - 20;
    const centerPos = typeof window !== 'undefined'
      ? screenToFlowPosition({
          x: window.innerWidth / 2 + jitter - 100,
          y: window.innerHeight / 2 + jitter - 60,
        })
      : { x: 300, y: 200 };

    const node = createDefaultNode(type, centerPos);
    addNode(node);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        background: '#182330',
        border: '1px solid #2A3947',
        borderRadius: 6,
        padding: '3px 4px',
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        userSelect: 'none',
      }}
    >
      {/* + Agent */}
      <button
        onClick={() => handleAdd('llm_agent')}
        title="Add LLM Agent node"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 8px',
          background: 'transparent',
          border: 'none',
          borderRadius: 4,
          color: '#DDD7CC',
          fontSize: 11.5,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#263746')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Brain size={13} style={{ color: '#8FA8BB' }} />
        <span>+ Agent</span>
      </button>

      {/* + Tool */}
      <button
        onClick={() => handleAdd('tool')}
        title="Add Tool node"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 8px',
          background: 'transparent',
          border: 'none',
          borderRadius: 4,
          color: '#DDD7CC',
          fontSize: 11.5,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#263746')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Wrench size={12} style={{ color: '#7FAF9A' }} />
        <span>+ Tool</span>
      </button>

      {/* + Router */}
      <button
        onClick={() => handleAdd('router')}
        title="Add Router node"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 8px',
          background: 'transparent',
          border: 'none',
          borderRadius: 4,
          color: '#DDD7CC',
          fontSize: 11.5,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#263746')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <GitBranch size={13} style={{ color: '#D4A373' }} />
        <span>+ Router</span>
      </button>

      <div style={{ width: 1, height: 14, background: '#2A3947', margin: '0 2px' }} />

      {/* Templates */}
      <button
        onClick={() => setIsTemplateModalOpen(true)}
        title="Load starter architecture template"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 8px',
          background: 'transparent',
          border: 'none',
          borderRadius: 4,
          color: '#B8B1A6',
          fontSize: 11.5,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#263746')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <LayoutTemplate size={13} />
        <span>Templates</span>
      </button>
    </div>
  );
}
