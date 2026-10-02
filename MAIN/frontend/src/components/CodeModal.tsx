'use client';
/**
 * @file CodeModal.tsx
 * @description Modal displaying the generated LangGraph Python code.
 *
 * Design decisions:
 * - Backdrop is a very subtle dark overlay (not pitch black) so the canvas peeks through.
 * - The modal itself is wide and tall but not full-screen — intentional, so it feels like a sheet.
 * - Header shows a macOS-style traffic-light dot pattern for visual polish.
 * - Footer has Copy and Close buttons, with a checkmark flash on copy.
 * - SyntaxHighlighter uses 'vscDarkPlus' theme — closer to a real IDE than atomDark.
 */
import React, { useState } from 'react';
import { X, Copy, Check, Download } from 'lucide-react';
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
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
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
          maxWidth: 860,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#17171c',
          border: '1px solid #2e2e38',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #2e2e38',
            background: '#1c1c22',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* macOS traffic lights (decorative) */}
            <div style={{ display: 'flex', gap: 5 }}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <div style={{ width: 1, height: 14, background: '#2e2e38' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#e4e4e7', letterSpacing: '-0.2px' }}>
              {agentName || 'agent'}.py
            </span>
            <span
              style={{
                fontSize: 10,
                color: '#52525b',
                background: '#232329',
                border: '1px solid #2e2e38',
                borderRadius: 4,
                padding: '1px 6px',
              }}
            >
              {lineCount} lines
            </span>
          </div>

          <button
            onClick={() => setIsCodeModalOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#71717a',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.1s, background 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#e4e4e7';
              e.currentTarget.style.background = '#2e2e38';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#71717a';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Code body ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <SyntaxHighlighter
            language="python"
            style={vscDarkPlus}
            showLineNumbers
            lineNumberStyle={{ color: '#3f3f4a', fontSize: 11, minWidth: 36, paddingRight: 16, userSelect: 'none' }}
            customStyle={{
              margin: 0,
              padding: '16px 20px',
              background: '#17171c',
              fontSize: 12.5,
              lineHeight: 1.65,
              fontFamily: "'Geist Mono', 'SF Mono', 'Fira Code', monospace",
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
            borderTop: '1px solid #2e2e38',
            background: '#1c1c22',
            flexShrink: 0,
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, color: '#52525b' }}>
            Generated by Swarmly · LangGraph Python
          </span>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleDownload}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px',
                background: 'transparent',
                border: '1px solid #363636',
                borderRadius: 7,
                color: '#71717a',
                fontSize: 12, fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 0.12s, color 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#e4e4e7'; e.currentTarget.style.borderColor = '#52525b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#71717a'; e.currentTarget.style.borderColor = '#363636'; }}
            >
              <Download size={12} /> Download
            </button>

            <button
              onClick={handleCopy}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 14px',
                background: copied ? '#1a3a27' : '#6965db',
                border: `1px solid ${copied ? '#3ecf8e' : 'transparent'}`,
                borderRadius: 7,
                color: copied ? '#3ecf8e' : '#fff',
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                boxShadow: copied ? 'none' : '0 2px 8px rgba(105,101,219,0.3)',
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
