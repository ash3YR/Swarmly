'use client';
/**
 * @file NewProjectModal.tsx
 * @description Compact modal dialog for creating a new project.
 */
import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';

export function NewProjectModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}) {
  const { createProject } = useWorkspaceStore();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const proj = await createProject(name.trim());
      setName('');
      onClose();
      if (proj && onCreated) onCreated(proj.id);
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
          maxWidth: 380,
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
            <FolderPlus size={14} style={{ color: '#8FA8BB' }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#E7EBEF',
                letterSpacing: '0.06em',
                fontFamily: 'var(--font-mono), monospace',
              }}
            >
              NEW PROJECT
            </span>
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
            <label className="sf-label">Project Name</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Customer Support Swarm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sf-input"
            />
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
              {isSubmitting ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
