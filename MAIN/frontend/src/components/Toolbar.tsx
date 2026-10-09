'use client';
/**
 * @file Toolbar.tsx
 * @description Floating top toolbar with click-to-add, workspace projects, manual save, templates, validation, and user menu.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Brain,
  Wrench,
  GitBranch,
  Code2,
  Loader2,
  Plus,
  LayoutTemplate,
  Sliders,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Folder,
  Save,
  Check,
} from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { NodeType, GenerateRequest } from '@/types/graph';
import { generateCode, ValidationError } from '@/lib/api';
import { createDefaultNode } from '@/lib/nodeFactory';
import { useReactFlow } from '@xyflow/react';
import { toast } from '@/store/toastStore';
import { UserMenu } from '@/components/UserMenu';

/* ── Node tool definitions ─────────────────────────────────────────────────── */
const NODE_TOOLS: {
  type: NodeType;
  icon: React.ElementType;
  label: string;
  color: string;
  description: string;
}[] = [
  {
    type: 'llm_agent',
    icon: Brain,
    label: 'LLM Agent',
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

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        background: 'var(--border)',
        flexShrink: 0,
        margin: '0 4px',
      }}
    />
  );
}

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
      title={`Drag to add ${description}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 8px',
        borderRadius: 8,
        cursor: dragging ? 'grabbing' : 'grab',
        background: hovered ? 'var(--panel-hover)' : 'transparent',
        transition: 'background 0.12s ease',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        opacity: dragging ? 0.5 : 1,
      }}
    >
      <Icon size={13} style={{ color, flexShrink: 0 }} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: hovered ? 'var(--text-primary)' : 'var(--text-muted)',
          letterSpacing: '0.01em',
          transition: 'color 0.12s',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function Toolbar() {
  const {
    nodes,
    edges,
    agentName,
    isGenerating,
    setIsGenerating,
    setGeneratedCode,
    setIsCodeModalOpen,
    isInspectorOpen,
    setIsInspectorOpen,
    setIsTemplateModalOpen,
    validationErrors,
    isValidating,
    addNode,
    selectNode,
  } = useGraphStore();

  const {
    activeProject,
    activeWorkflow,
    setIsWorkspaceModalOpen,
    manualSaveWorkflow,
    isSaving,
    saveStatus,
  } = useWorkspaceStore();

  const { screenToFlowPosition } = useReactFlow();

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [genHovered, setGenHovered] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close Add Menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node as unknown as globalThis.Node)) {
        setAddMenuOpen(false);
      }
    };
    if (addMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addMenuOpen]);

  const handleQuickAdd = (type: NodeType) => {
    setAddMenuOpen(false);

    const offset = (nodes.length % 5) * 35;
    const pos = typeof window !== 'undefined'
      ? screenToFlowPosition({
          x: window.innerWidth / 2 - 100 + offset,
          y: window.innerHeight / 2 - 80 + offset,
        })
      : { x: 300 + offset, y: 250 + offset };

    const newNode = createDefaultNode(type, pos);
    addNode(newNode);
    toast.info(`Added ${newNode.data.label}`, 'Configuring node in inspector.');
  };

  const errorCount = validationErrors.filter((e) => e.severity === 'error').length;
  const warningCount = validationErrors.filter((e) => e.severity === 'warning').length;
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
      toast.success('Python code generated', `Compiled ${res.node_count} nodes into runnable LangGraph Python.`);
    } catch (err) {
      if (err instanceof ValidationError) {
        const errorList = err.errors
          .filter((e) => e.severity === 'error')
          .map((e) => `• ${e.message}`)
          .join('\n');

        toast.error('Workflow validation failed', errorList);

        setIsInspectorOpen(true);
        const firstErrorNode = err.errors.find((e) => e.node_id);
        if (firstErrorNode?.node_id) {
          selectNode(firstErrorNode.node_id);
        }
      } else {
        toast.error(
          'Generation failed',
          'Could not contact compilation service. Ensure FastAPI backend is running on port 8000.'
        );
      }
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
        height: 48,
        padding: '0 8px',
        background: 'var(--panel-bg)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4)',
        gap: 2,
        maxWidth: 'calc(100vw - 360px)',
        overflowX: 'auto',
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '0 6px 0 4px',
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
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>S</span>
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.3px',
            whiteSpace: 'nowrap',
          }}
        >
          Swarmly
        </span>
      </div>

      <Divider />

      {/* ── Workspace & Projects Button ────────────────────────────────────── */}
      <button
        onClick={() => setIsWorkspaceModalOpen(true)}
        title="Open workspace projects and workflows"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 9px',
          borderRadius: 8,
          background: 'transparent',
          border: 'none',
          color: activeProject ? '#e4e4e7' : 'var(--text-muted)',
          fontSize: 11.5,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.12s, color 0.12s',
          fontFamily: 'inherit',
          maxWidth: 160,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--panel-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <Folder size={13} className={activeProject ? 'text-[#8b88f8]' : 'text-zinc-400'} />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activeProject
            ? `${activeProject.name}${activeWorkflow ? ` / ${activeWorkflow.name}` : ''}`
            : 'Workspace'}
        </span>
        <ChevronDown size={11} className="text-zinc-400 shrink-0" />
      </button>

      {/* ── Manual Save Button ────────────────────────────────────────────── */}
      <button
        onClick={() => manualSaveWorkflow()}
        disabled={isSaving}
        title="Manually save current workflow to Supabase database"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 9px',
          borderRadius: 7,
          background: saveStatus === 'saved' ? 'rgba(62, 207, 142, 0.12)' : 'transparent',
          border: `1px solid ${saveStatus === 'saved' ? 'rgba(62, 207, 142, 0.3)' : 'transparent'}`,
          color: saveStatus === 'saved' ? '#3ecf8e' : 'var(--text-muted)',
          fontSize: 11,
          fontWeight: 600,
          cursor: isSaving ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          if (saveStatus !== 'saved') {
            e.currentTarget.style.background = 'var(--panel-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (saveStatus !== 'saved') {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }
        }}
      >
        {isSaving ? (
          <Loader2 size={12} className="animate-spin text-zinc-400" />
        ) : saveStatus === 'saved' ? (
          <Check size={12} className="text-emerald-400" />
        ) : (
          <Save size={12} />
        )}
        <span>{isSaving ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}</span>
      </button>

      <Divider />

      {/* ── + Add Node Dropdown ────────────────────────────────────────────── */}
      <div ref={addMenuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 9px',
            borderRadius: 8,
            background: addMenuOpen ? 'var(--panel-hover)' : 'transparent',
            border: 'none',
            color: '#c4b5fd',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.12s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-hover)')}
          onMouseLeave={(e) => {
            if (!addMenuOpen) e.currentTarget.style.background = 'transparent';
          }}
        >
          <Plus size={13} className="text-[#8b88f8]" />
          <span>Add Node</span>
          <ChevronDown size={11} className="text-zinc-400" />
        </button>

        {addMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: 170,
              background: '#202028',
              border: '1px solid #363644',
              borderRadius: 10,
              boxShadow: '0 12px 36px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)',
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              zIndex: 110,
            }}
          >
            <button
              onClick={() => handleQuickAdd('llm_agent')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2c2c38')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Brain size={14} className="text-[#7c6af7]" />
              <span>LLM Agent</span>
            </button>

            <button
              onClick={() => handleQuickAdd('tool')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2c2c38')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Wrench size={14} className="text-[#3ecf8e]" />
              <span>Tool</span>
            </button>

            <button
              onClick={() => handleQuickAdd('router')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2c2c38')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <GitBranch size={14} className="text-[#f59e0b]" />
              <span>Router</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Draggable tool shortcuts ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {NODE_TOOLS.map((tool) => (
          <ToolButton key={tool.type} {...tool} />
        ))}
      </div>

      <Divider />

      {/* ── Templates button ──────────────────────────────────────────────── */}
      <button
        onClick={() => setIsTemplateModalOpen(true)}
        title="Choose a starter workflow template"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 8px',
          borderRadius: 8,
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: 11,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.12s, color 0.12s',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--panel-hover)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-muted)';
        }}
      >
        <LayoutTemplate size={13} className="text-amber-400" />
        <span>Templates</span>
      </button>

      <Divider />

      {/* ── Validation Status Pill ────────────────────────────────────────── */}
      <button
        onClick={() => setIsInspectorOpen(true)}
        title={
          errorCount > 0
            ? `${errorCount} validation errors. Click to open Inspector.`
            : warningCount > 0
            ? `${warningCount} warnings. Click to open Inspector.`
            : 'Workflow topology is valid.'
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 7px',
          borderRadius: 7,
          background:
            errorCount > 0
              ? 'rgba(239, 68, 68, 0.15)'
              : warningCount > 0
              ? 'rgba(245, 158, 11, 0.15)'
              : 'rgba(62, 207, 142, 0.12)',
          border: `1px solid ${
            errorCount > 0
              ? 'rgba(239, 68, 68, 0.35)'
              : warningCount > 0
              ? 'rgba(245, 158, 11, 0.35)'
              : 'rgba(62, 207, 142, 0.25)'
          }`,
          color:
            errorCount > 0
              ? '#fca5a5'
              : warningCount > 0
              ? '#fde68a'
              : '#86efac',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.12s',
          whiteSpace: 'nowrap',
        }}
      >
        {isValidating ? (
          <Loader2 size={11} className="animate-spin text-zinc-400" />
        ) : errorCount > 0 ? (
          <AlertCircle size={11} className="text-red-400" />
        ) : warningCount > 0 ? (
          <AlertCircle size={11} className="text-amber-400" />
        ) : (
          <CheckCircle2 size={11} className="text-emerald-400" />
        )}
        <span>
          {isValidating
            ? 'Validating…'
            : errorCount > 0
            ? `${errorCount} error${errorCount > 1 ? 's' : ''}`
            : warningCount > 0
            ? `${warningCount} warn`
            : nodes.length === 0
            ? 'Ready'
            : 'Valid'}
        </span>
      </button>

      {/* ── Toggle Inspector button ───────────────────────────────────────── */}
      <button
        onClick={() => setIsInspectorOpen(!isInspectorOpen)}
        title={isInspectorOpen ? 'Hide Inspector' : 'Show Inspector'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 7,
          background: isInspectorOpen ? 'var(--panel-active)' : 'transparent',
          border: 'none',
          color: isInspectorOpen ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'background 0.12s, color 0.12s',
        }}
        onMouseEnter={(e) => {
          if (!isInspectorOpen) e.currentTarget.style.background = 'var(--panel-hover)';
        }}
        onMouseLeave={(e) => {
          if (!isInspectorOpen) e.currentTarget.style.background = 'transparent';
        }}
      >
        <Sliders size={13} />
      </button>

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
          gap: 5,
          padding: '5px 12px',
          background: canGenerate
            ? genHovered
              ? 'var(--accent-hover)'
              : 'var(--accent)'
            : 'var(--panel-hover)',
          border: 'none',
          borderRadius: 8,
          color: canGenerate ? '#fff' : 'var(--text-faint)',
          fontSize: 11.5,
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
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Code2 size={12} />
        )}
        {isGenerating ? 'Generating…' : 'Generate'}
      </button>

      <Divider />

      {/* ── Google Auth / User Menu ───────────────────────────────────────── */}
      <UserMenu />
    </div>
  );
}
