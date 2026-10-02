'use client';
/**
 * @file Toolbar.tsx
 * @description Excalidraw-style floating top-center toolbar.
 *
 * Design: a single floating pill anchored at the top-center of the viewport.
 * Contains the app logo, draggable node-type tools, and the Generate button.
 * No full-width header bar — canvas fills the entire screen.
 *
 * Node tools are draggable: grab them and drop onto the canvas.
 */
import React, { useState } from 'react';
import { Brain, Wrench, GitBranch, Code2, Loader2, ChevronDown } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { NodeType, GenerateRequest } from '@/types/graph';
import { generateCode } from '@/lib/api';

/* ── Node tool definitions ─────────────────────────────────────────────────── */
const NODE_TOOLS: { type: NodeType; icon: React.ElementType; label: string; color: string; description: string }[] = [
  {
    type: 'llm_agent',
    icon: Brain,
    label: 'LLM',
    color: '#7c6af7',
    description: 'Language model agent',
  },
  {
    type: 'tool',
    icon: Wrench,
    label: 'Tool',
    color: '#3ecf8e',
    description: 'External tool or API',
  },
  {
    type: 'router',
    icon: GitBranch,
    label: 'Router',
    color: '#f59e0b',
    description: 'Conditional branching',
  },
];

/* ── Divider ───────────────────────────────────────────────────────────────── */
function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        background: 'var(--border)',
        flexShrink: 0,
        margin: '0 2px',
      }}
    />
  );
}

/* ── Single draggable tool button ──────────────────────────────────────────── */
function ToolButton({
  type,
  icon: Icon,
  label,
  color,
  description,
}: {
  type: NodeType;
  icon: React.ElementType;
  label: string;
  color: string;
  description: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/reactflow-type', type);
    e.dataTransfer.effectAllowed = 'move';
    setDragging(true);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => setDragging(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={description}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: '5px 13px',
        borderRadius: 8,
        cursor: dragging ? 'grabbing' : 'grab',
        background: hovered ? 'var(--panel-hover)' : 'transparent',
        transition: 'background 0.12s ease',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        opacity: dragging ? 0.5 : 1,
      }}
    >
      <Icon size={15} style={{ color, flexShrink: 0 }} />
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: hovered ? 'var(--text-primary)' : 'var(--text-muted)',
          letterSpacing: '0.02em',
          transition: 'color 0.12s',
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ── Main Toolbar ───────────────────────────────────────────────────────────── */
export function Toolbar() {
  const { nodes, edges, agentName, isGenerating, setIsGenerating, setGeneratedCode, setIsCodeModalOpen } =
    useGraphStore();

  const [genHovered, setGenHovered] = useState(false);
  const canGenerate = nodes.length > 0 && !isGenerating;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    try {
      const request: GenerateRequest = {
        agent_name: agentName || 'MyAgent',
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.nodeType,
          label: n.data.label,
          provider: n.data.provider,
          model: n.data.model,
          api_key: n.data.apiKey,
          system_prompt: n.data.systemPrompt,
          temperature: n.data.temperature,
          tool_name: n.data.toolName,
          tool_api_key: n.data.toolApiKey,
          conditions: n.data.conditions?.map((c) => ({
            keyword: c.keyword,
            target_node_id: c.targetNodeId,
          })),
        })),
        edges: edges.map((e) => ({
          source: e.source,
          target: e.target,
          label: e.label as string | undefined,
        })),
      };
      const res = await generateCode(request);
      setGeneratedCode(res.code);
      setIsCodeModalOpen(true);
    } catch {
      alert('Failed to generate code. Is the backend running on port 8000?');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="toolbar-enter"
      style={{
        position: 'fixed',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        height: 46,
        padding: '0 6px',
        background: 'var(--panel-bg)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.65), 0 1px 4px rgba(0,0,0,0.4)',
        gap: 0,
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px 0 6px',
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            background: 'linear-gradient(135deg, #6965db 0%, #8b88f8 100%)',
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(105,101,219,0.4)',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>S</span>
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.3px',
            whiteSpace: 'nowrap',
          }}
        >
          Swarmly
        </span>
      </div>

      <Divider />

      {/* ── Node tools ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {NODE_TOOLS.map((tool) => (
          <ToolButton key={tool.type} {...tool} />
        ))}
      </div>

      <Divider />

      {/* ── Agent name (compact inline input) ───────────────────────────── */}
      <input
        type="text"
        value={agentName}
        onChange={(e) => useGraphStore.setState({ agentName: e.target.value })}
        placeholder="Agent name"
        spellCheck={false}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-primary)',
          width: 120,
          padding: '0 10px',
          caretColor: 'var(--accent)',
          fontFamily: 'inherit',
        }}
        onFocus={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
      />

      <Divider />

      {/* ── Generate button ───────────────────────────────────────────────── */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        onMouseEnter={() => setGenHovered(true)}
        onMouseLeave={() => setGenHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          margin: '0 4px 0 2px',
          background: canGenerate
            ? genHovered
              ? 'var(--accent-hover)'
              : 'var(--accent)'
            : 'var(--panel-hover)',
          border: 'none',
          borderRadius: 8,
          color: canGenerate ? '#fff' : 'var(--text-faint)',
          fontSize: 12,
          fontWeight: 600,
          cursor: canGenerate ? 'pointer' : 'not-allowed',
          transition: 'background 0.15s ease, color 0.15s ease',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
          letterSpacing: '0.01em',
          boxShadow: canGenerate ? '0 2px 8px rgba(105,101,219,0.35)' : 'none',
        }}
      >
        {isGenerating ? (
          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Code2 size={13} />
        )}
        {isGenerating ? 'Generating…' : 'Generate'}
      </button>
    </div>
  );
}
