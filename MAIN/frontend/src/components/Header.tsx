'use client';
/**
 * @file Header.tsx
 * @description Top navigation bar containing app branding and Generate Code button
 */
import React from 'react';
import { Code2, Loader2 } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { generateCode } from '@/lib/api';
import { GenerateRequest } from '@/types/graph';

export function Header() {
  const { 
    agentName, 
    setNodes,
    isGenerating, 
    setIsGenerating, 
    nodes, 
    edges, 
    setGeneratedCode, 
    setIsCodeModalOpen 
  } = useGraphStore();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const request: GenerateRequest = {
        agent_name: agentName,
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.data.nodeType,
          label: n.data.label,
          provider: n.data.provider,
          model: n.data.model,
          api_key: n.data.apiKey,
          system_prompt: n.data.systemPrompt,
          temperature: n.data.temperature,
          tool_name: n.data.toolName,
          tool_api_key: n.data.toolApiKey,
          conditions: n.data.conditions?.map(c => ({
            keyword: c.keyword,
            target_node_id: c.targetNodeId
          }))
        })),
        edges: edges.map(e => ({
          source: e.source,
          target: e.target,
          label: e.label as string | undefined
        }))
      };

      const res = await generateCode(request);
      setGeneratedCode(res.code);
      setIsCodeModalOpen(true);
    } catch (error) {
      alert('Failed to generate code. Is the backend running?');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <header className="h-14 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
          <Code2 size={18} className="text-white" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-white font-semibold text-lg tracking-tight">Swarmly</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">Beta</span>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-8">
        <input 
          type="text" 
          value={agentName}
          onChange={(e) => useGraphStore.setState({ agentName: e.target.value })}
          placeholder="My Research Agent"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center"
        />
      </div>

      <div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || nodes.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Code2 size={16} />}
          Generate Code
        </button>
      </div>
    </header>
  );
}
