'use client';
/**
 * @file CodeModal.tsx
 * @description Full-screen modal to display generated Python code
 */
import React, { useState } from 'react';
import { X, Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGraphStore } from '@/store/graphStore';

export function CodeModal() {
  const { generatedCode, isCodeModalOpen, setIsCodeModalOpen } = useGraphStore();
  const [copied, setCopied] = useState(false);

  if (!isCodeModalOpen || !generatedCode) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden shadow-2xl">
        
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Generated LangGraph Code</h2>
          </div>
          <button 
            onClick={() => setIsCodeModalOpen(false)}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-[#1d1f21] p-4 text-sm relative">
          <SyntaxHighlighter
            language="python"
            style={atomDark}
            showLineNumbers
            customStyle={{ margin: 0, background: 'transparent' }}
          >
            {generatedCode}
          </SyntaxHighlighter>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-800 bg-zinc-900">
          <button
            onClick={() => setIsCodeModalOpen(false)}
            className="px-4 py-2 rounded-md text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>
    </div>
  );
}
