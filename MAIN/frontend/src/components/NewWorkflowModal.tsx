'use client';
/**
 * @file NewWorkflowModal.tsx
 * @description Compact modal dialog for creating a new workflow with optional template selection.
 */
import React, { useState } from 'react';
import { X, FileCode, Sparkles, Brain, GitBranch, Layers } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { STARTER_TEMPLATES } from '@/lib/templates';
import { useGraphStore } from '@/store/graphStore';

export function NewWorkflowModal({
  isOpen,
  onClose,
  targetProjectId,
}: {
  isOpen: boolean;
  onClose: () => void;
  targetProjectId?: string | null;
}) {
  const { activeProject, projects, createAndOpenWorkflow, selectProject } = useWorkspaceStore();
  const { setNodes, setEdges } = useGraphStore();

  const [name, setName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentProject = projects.find((p) => p.id === targetProjectId) || activeProject;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting || !currentProject) return;

    setIsSubmitting(true);
    try {
      if (currentProject.id !== activeProject?.id) {
        await selectProject(currentProject);
      }

      let graphJson = { nodes: [], edges: [] };
      if (selectedTemplateId !== 'blank') {
        const tpl = STARTER_TEMPLATES.find((t) => t.id === selectedTemplateId);
        if (tpl) {
          graphJson = { nodes: tpl.nodes as any, edges: tpl.edges as any };
          setNodes(tpl.nodes);
          setEdges(tpl.edges);
        }
      } else {
        setNodes([]);
        setEdges([]);
      }

      await createAndOpenWorkflow(name.trim());
      setName('');
      setSelectedTemplateId('blank');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(5, 9, 13, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#111A24',
          border: '1px solid #2A3947',
          borderRadius: 8,
          boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #1E2A36',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <FileCode size={14} style={{ color: '#8FA8BB' }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#E7EBEF',
                letterSpacing: '0.06em',
                fontFamily: 'var(--font-mono), monospace',
              }}
            >
              NEW WORKFLOW
            </span>
            {currentProject && (
              <span style={{ fontSize: 10, color: '#5B6A78', marginLeft: 4 }}>
                in {currentProject.name}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#8B98A5', cursor: 'pointer', padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="sf-label">Workflow Name</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Research Pipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sf-input"
            />
          </div>

          {/* Template Selection */}
          <div>
            <label className="sf-label">Starting Architecture</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {/* Blank */}
              <div
                onClick={() => setSelectedTemplateId('blank')}
                style={{
                  padding: '8px 10px',
                  background: selectedTemplateId === 'blank' ? '#182330' : '#141E2B',
                  border: `1px solid ${selectedTemplateId === 'blank' ? '#8FA8BB' : '#2A3947'}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Layers size={13} style={{ color: '#8FA8BB' }} />
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#E7EBEF' }}>Blank</div>
                  <div style={{ fontSize: 9.5, color: '#5B6A78' }}>Empty canvas</div>
                </div>
              </div>

              {/* Research Agent */}
              <div
                onClick={() => setSelectedTemplateId('research_agent')}
                style={{
                  padding: '8px 10px',
                  background: selectedTemplateId === 'research_agent' ? '#182330' : '#141E2B',
                  border: `1px solid ${selectedTemplateId === 'research_agent' ? '#8FA8BB' : '#2A3947'}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Brain size={13} style={{ color: '#7FAF9A' }} />
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#E7EBEF' }}>Research Agent</div>
                  <div style={{ fontSize: 9.5, color: '#5B6A78' }}>Agent + Tool loop</div>
                </div>
              </div>

              {/* Research -> Writer */}
              <div
                onClick={() => setSelectedTemplateId('research_to_writer')}
                style={{
                  padding: '8px 10px',
                  background: selectedTemplateId === 'research_to_writer' ? '#182330' : '#141E2B',
                  border: `1px solid ${selectedTemplateId === 'research_to_writer' ? '#8FA8BB' : '#2A3947'}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Sparkles size={13} style={{ color: '#B8B1A6' }} />
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#E7EBEF' }}>Two-Stage</div>
                  <div style={{ fontSize: 9.5, color: '#5B6A78' }}>Research → Writer</div>
                </div>
              </div>

              {/* Supervisor */}
              <div
                onClick={() => setSelectedTemplateId('supervisor_workers')}
                style={{
                  padding: '8px 10px',
                  background: selectedTemplateId === 'supervisor_workers' ? '#182330' : '#141E2B',
                  border: `1px solid ${selectedTemplateId === 'supervisor_workers' ? '#8FA8BB' : '#2A3947'}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <GitBranch size={13} style={{ color: '#D4A373' }} />
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#E7EBEF' }}>Supervisor</div>
                  <div style={{ fontSize: 9.5, color: '#5B6A78' }}>Router branches</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '5px 12px',
                background: 'transparent',
                border: '1px solid #2A3947',
                borderRadius: 5,
                color: '#8B98A5',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              style={{
                padding: '5px 14px',
                background: name.trim() ? '#263746' : '#182330',
                border: '1px solid #344555',
                borderRadius: 5,
                color: name.trim() ? '#DDD7CC' : '#5B6A78',
                fontSize: 12,
                fontWeight: 600,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {isSubmitting ? 'Creating…' : 'Create Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
