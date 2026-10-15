'use client';
/**
 * @file WorkspaceModal.tsx
 * @description Modal for organizing projects and saved workflows with Row-Level Security.
 */
import React, { useState, useEffect } from 'react';
import {
  X,
  FolderPlus,
  Folder,
  FileCode,
  Plus,
  Trash2,
  Edit2,
  Check,
  FolderOpen,
  ArrowRight,
  Clock,
  Lock,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore';
import { Project, Workflow } from '@/types/workspace';

export function WorkspaceModal() {
  const {
    isWorkspaceModalOpen,
    setIsWorkspaceModalOpen,
    projects,
    activeProject,
    workflows,
    activeWorkflow,
    loadProjects,
    selectProject,
    createProject,
    renameProject,
    deleteProject,
    openWorkflow,
    createAndOpenWorkflow,
    deleteWorkflow,
  } = useWorkspaceStore();

  const { user, signInWithGoogle } = useAuthStore();

  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');

  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);

  useEffect(() => {
    if (isWorkspaceModalOpen && user) {
      loadProjects();
    }
  }, [isWorkspaceModalOpen, user, loadProjects]);

  if (!isWorkspaceModalOpen) return null;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await createProject(newProjectName.trim());
    setNewProjectName('');
  };

  const handleRenameProject = async (id: string) => {
    if (!editProjectName.trim()) return;
    await renameProject(id, editProjectName.trim());
    setEditingProjectId(null);
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;
    await createAndOpenWorkflow(newWorkflowName.trim());
    setNewWorkflowName('');
    setIsCreatingWorkflow(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsWorkspaceModalOpen(false);
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 780,
          height: '75vh',
          maxHeight: 620,
          background: '#191920',
          border: '1px solid #32323e',
          borderRadius: 16,
          boxShadow: '0 24px 70px rgba(0,0,0,0.85), 0 4px 16px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #2a2a34',
            background: '#1d1d25',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(105, 101, 219, 0.15)',
                border: '1px solid rgba(105, 101, 219, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderOpen size={15} className="text-[#8b88f8]" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f4f4f6' }}>
                Workspace & Saved Workflows
              </div>
              <div style={{ fontSize: 11, color: '#828292' }}>
                Organize projects and workflows securely backed by Supabase PostgreSQL
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsWorkspaceModalOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#71717a',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Unauthenticated State Warning */}
        {!user ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              padding: 32,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(105, 101, 219, 0.1)',
                border: '1px solid rgba(105, 101, 219, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={22} className="text-[#8b88f8]" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f4f4f6', margin: '0 0 6px' }}>
                Sign in to save and manage workflows
              </h3>
              <p style={{ fontSize: 12, color: '#9ca3af', maxWidth: 360, margin: 0, lineHeight: 1.5 }}>
                Your workflows are protected with Row-Level Security so only your authenticated account can access them.
              </p>
            </div>
            <button
              onClick={() => signInWithGoogle()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 20px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #6965db 0%, #8b88f8 100%)',
                border: 'none',
                color: '#fff',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>Sign in with Google</span>
            </button>
          </div>
        ) : (
          /* Authenticated Workspace Content (Two-Column Layout) */
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Left Column: Projects */}
            <div
              style={{
                width: 250,
                borderRight: '1px solid #2a2a34',
                display: 'flex',
                flexDirection: 'column',
                background: '#16161c',
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #24242e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Projects ({projects.length})
                </span>
              </div>

              {/* Project list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {projects.map((proj: Project) => {
                  const isActive = activeProject?.id === proj.id;
                  const isEditing = editingProjectId === proj.id;

                  return (
                    <div
                      key={proj.id}
                      onClick={() => !isEditing && selectProject(proj)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 10px',
                        borderRadius: 8,
                        background: isActive ? '#242432' : 'transparent',
                        border: `1px solid ${isActive ? '#3e3e54' : 'transparent'}`,
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
                          <input
                            type="text"
                            value={editProjectName}
                            onChange={(e) => setEditProjectName(e.target.value)}
                            className="sf-input"
                            style={{ padding: '2px 6px', fontSize: 11 }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameProject(proj.id)}
                            style={{ background: 'none', border: 'none', color: '#3ecf8e', cursor: 'pointer', padding: 2 }}
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                            <Folder size={13} className={isActive ? 'text-[#8b88f8]' : 'text-zinc-500'} />
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: isActive ? 600 : 500,
                                color: isActive ? '#f4f4f6' : '#a1a1aa',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {proj.name}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProjectId(proj.id);
                                setEditProjectName(proj.name);
                              }}
                              style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: 2 }}
                              title="Rename"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete project "${proj.name}" and all its workflows?`)) {
                                  deleteProject(proj.id);
                                }
                              }}
                              style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: 2 }}
                              title="Delete"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {projects.length === 0 && (
                  <div style={{ padding: '16px 8px', fontSize: 11, color: '#71717a', textAlign: 'center' }}>
                    No projects yet. Create one below!
                  </div>
                )}
              </div>

              {/* Create Project Input */}
              <form onSubmit={handleCreateProject} style={{ padding: '10px 12px', borderTop: '1px solid #24242e' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="New project name…"
                    className="sf-input"
                    style={{ fontSize: 11 }}
                  />
                  <button
                    type="submit"
                    disabled={!newProjectName.trim()}
                    style={{
                      padding: '5px 9px',
                      background: newProjectName.trim() ? '#6965db' : '#2a2a34',
                      border: 'none',
                      borderRadius: 7,
                      color: '#fff',
                      cursor: newProjectName.trim() ? 'pointer' : 'default',
                    }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Workflows in Active Project */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#191920' }}>
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid #24242e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f6' }}>
                    {activeProject ? activeProject.name : 'Select a project'}
                  </span>
                  {activeProject && (
                    <span style={{ fontSize: 11, color: '#71717a', marginLeft: 8 }}>
                      ({workflows.length} workflow{workflows.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </div>

                {activeProject && (
                  <button
                    onClick={() => setIsCreatingWorkflow(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: 'rgba(105, 101, 219, 0.15)',
                      border: '1px solid rgba(105, 101, 219, 0.3)',
                      color: '#c4b5fd',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={12} />
                    <span>Save Current as New</span>
                  </button>
                )}
              </div>

              {/* Inline Create Workflow Form */}
              {isCreatingWorkflow && (
                <form
                  onSubmit={handleCreateWorkflow}
                  style={{
                    padding: '10px 18px',
                    background: '#20202c',
                    borderBottom: '1px solid #2a2a38',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    placeholder="Workflow name (e.g. Research Pipeline)"
                    className="sf-input"
                    autoFocus
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '6px 14px',
                      borderRadius: 7,
                      border: 'none',
                      background: '#6965db',
                      color: '#fff',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Save & Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingWorkflow(false)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 7,
                      border: '1px solid #363644',
                      background: 'transparent',
                      color: '#a1a1aa',
                      fontSize: 11.5,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </form>
              )}

              {/* Workflows List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {workflows.map((wf: Workflow) => {
                  const nodeCount = wf.graph_json?.nodes?.length ?? 0;
                  const edgeCount = wf.graph_json?.edges?.length ?? 0;
                  const isCurrentActive = activeWorkflow?.id === wf.id;

                  return (
                    <div
                      key={wf.id}
                      onClick={() => openWorkflow(wf)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: '#21212a',
                        border: `1px solid ${isCurrentActive ? '#6965db' : '#2e2e3c'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'border-color 0.12s, transform 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#6965db')}
                      onMouseLeave={(e) => {
                        if (!isCurrentActive) e.currentTarget.style.borderColor = '#2e2e3c';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileCode size={16} className={isCurrentActive ? 'text-[#8b88f8]' : 'text-zinc-400'} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f6' }}>
                            {wf.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#71717a', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            <span>{nodeCount} nodes, {edgeCount} edges</span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={10} />
                              {new Date(wf.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete workflow "${wf.name}"?`)) {
                              deleteWorkflow(wf.id);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#71717a',
                            cursor: 'pointer',
                            padding: 4,
                            borderRadius: 4,
                          }}
                          title="Delete Workflow"
                        >
                          <Trash2 size={13} />
                        </button>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            color: '#6965db',
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: '4px 8px',
                          }}
                        >
                          <span>Open</span>
                          <ArrowRight size={12} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {activeProject && workflows.length === 0 && (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#71717a', fontSize: 12 }}>
                    No workflows in this project yet. Click &quot;Save Current as New&quot; above to store your canvas.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
