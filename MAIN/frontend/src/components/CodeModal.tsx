'use client';
/**
 * @file CodeModal.tsx
 * @description Modal displaying the generated LangGraph Python code.
 * Redesigned in the Dark Navy / Slate / Warm Stone developer IDE aesthetic.
 */
import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGraphStore } from '@/store/graphStore';

export function CodeModal() {
  const { generatedCode, isCodeModalOpen, setIsCodeModalOpen, agentName } = useGraphStore();
  const [copied, setCopied] = useState(false);

  if (!isCodeModalOpen || !generatedCode) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard access may be blocked */
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(agentName || 'agent').replace(/\s+/g, '_').toLowerCase()}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lineCount = generatedCode.split('\n').length;

  return (
    /* ── Backdrop ─────────────────────────────────────────────────────────── */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(5, 9, 14, 0.75)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsCodeModalOpen(false);
      }}
    >
      {/* ── Modal sheet ──────────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#111A24',
          border: '1px solid #2A3947',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
        }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid #2A3947',
            background: '#182330',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCode size={14} className="text-[#8FA8BB]" />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#DDD7CC',
                fontFamily: 'var(--font-mono), monospace',
              }}
            >
              {(agentName || 'agent').replace(/\s+/g, '_').toLowerCase()}.py
            </span>
            <span
              style={{
                fontSize: 10,
                color: '#8B98A5',
                background: '#111A24',
                border: '1px solid #2A3947',
                borderRadius: 4,
                padding: '1px 6px',
                fontFamily: 'var(--font-mono), monospace',
              }}
            >
              {lineCount} lines
            </span>
          </div>

          <button
            onClick={() => setIsCodeModalOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#8B98A5',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#E7EBEF';
              e.currentTarget.style.background = '#263746';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8B98A5';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Code body ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', background: '#0B1117' }}>
          <SyntaxHighlighter
            language="python"
            style={vscDarkPlus}
            showLineNumbers
            lineNumberStyle={{
              color: '#344555',
              fontSize: 11,
              minWidth: 36,
              paddingRight: 16,
              userSelect: 'none',
              fontFamily: 'var(--font-mono), monospace',
            }}
            customStyle={{
              margin: 0,
              padding: '16px 20px',
              background: '#0B1117',
              fontSize: 12,
              lineHeight: 1.6,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            }}
          >
            {generatedCode}
          </SyntaxHighlighter>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderTop: '1px solid #2A3947',
            background: '#182330',
            flexShrink: 0,
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: '#8B98A5',
              fontFamily: 'var(--font-mono), monospace',
            }}
          >
            LangGraph Python · StateGraph Architecture
          </span>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 12px',
                background: '#111A24',
                border: '1px solid #2A3947',
                borderRadius: 5,
                color: '#DDD7CC',
                fontSize: 11.5,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 0.12s, color 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#344555';
                e.currentTarget.style.color = '#E7EBEF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2A3947';
                e.currentTarget.style.color = '#DDD7CC';
              }}
            >
              <Download size={12} />
              <span>Download</span>
            </button>

            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 14px',
                background: copied ? '#1e332a' : '#263746',
                border: `1px solid ${copied ? '#7FAF9A' : '#344555'}`,
                borderRadius: 5,
                color: copied ? '#7FAF9A' : '#DDD7CC',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!copied) e.currentTarget.style.background = '#344555';
              }}
              onMouseLeave={(e) => {
                if (!copied) e.currentTarget.style.background = '#263746';
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
