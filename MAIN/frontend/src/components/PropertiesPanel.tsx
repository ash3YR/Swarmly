'use client';
/**
 * @file PropertiesPanel.tsx
 * @description Floating properties panel — Excalidraw-style.
 *
 * Design decisions:
 * - Floats over the canvas on the left side (position: fixed), vertically centered.
 * - Appears with a fade+slide animation when a node is selected.
 * - Compact width (268px) — enough for form fields, not so wide it feels like a sidebar.
 * - Grouped fields with section labels, not a wall of inputs.
 * - All input styling comes from the .sf-input / .sf-label CSS classes in globals.css.
 */
import React from 'react';
import { X, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { LLMProvider, ToolName, RouterCondition } from '@/types/graph';

/* ── Field components ───────────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <label className="sf-label">{label}</label>
      {children}
    </div>
  );
}

function SecretInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="sf-input"
        style={{ paddingRight: 30 }}
        spellCheck={false}
        autoComplete="off"
      />
      <button
        onClick={() => setVisible((v) => !v)}
        style={{
          position: 'absolute',
          right: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-faint)',
          padding: 0,
          display: 'flex',
        }}
      >
        {visible ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
}

/* ── Section divider inside panel ───────────────────────────────────────────── */
function PanelDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '4px 0',
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
    </div>
  );
}

/* ── Model placeholder map ───────────────────────────────────────────────────── */
const MODEL_PLACEHOLDER: Record<string, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  google: 'gemini-1.5-pro',
  ollama: 'llama3.2',
};

/* ── Node type accent colors ────────────────────────────────────────────────── */
const NODE_ACCENT: Record<string, string> = {
  llm_agent: '#7c6af7',
  tool: '#3ecf8e',
  router: '#f59e0b',
};

const NODE_LABEL: Record<string, string> = {
  llm_agent: 'LLM Agent',
  tool: 'Tool',
  router: 'Router',
};

/* ── Main PropertiesPanel ───────────────────────────────────────────────────── */
export function PropertiesPanel() {
  const { nodes, selectedNodeId, selectNode, updateNodeData } = useGraphStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) return null;

  const { data } = selectedNode;
  const accent = NODE_ACCENT[data.nodeType] ?? 'var(--accent)';
  const updateData = (updates: Record<string, unknown>) => updateNodeData(selectedNode.id, updates);

  return (
    <div
      className="panel-enter"
      style={{
        position: 'fixed',
        left: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 90,
        width: 268,
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--panel-bg)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 8px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4)',
      }}
    >
      {/* ── Panel header ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px 8px',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky',
          top: 0,
          background: 'var(--panel-bg)',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 6px ${accent}`,
              flexShrink: 0,
            }}
          />
          <input
            type="text"
            value={data.label}
            onChange={(e) => updateData({ label: e.target.value })}
            spellCheck={false}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              width: 160,
              fontFamily: 'inherit',
              caretColor: accent,
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: accent,
              background: `${accent}18`,
              border: `1px solid ${accent}30`,
              padding: '2px 6px',
              borderRadius: 4,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {NODE_LABEL[data.nodeType] ?? data.nodeType}
          </span>
          <button
            onClick={() => selectNode(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-faint)',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.1s, background 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'var(--panel-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-faint)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Panel body ───────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── LLM Agent fields ─────────────────────────────────────────── */}
        {data.nodeType === 'llm_agent' && (
          <>
            <PanelDivider label="Model" />

            <Field label="Provider">
              <select
                value={data.provider ?? ''}
                onChange={(e) => updateData({ provider: e.target.value as LLMProvider })}
                className="sf-input"
              >
                <option value="" disabled>Select provider</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="ollama">Ollama (local)</option>
              </select>
            </Field>

            <Field label="Model">
              <input
                type="text"
                value={data.model ?? ''}
                onChange={(e) => updateData({ model: e.target.value })}
                placeholder={MODEL_PLACEHOLDER[data.provider ?? ''] ?? 'e.g. gpt-4o'}
                className="sf-input"
                spellCheck={false}
              />
            </Field>

            {data.provider !== 'ollama' && (
              <Field label="API Key">
                <SecretInput
                  value={data.apiKey ?? ''}
                  onChange={(v) => updateData({ apiKey: v })}
                  placeholder="sk-..."
                />
              </Field>
            )}

            <PanelDivider label="Prompt" />

            <Field label="System Prompt">
              <textarea
                value={data.systemPrompt ?? ''}
                onChange={(e) => updateData({ systemPrompt: e.target.value })}
                placeholder="You are a helpful assistant..."
                rows={4}
                className="sf-input"
                style={{ resize: 'vertical', minHeight: 72, lineHeight: 1.5 }}
                spellCheck={false}
              />
            </Field>

            <Field label="Temperature">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={data.temperature ?? 0.7}
                  onChange={(e) => updateData({ temperature: parseFloat(e.target.value) })}
                  style={{ flex: 1, accentColor: accent, height: 3 }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600, minWidth: 28, textAlign: 'right' }}>
                  {(data.temperature ?? 0.7).toFixed(2)}
                </span>
              </div>
            </Field>
          </>
        )}

        {/* ── Tool fields ──────────────────────────────────────────────── */}
        {data.nodeType === 'tool' && (
          <>
            <PanelDivider label="Tool" />

            <Field label="Tool">
              <select
                value={data.toolName ?? ''}
                onChange={(e) => updateData({ toolName: e.target.value as ToolName })}
                className="sf-input"
              >
                <option value="" disabled>Select a tool</option>
                <option value="tavily_search">Tavily Search</option>
                <option value="wikipedia">Wikipedia</option>
                <option value="calculator">Calculator</option>
                <option value="python_repl">Python REPL</option>
              </select>
            </Field>

            {data.toolName === 'tavily_search' && (
              <Field label="Tavily API Key">
                <SecretInput
                  value={data.toolApiKey ?? ''}
                  onChange={(v) => updateData({ toolApiKey: v })}
                  placeholder="tvly-..."
                />
              </Field>
            )}
          </>
        )}

        {/* ── Router fields ────────────────────────────────────────────── */}
        {data.nodeType === 'router' && (
          <>
            <PanelDivider label="Conditions" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(data.conditions ?? []).map((cond: RouterCondition, idx: number) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--panel-bg-alt)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Rule {idx + 1}
                    </span>
                    <button
                      onClick={() => {
                        const next = [...(data.conditions ?? [])];
                        next.splice(idx, 1);
                        updateData({ conditions: next });
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 2, display: 'flex' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={cond.keyword}
                    onChange={(e) => {
                      const next = [...(data.conditions ?? [])];
                      next[idx] = { ...next[idx], keyword: e.target.value };
                      updateData({ conditions: next });
                    }}
                    placeholder="if message contains…"
                    className="sf-input"
                    spellCheck={false}
                  />
                  <select
                    value={cond.targetNodeId}
                    onChange={(e) => {
                      const next = [...(data.conditions ?? [])];
                      next[idx] = { ...next[idx], targetNodeId: e.target.value };
                      updateData({ conditions: next });
                    }}
                    className="sf-input"
                  >
                    <option value="" disabled>Route to…</option>
                    <option value="END">END</option>
                    {nodes
                      .filter((n) => n.id !== selectedNode.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>{n.data.label}</option>
                      ))}
                  </select>
                </div>
              ))}

              <button
                onClick={() => {
                  const next = [...(data.conditions ?? []), { keyword: '', targetNodeId: '' }];
                  updateData({ conditions: next });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  padding: '6px',
                  background: 'transparent',
                  border: '1px dashed var(--border)',
                  borderRadius: 7,
                  color: 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.12s, color 0.12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--router-color, #f59e0b)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <Plus size={12} />
                Add condition
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
