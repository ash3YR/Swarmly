'use client';
/**
 * @file EmptyCanvasState.tsx
 * @description Minimal, architectural empty canvas state for developers.
 */
import React from 'react';
import { Layers, Brain, Sparkles, GitBranch, ArrowRight } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { STARTER_TEMPLATES } from '@/lib/templates';
import { createDefaultNode } from '@/lib/nodeFactory';
import { useReactFlow } from '@xyflow/react';

export function EmptyCanvasState() {
  const { nodes, addNode, loadTemplate, setNodes, setEdges } = useGraphStore();
  const { screenToFlowPosition } = useReactFlow();

  if (nodes.length > 0) return null;

  const handleStartBlank = () => {
    const centerPos = typeof window !== 'undefined'
      ? screenToFlowPosition({ x: window.innerWidth / 2 - 80, y: window.innerHeight / 2 - 50 })
      : { x: 300, y: 200 };

    const firstNode = createDefaultNode('llm_agent', centerPos, 'Research Agent');
    addNode(firstNode);
  };

  const handleSelectTemplate = (templateId: string) => {
    const tpl = STARTER_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      loadTemplate(tpl);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        pointerEvents: 'auto',
        maxWidth: 520,
        width: '90%',
      }}
    >
      <div
        style={{
          background: '#111A24',
          border: '1px solid #2A3947',
          borderRadius: 8,
          padding: '24px 28px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#8FA8BB',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono), monospace',
            marginBottom: 6,
          }}
        >
          BUILD A WORKFLOW
        </div>

        <p
          style={{
            fontSize: 12.5,
            color: '#8B98A5',
            margin: '0 0 20px',
            lineHeight: 1.5,
            maxWidth: 380,
          }}
        >
          Compose agents, tools, and conditional routing visually. Choose a starting architecture below:
        </p>

        {/* Starting Architecture Options Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
          {/* Blank */}
          <button
            onClick={handleStartBlank}
            style={{
              padding: '10px 12px',
              background: '#182330',
              border: '1px solid #2A3947',
              borderRadius: 6,
              color: '#E7EBEF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              textAlign: 'left',
              transition: 'background 0.12s, border-color 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#223244';
              e.currentTarget.style.borderColor = '#344555';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#182330';
              e.currentTarget.style.borderColor = '#2A3947';
            }}
          >
            <Layers size={14} style={{ color: '#8FA8BB', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600 }}>Blank Workflow</div>
              <div style={{ fontSize: 10, color: '#8B98A5' }}>Add nodes manually</div>
            </div>
          </button>

          {/* Research Agent */}
          <button
            onClick={() => handleSelectTemplate('research_agent')}
            style={{
              padding: '10px 12px',
              background: '#182330',
              border: '1px solid #2A3947',
              borderRadius: 6,
              color: '#E7EBEF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              textAlign: 'left',
              transition: 'background 0.12s, border-color 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#223244';
              e.currentTarget.style.borderColor = '#344555';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#182330';
              e.currentTarget.style.borderColor = '#2A3947';
            }}
          >
            <Brain size={14} style={{ color: '#7FAF9A', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600 }}>Research Agent</div>
              <div style={{ fontSize: 10, color: '#8B98A5' }}>Agent ⇄ Tavily Tool</div>
            </div>
          </button>

          {/* Research -> Writer */}
          <button
            onClick={() => handleSelectTemplate('research_to_writer')}
            style={{
              padding: '10px 12px',
              background: '#182330',
              border: '1px solid #2A3947',
              borderRadius: 6,
              color: '#E7EBEF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              textAlign: 'left',
              transition: 'background 0.12s, border-color 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#223244';
              e.currentTarget.style.borderColor = '#344555';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#182330';
              e.currentTarget.style.borderColor = '#2A3947';
            }}
          >
            <Sparkles size={14} style={{ color: '#B8B1A6', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600 }}>Two-Stage Pipeline</div>
              <div style={{ fontSize: 10, color: '#8B98A5' }}>Researcher → Writer</div>
            </div>
          </button>

          {/* Supervisor with Workers */}
          <button
            onClick={() => handleSelectTemplate('supervisor_workers')}
            style={{
              padding: '10px 12px',
              background: '#182330',
              border: '1px solid #2A3947',
              borderRadius: 6,
              color: '#E7EBEF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              textAlign: 'left',
              transition: 'background 0.12s, border-color 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#223244';
              e.currentTarget.style.borderColor = '#344555';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#182330';
              e.currentTarget.style.borderColor = '#2A3947';
            }}
          >
            <GitBranch size={14} style={{ color: '#D4A373', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600 }}>Supervisor Routing</div>
              <div style={{ fontSize: 10, color: '#8B98A5' }}>Router branches</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
