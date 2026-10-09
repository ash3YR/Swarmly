'use client';
/**
 * @file PropertiesPanel.tsx
 * @description Docked right-side IDE inspector for configuring selected nodes in Navy / Slate aesthetic.
 */
import React from 'react';
import {
  X,
  Plus,
  Trash2,
  Brain,
  Wrench,
  GitBranch,
  AlertCircle,
  Sliders,
  Check,
} from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { LLMProvider, ToolName, RouterCondition } from '@/types/graph';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="sf-label" style={{ margin: 0 }}>{label}</label>
        {error && (
          <span style={{ fontSize: 10, color: '#C97878', fontWeight: 500 }}>
            {error}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
  ollama: ['llama3.2', 'llama3.1', 'mistral', 'qwen2.5', 'deepseek-r1'],
};

export function PropertiesPanel() {
  const {
    nodes,
    edges,
    selectedNodeId,
    selectNode,
    updateNodeData,
    deleteNode,
    isInspectorOpen,
    setIsInspectorOpen,
    validationErrors,
  } = useGraphStore();

  if (!isInspectorOpen) return null;

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const nodeErrors = selectedNodeId
    ? validationErrors.filter((e) => e.node_id === selectedNodeId)
    : [];

  const handleUpdate = (patch: Record<string, any>) => {
    if (!selectedNodeId) return;
    updateNodeData(selectedNodeId, patch);
  };

  return (
    <aside
      style={{
        width: 320,
        height: '100%',
        background: '#111A24',
        borderLeft: '1px solid #2A3947',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        flexShrink: 0,
        zIndex: 40,
      }}
    >
      {/* ── Inspector Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #1E2A36',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sliders size={13} style={{ color: '#8FA8BB' }} />
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
            INSPECTOR
          </span>
        </div>

        <button
          onClick={() => setIsInspectorOpen(false)}
          title="Close Inspector"
          style={{ background: 'none', border: 'none', color: '#8B98A5', cursor: 'pointer', padding: 2 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {!selectedNode ? (
          /* Workflow Overview when no node selected */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E7EBEF', marginBottom: 4 }}>
                Workflow Topology
              </div>
              <p style={{ fontSize: 11.5, color: '#8B98A5', margin: 0, lineHeight: 1.5 }}>
                Select any node on the canvas to configure its models, prompts, tools, or routing conditions.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                padding: '10px 12px',
                background: '#182330',
                border: '1px solid #2A3947',
                borderRadius: 6,
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: '#5B6A78', textTransform: 'uppercase' }}>Nodes</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#DDD7CC' }}>{nodes.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#5B6A78', textTransform: 'uppercase' }}>Edges</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#DDD7CC' }}>{edges.length}</div>
              </div>
            </div>

            {/* Validation List */}
            {validationErrors.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#8B98A5', textTransform: 'uppercase' }}>
                  Diagnostics ({validationErrors.length})
                </div>
                {validationErrors.map((err, i) => (
                  <div
                    key={i}
                    onClick={() => err.node_id && selectNode(err.node_id)}
                    style={{
                      padding: '8px 10px',
                      background: '#182330',
                      borderLeft: `2px solid ${err.severity === 'error' ? '#C97878' : '#D4A373'}`,
                      borderRadius: 4,
                      fontSize: 11,
                      color: err.severity === 'error' ? '#E7A1A1' : '#E6C59E',
                      cursor: err.node_id ? 'pointer' : 'default',
                    }}
                  >
                    {err.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Node Selected Inspector */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header / Identity */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E2A36', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {selectedNode.data.nodeType === 'llm_agent' ? (
                  <Brain size={14} style={{ color: '#8FA8BB' }} />
                ) : selectedNode.data.nodeType === 'tool' ? (
                  <Wrench size={14} style={{ color: '#7FAF9A' }} />
                ) : (
                  <GitBranch size={14} style={{ color: '#D4A373' }} />
                )}
                <span style={{ fontSize: 11, fontWeight: 700, color: '#B8B1A6', textTransform: 'uppercase', fontFamily: 'var(--font-mono), monospace' }}>
                  {selectedNode.data.nodeType === 'llm_agent' ? 'LLM Agent' : selectedNode.data.nodeType === 'tool' ? 'Tool Node' : 'Router'}
                </span>
              </div>

              <button
                onClick={() => deleteNode(selectedNode.id)}
                title="Delete node"
                style={{
                  background: 'transparent',
                  border: '1px solid #2A3947',
                  borderRadius: 4,
                  color: '#C97878',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10.5,
                }}
              >
                <Trash2 size={11} />
                <span>Delete</span>
              </button>
            </div>

            {/* Diagnostics if node has error */}
            {nodeErrors.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {nodeErrors.map((err, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px 8px',
                      background: '#1F1A1E',
                      border: '1px solid #C97878',
                      borderRadius: 4,
                      fontSize: 10.5,
                      color: '#E7A1A1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <AlertCircle size={12} style={{ color: '#C97878', flexShrink: 0 }} />
                    <span>{err.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Label */}
            <Field label="Node Label">
              <input
                type="text"
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdate({ label: e.target.value })}
                className="sf-input"
              />
            </Field>

            {/* ── LLM Agent Fields ───────────────────────────────────────────── */}
            {selectedNode.data.nodeType === 'llm_agent' && (
              <>
                <Field label="Model Provider">
                  <select
                    value={selectedNode.data.provider || 'openai'}
                    onChange={(e) => {
                      const prov = e.target.value as LLMProvider;
                      handleUpdate({
                        provider: prov,
                        model: PROVIDER_MODELS[prov][0],
                      });
                    }}
                    className="sf-input"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google Gemini</option>
                    <option value="ollama">Ollama (Local)</option>
                  </select>
                </Field>

                <Field label="Model Selection">
                  <select
                    value={selectedNode.data.model || 'gpt-4o'}
                    onChange={(e) => handleUpdate({ model: e.target.value })}
                    className="sf-input"
                  >
                    {(PROVIDER_MODELS[selectedNode.data.provider || 'openai'] || []).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </Field>

                <Field label={`Temperature: ${selectedNode.data.temperature ?? 0.7}`}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedNode.data.temperature ?? 0.7}
                    onChange={(e) => handleUpdate({ temperature: parseFloat(e.target.value) })}
                    style={{ accentColor: '#8FA8BB', width: '100%', cursor: 'pointer' }}
                  />
                </Field>

                <Field label="System Prompt">
                  <textarea
                    rows={4}
                    value={selectedNode.data.systemPrompt || ''}
                    onChange={(e) => handleUpdate({ systemPrompt: e.target.value })}
                    placeholder="Define agent personality, task boundaries, and execution rules…"
                    className="sf-input"
                    style={{ resize: 'vertical', minHeight: 70 }}
                  />
                </Field>

                <div style={{ borderTop: '1px solid #1E2A36', paddingTop: 12 }}>
                  <label className="sf-label">Attached Tools</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {[
                      { id: 'tavily_search', label: 'Tavily Web Search' },
                      { id: 'wikipedia', label: 'Wikipedia' },
                    ].map((tool) => {
                      const currentTools: ToolName[] = Array.isArray(selectedNode.data.tools)
                        ? (selectedNode.data.tools as ToolName[])
                        : [];
                      const isChecked = currentTools.includes(tool.id as ToolName);
                      return (
                        <label
                          key={tool.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 8px',
                            background: '#182330',
                            border: `1px solid ${isChecked ? '#344555' : '#1E2A36'}`,
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 11.5,
                            color: isChecked ? '#E7EBEF' : '#8B98A5',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...currentTools, tool.id as ToolName]
                                : currentTools.filter((t: ToolName) => t !== tool.id);
                              handleUpdate({ tools: next });
                            }}
                            style={{ accentColor: '#8FA8BB' }}
                          />
                          <span>{tool.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── Tool Fields ────────────────────────────────────────────────── */}
            {selectedNode.data.nodeType === 'tool' && (
              <>
                <Field label="Tool Implementation">
                  <select
                    value={selectedNode.data.toolName || 'tavily_search'}
                    onChange={(e) => handleUpdate({ toolName: e.target.value as ToolName })}
                    className="sf-input"
                  >
                    <option value="tavily_search">Tavily Web Search</option>
                    <option value="wikipedia">Wikipedia</option>
                  </select>
                </Field>

                <div style={{ padding: '8px 10px', background: '#182330', borderRadius: 4, fontSize: 11, color: '#8B98A5', lineHeight: 1.4 }}>
                  In LangGraph Python, this tool will execute standard ToolNode integration bound to upstream agent loops.
                </div>
              </>
            )}

            {/* ── Router Fields ──────────────────────────────────────────────── */}
            {selectedNode.data.nodeType === 'router' && (
              <>
                <div style={{ borderTop: '1px solid #1E2A36', paddingTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label className="sf-label" style={{ margin: 0 }}>Branch Conditions</label>
                    <button
                      onClick={() => {
                        const conds = selectedNode.data.conditions || [];
                        const otherNodes = nodes.filter((n) => n.id !== selectedNode.id && n.data.nodeType !== 'tool');
                        const defaultTarget = otherNodes[0]?.id || '';
                        handleUpdate({
                          conditions: [...conds, { keyword: `route_${conds.length + 1}`, targetNodeId: defaultTarget }],
                        });
                      }}
                      style={{
                        background: '#182330',
                        border: '1px solid #2A3947',
                        borderRadius: 3,
                        color: '#DDD7CC',
                        fontSize: 10.5,
                        cursor: 'pointer',
                        padding: '2px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Plus size={11} />
                      <span>Add Branch</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(selectedNode.data.conditions || []).map((cond: RouterCondition, idx: number) => {
                      const otherNodes = nodes.filter((n) => n.id !== selectedNode.id && n.data.nodeType !== 'tool');
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 10px',
                            background: '#182330',
                            border: '1px solid #2A3947',
                            borderRadius: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 10, color: '#5B6A78', textTransform: 'uppercase' }}>Branch {idx + 1}</span>
                            <button
                              onClick={() => {
                                const next = (selectedNode.data.conditions || []).filter((_, i) => i !== idx);
                                handleUpdate({ conditions: next });
                              }}
                              style={{ background: 'none', border: 'none', color: '#C97878', cursor: 'pointer', padding: 1 }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>

                          <div>
                            <input
                              type="text"
                              value={cond.keyword}
                              onChange={(e) => {
                                const next = [...(selectedNode.data.conditions || [])];
                                next[idx] = { ...next[idx], keyword: e.target.value };
                                handleUpdate({ conditions: next });
                              }}
                              placeholder="keyword (e.g. code)"
                              className="sf-input"
                              style={{ fontSize: 11 }}
                            />
                          </div>

                          <div>
                            <select
                              value={cond.targetNodeId}
                              onChange={(e) => {
                                const next = [...(selectedNode.data.conditions || [])];
                                next[idx] = { ...next[idx], targetNodeId: e.target.value };
                                handleUpdate({ conditions: next });
                              }}
                              className="sf-input"
                              style={{ fontSize: 11 }}
                            >
                              <option value="">Select target node…</option>
                              {otherNodes.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.data.label || n.id} ({n.data.nodeType})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}

                    {(!selectedNode.data.conditions || selectedNode.data.conditions.length === 0) && (
                      <div style={{ fontSize: 11, color: '#5B6A78', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                        No branching conditions defined.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
