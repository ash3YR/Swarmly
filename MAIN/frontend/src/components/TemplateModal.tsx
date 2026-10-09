'use client';
/**
 * @file TemplateModal.tsx
 * @description Modal for selecting and loading starter workflow templates.
 * Redesigned in the Dark Navy / Slate / Stone developer IDE aesthetic.
 */
import React, { useState } from 'react';
import { X, LayoutTemplate, Brain, Sparkles, GitBranch, ArrowRight, AlertCircle } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { STARTER_TEMPLATES, WorkflowTemplate } from '@/lib/templates';
import { toast } from '@/store/toastStore';
import { useReactFlow } from '@xyflow/react';

const ICONS: Record<string, React.ReactNode> = {
  Brain: <Brain size={16} className="text-[#8FA8BB]" />,
  Sparkles: <Sparkles size={16} className="text-[#7FAF9A]" />,
  GitBranch: <GitBranch size={16} className="text-[#D4A373]" />,
};

export function TemplateModal() {
  const { isTemplateModalOpen, setIsTemplateModalOpen, nodes, loadTemplate } = useGraphStore();
  const { fitView } = useReactFlow();

  const [confirmTemplate, setConfirmTemplate] = useState<WorkflowTemplate | null>(null);

  if (!isTemplateModalOpen) return null;

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    if (nodes.length > 0) {
      setConfirmTemplate(template);
    } else {
      applyTemplate(template);
    }
  };

  const applyTemplate = (template: WorkflowTemplate) => {
    loadTemplate(template);
    setConfirmTemplate(null);
    setIsTemplateModalOpen(false);

    setTimeout(() => {
      fitView({ padding: 0.35, duration: 400 });
    }, 60);

    toast.success('Template loaded', `Scaffolded "${template.name}" with ${template.nodes.length} nodes.`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250,
        background: 'rgba(5, 9, 14, 0.75)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setConfirmTemplate(null);
          setIsTemplateModalOpen(false);
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          background: '#111A24',
          border: '1px solid #2A3947',
          borderRadius: 6,
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
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
            padding: '12px 16px',
            borderBottom: '1px solid #2A3947',
            background: '#182330',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                background: '#263746',
                border: '1px solid #344555',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LayoutTemplate size={13} className="text-[#8FA8BB]" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#DDD7CC' }}>
                Starter Workflow Templates
              </div>
              <div style={{ fontSize: 11, color: '#8B98A5' }}>
                Scaffold multi-agent LangGraph architectures into the editor
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setConfirmTemplate(null);
              setIsTemplateModalOpen(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#8B98A5',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#E7EBEF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8B98A5')}
          >
            <X size={15} />
          </button>
        </div>

        {/* Confirmation Banner if replacing active work */}
        {confirmTemplate && (
          <div
            style={{
              padding: '10px 16px',
              background: '#241a13',
              borderBottom: '1px solid #4a3420',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} className="text-[#D4A373] shrink-0" />
              <span style={{ fontSize: 12, color: '#E5D6C5', fontWeight: 500 }}>
                Replace active canvas with <strong>{confirmTemplate.name}</strong>?
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setConfirmTemplate(null)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: '1px solid #4a3420',
                  background: 'transparent',
                  color: '#DDD7CC',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => applyTemplate(confirmTemplate)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  border: 'none',
                  background: '#D4A373',
                  color: '#111A24',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Confirm & Replace
              </button>
            </div>
          </div>
        )}

        {/* Template List */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto' }}>
          {STARTER_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => handleSelectTemplate(tmpl)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '12px 14px',
                background: '#182330',
                border: '1px solid #2A3947',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'border-color 0.12s, background 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#344555';
                e.currentTarget.style.background = '#1E2C3D';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2A3947';
                e.currentTarget.style.background = '#182330';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {ICONS[tmpl.icon] || <Brain size={16} />}
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#E7EBEF' }}>
                    {tmpl.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: '#8FA8BB',
                    background: '#111A24',
                    border: '1px solid #2A3947',
                    padding: '1px 7px',
                    borderRadius: 3,
                    fontFamily: 'var(--font-mono), monospace',
                  }}
                >
                  {tmpl.badge}
                </span>
              </div>

              <div style={{ fontSize: 11.5, color: '#8B98A5', lineHeight: 1.45 }}>
                {tmpl.description}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 8,
                  borderTop: '1px solid #263746',
                  fontSize: 11,
                  color: '#8B98A5',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#8B98A5', fontWeight: 500 }}>Flow:</span>
                  <code style={{ color: '#DDD7CC', background: '#111A24', padding: '1px 5px', borderRadius: 3, fontSize: 10.5, fontFamily: 'var(--font-mono), monospace' }}>
                    {tmpl.flowPreview}
                  </code>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8FA8BB', fontWeight: 600 }}>
                  <span>Use template</span>
                  <ArrowRight size={11} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
