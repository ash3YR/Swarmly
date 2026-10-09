'use client';
/**
 * @file WorkspaceSidebar.tsx
 * @description Persistent collapsible IDE sidebar for projects and workflow navigation.
 */
import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  PlusCircle,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore';
import { Project, Workflow } from '@/types/workspace';

export function WorkspaceSidebar({
  isOpen,
  onOpenNewProject,
  onOpenNewWorkflow,
}: {
  isOpen: boolean;
  onOpenNewProject: () => void;
  onOpenNewWorkflow: (projectId?: string) => void;
}) {
  const { user, setIsAuthPromptOpen } = useAuthStore();
  const {
    projects,
    activeProject,
    workflows,
    activeWorkflow,
    selectProject,
    renameProject,
    deleteProject,
    openWorkflow,
    deleteWorkflow,
  } = useWorkspaceStore();

  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');

  if (!isOpen) return null;

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : false, // default is open for active
    }));
  };

  const handleRenameSubmit = async (id: string) => {
    if (!editProjectName.trim()) return;
    await renameProject(id, editProjectName.trim());
    setEditingProjectId(null);
  };

  return (
    <aside
      style={{
        width: 240,
        height: '100%',
        background: '#111A24',
        borderRight: '1px solid #2A3947',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        flexShrink: 0,
        zIndex: 40,
      }}
    >
      {/* ── Sidebar Header ──────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #1E2A36',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#8B98A5',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono), monospace',
          }}
        >
          WORKSPACE
        </span>

        <button
          onClick={onOpenNewProject}
          title="New Project"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8B98A5',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#DDD7CC')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#8B98A5')}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* ── Projects & Workflows Tree ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '4px 12px 6px', fontSize: 10, color: '#5B6A78', fontWeight: 600, letterSpacing: '0.05em' }}>
          PROJECTS ({user ? projects.length : 0})
        </div>

        {!user ? (
          <div style={{ padding: '20px 14px', textAlign: 'center', color: '#8B98A5', fontSize: 11.5 }}>
            <div style={{ color: '#DDD7CC', fontWeight: 600, marginBottom: 4 }}>Local Session</div>
            <p style={{ margin: '0 0 12px', color: '#8B98A5', lineHeight: 1.45, fontSize: 11 }}>
              You are exploring Swarmly in local draft mode. Sign in with Google to create cloud projects and persist workflows.
            </p>
            <button
              onClick={() => setIsAuthPromptOpen(true)}
              style={{
                width: '100%',
                background: '#182330',
                border: '1px solid #2A3947',
                borderRadius: 4,
                color: '#8FA8BB',
                fontSize: 11,
                fontWeight: 600,
                padding: '6px 10px',
                cursor: 'pointer',
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
              Sign In to Cloud
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#5B6A78', fontSize: 11 }}>
            No projects yet.
            <button
              onClick={onOpenNewProject}
              style={{
                display: 'block',
                margin: '8px auto 0',
                background: '#182330',
                border: '1px solid #2A3947',
                borderRadius: 4,
                color: '#8FA8BB',
                fontSize: 11,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              + Create Project
            </button>
          </div>
        ) : (
          projects.map((proj: Project) => {
            const isActiveProject = activeProject?.id === proj.id;
            const isExpanded = expandedProjects[proj.id] ?? isActiveProject;

            return (
              <div key={proj.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Project Row */}
                <div
                  onClick={() => selectProject(proj)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 10px 5px 8px',
                    cursor: 'pointer',
                    background: isActiveProject ? '#162230' : 'transparent',
                    borderLeft: `2px solid ${isActiveProject ? '#8FA8BB' : 'transparent'}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActiveProject) e.currentTarget.style.background = '#141E2B';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActiveProject) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                    <span
                      onClick={(e) => toggleExpand(proj.id, e)}
                      style={{ color: '#5B6A78', cursor: 'pointer', display: 'flex' }}
                    >
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>

                    {editingProjectId === proj.id ? (
                      <input
                        autoFocus
                        value={editProjectName}
                        onChange={(e) => setEditProjectName(e.target.value)}
                        onBlur={() => handleRenameSubmit(proj.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(proj.id);
                          if (e.key === 'Escape') setEditingProjectId(null);
                        }}
                        style={{
                          fontSize: 11.5,
                          background: '#111A24',
                          border: '1px solid #344555',
                          borderRadius: 3,
                          color: '#E7EBEF',
                          padding: '1px 4px',
                          width: '100%',
                        }}
                      />
                    ) : (
                      <>
                        <Folder
                          size={13}
                          style={{ color: isActiveProject ? '#8FA8BB' : '#5B6A78', flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: isActiveProject ? 600 : 500,
                            color: isActiveProject ? '#E7EBEF' : '#8B98A5',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {proj.name}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Actions on hover */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewWorkflow(proj.id);
                      }}
                      title="Add Workflow"
                      style={{ background: 'none', border: 'none', color: '#5B6A78', cursor: 'pointer', padding: 2 }}
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProjectId(proj.id);
                        setEditProjectName(proj.name);
                      }}
                      title="Rename"
                      style={{ background: 'none', border: 'none', color: '#5B6A78', cursor: 'pointer', padding: 2 }}
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete project "${proj.name}"?`)) deleteProject(proj.id);
                      }}
                      title="Delete"
                      style={{ background: 'none', border: 'none', color: '#5B6A78', cursor: 'pointer', padding: 2 }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Nested Workflows */}
                {isExpanded && isActiveProject && (
                  <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 18 }}>
                    {workflows.length === 0 ? (
                      <div
                        onClick={() => onOpenNewWorkflow(proj.id)}
                        style={{
                          padding: '4px 10px',
                          fontSize: 11,
                          color: '#5B6A78',
                          cursor: 'pointer',
                          fontStyle: 'italic',
                        }}
                      >
                        + Create workflow
                      </div>
                    ) : (
                      workflows.map((wf: Workflow) => {
                        const isActiveWf = activeWorkflow?.id === wf.id;
                        return (
                          <div
                            key={wf.id}
                            onClick={() => openWorkflow(wf)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '4px 10px 4px 6px',
                              cursor: 'pointer',
                              background: isActiveWf ? '#1C2B3C' : 'transparent',
                              borderLeft: `2px solid ${isActiveWf ? '#8FA8BB' : 'transparent'}`,
                            }}
                            onMouseEnter={(e) => {
                              if (!isActiveWf) e.currentTarget.style.background = '#15212E';
                            }}
                            onMouseLeave={(e) => {
                              if (!isActiveWf) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                              <FileCode
                                size={12}
                                style={{ color: isActiveWf ? '#8FA8BB' : '#5B6A78', flexShrink: 0 }}
                              />
                              <span
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: isActiveWf ? 600 : 400,
                                  color: isActiveWf ? '#E7EBEF' : '#8B98A5',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {wf.name}
                              </span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete workflow "${wf.name}"?`)) deleteWorkflow(wf.id);
                              }}
                              title="Delete workflow"
                              style={{ background: 'none', border: 'none', color: '#5B6A78', cursor: 'pointer', padding: 2 }}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom: New Project Button ───────────────────────────────────────── */}
      <div style={{ padding: 10, borderTop: '1px solid #1E2A36' }}>
        <button
          onClick={() => {
            if (!user) {
              setIsAuthPromptOpen(true);
              return;
            }
            onOpenNewProject();
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '6px 10px',
            background: '#182330',
            border: '1px solid #2A3947',
            borderRadius: 5,
            color: '#DDD7CC',
            fontSize: 11.5,
            fontWeight: 500,
            cursor: 'pointer',
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
          <Plus size={13} />
          <span>New Project</span>
        </button>
      </div>
    </aside>
  );
}
