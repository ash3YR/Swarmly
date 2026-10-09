'use client';
/**
 * @file TopBar.tsx
 * @description IDE Top Bar with project/workflow breadcrumbs, save state, and primary compilation action.
 */
import React, { useState } from 'react';
import {
  Code2,
  Loader2,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Check,
} from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore';
import { generateCode } from '@/lib/api';
import { GenerateRequest } from '@/types/graph';
import { toast } from '@/store/toastStore';
import { UserMenu } from '@/components/UserMenu';

export function TopBar({
  isSidebarOpen,
  setIsSidebarOpen,
}: {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}) {
  const { user, setIsAuthPromptOpen } = useAuthStore();
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
    validationErrors,
  } = useGraphStore();

  const { activeProject, activeWorkflow, saveStatus, isSaving, manualSaveWorkflow } =
    useWorkspaceStore();

  const [genHovered, setGenHovered] = useState(false);

  const errorCount = validationErrors.filter((e) => e.severity === 'error').length;
  const canGenerate = nodes.length > 0 && !isGenerating;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);

    try {
      const request: GenerateRequest = {
        agent_name: agentName || activeWorkflow?.name || 'My Agent',
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.nodeType,
          label: n.data.label || n.id,
          provider: n.data.provider,
          model: n.data.model,
          temperature: n.data.temperature,
          system_prompt: n.data.systemPrompt,
          tool_name: n.data.toolName,
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

      const result = await generateCode(request);
      if (result && result.code) {
        setGeneratedCode(result.code);
        setIsCodeModalOpen(true);
      }
    } catch (err: any) {
      if (err?.errors && Array.isArray(err.errors)) {
        toast.error('Validation failed', err.errors[0]?.message || 'Graph has errors.');
      } else {
        toast.error('Compilation failed', err?.message || 'Ensure FastAPI backend is running on port 8000.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <header
      style={{
        height: 42,
        background: '#111A24',
        borderBottom: '1px solid #2A3947',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        userSelect: 'none',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* ── Left: Sidebar toggle + Logo + Breadcrumbs ───────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Sidebar toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8B98A5',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#E7EBEF')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#8B98A5')}
        >
          {isSidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 3,
              background: '#263746',
              border: '1px solid #344555',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 800, color: '#DDD7CC' }}>S</span>
          </div>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#DDD7CC',
              fontFamily: 'var(--font-mono), monospace',
            }}
          >
            SWARMLY
          </span>
        </div>

        <span style={{ color: '#2A3947', fontSize: 12 }}>/</span>

        {/* Project & Workflow Breadcrumb */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          <span style={{ color: '#8B98A5', fontWeight: 500 }}>
            {user ? (activeProject ? activeProject.name : 'Workspace') : 'Local Draft'}
          </span>
          <span style={{ color: '#2A3947' }}>/</span>
          <span style={{ color: '#E7EBEF', fontWeight: 600 }}>
            {activeWorkflow ? activeWorkflow.name : agentName || 'Untitled Workflow'}
          </span>
        </div>
      </div>

      {/* ── Center: Reserved space ─────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Right: Save Status, Compile, Inspector, Profile ───────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Save status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 500,
            color:
              !user
                ? '#B8B1A6'
                : saveStatus === 'saved'
                ? '#7FAF9A'
                : saveStatus === 'saving'
                ? '#8FA8BB'
                : '#B8B1A6',
            padding: '3px 7px',
            borderRadius: 4,
            background: '#182330',
            border: '1px solid #2A3947',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background:
                !user
                  ? '#B8B1A6'
                  : saveStatus === 'saved'
                  ? '#7FAF9A'
                  : saveStatus === 'saving'
                  ? '#8FA8BB'
                  : '#B8B1A6',
            }}
          />
          <span>
            {!user
              ? 'Local Draft'
              : isSaving
              ? 'Saving…'
              : saveStatus === 'saved'
              ? 'Saved'
              : 'Unsaved'}
          </span>
        </div>

        {/* Save button shortcut */}
        <button
          onClick={() => {
            if (!user) {
              setIsAuthPromptOpen(true);
              return;
            }
            manualSaveWorkflow();
          }}
          disabled={isSaving}
          title={!user ? 'Sign in to save to cloud' : 'Save workflow'}
          style={{
            background: 'transparent',
            border: '1px solid #2A3947',
            borderRadius: 5,
            color: '#8B98A5',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#E7EBEF';
            e.currentTarget.style.borderColor = '#344555';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#8B98A5';
            e.currentTarget.style.borderColor = '#2A3947';
          }}
        >
          {isSaving ? (
            <Loader2 size={12} className="animate-spin text-[#8B98A5]" />
          ) : (
            <Save size={12} />
          )}
          <span>Save</span>
        </button>

        {/* Primary Compile / Generate Action */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          onMouseEnter={() => setGenHovered(true)}
          onMouseLeave={() => setGenHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            background: canGenerate
              ? genHovered
                ? '#344555'
                : '#263746'
              : '#182330',
            border: `1px solid ${canGenerate ? '#344555' : '#2A3947'}`,
            borderRadius: 6,
            color: canGenerate ? '#DDD7CC' : '#5B6A78',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            transition: 'background 0.12s, color 0.12s',
            fontFamily: 'inherit',
          }}
        >
          {isGenerating ? (
            <Loader2 size={12} className="animate-spin text-[#DDD7CC]" />
          ) : (
            <Code2 size={12} />
          )}
          <span>{isGenerating ? 'Compiling…' : 'Generate Python →'}</span>
        </button>

        {/* Inspector toggle button */}
        <button
          onClick={() => setIsInspectorOpen(!isInspectorOpen)}
          title={isInspectorOpen ? 'Hide Inspector' : 'Show Inspector'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 5,
            background: isInspectorOpen ? '#263746' : 'transparent',
            border: `1px solid ${isInspectorOpen ? '#344555' : 'transparent'}`,
            color: isInspectorOpen ? '#E7EBEF' : '#8B98A5',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!isInspectorOpen) e.currentTarget.style.color = '#E7EBEF';
          }}
          onMouseLeave={(e) => {
            if (!isInspectorOpen) e.currentTarget.style.color = '#8B98A5';
          }}
        >
          <Sliders size={13} />
        </button>

        <div style={{ width: 1, height: 16, background: '#2A3947', margin: '0 2px' }} />

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
