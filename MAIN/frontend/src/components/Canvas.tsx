'use client';
/**
 * @file Canvas.tsx
 * @description Main ReactFlow canvas for building agents
 */
import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphStore } from '@/store/graphStore';
import { AgentNode } from './nodes/AgentNode';
import { ToolNode } from './nodes/ToolNode';
import { RouterNode } from './nodes/RouterNode';
import { NodeType, NodeData } from '@/types/graph';

const nodeTypes = {
  llm_agent: AgentNode,
  tool: ToolNode,
  router: RouterNode,
};

function CanvasContent() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    addNode,
  } = useGraphStore();

  const { screenToFlowPosition } = useReactFlow();
  
  // Track counts to generate default names
  const counters = useRef({ llm_agent: 0, tool: 0, router: 0 });

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow-type') as NodeType;
      if (!type || !nodeTypes[type]) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      counters.current[type] += 1;
      const count = counters.current[type];
      
      const labelMap = {
        llm_agent: 'LLM Agent',
        tool: 'Tool',
        router: 'Router'
      };

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { 
          label: `${labelMap[type]} ${count}`,
          nodeType: type,
        } as NodeData,
      };

      addNode(newNode);
    },
    [screenToFlowPosition, addNode]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={(_, node) => selectNode(node.id)}
      onPaneClick={() => selectNode(null)}
      onDragOver={onDragOver}
      onDrop={onDrop}
      nodeTypes={nodeTypes}
      fitView
      snapToGrid
      snapGrid={[16, 16]}
      deleteKeyCode={['Delete', 'Backspace']}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#3f3f46" />
      <Controls className="!bg-zinc-900 !border-zinc-800 [&>button]:!border-zinc-800 [&>button]:!text-zinc-300 hover:[&>button]:!bg-zinc-800" />
      <MiniMap 
        className="!bg-zinc-900 !border-zinc-800" 
        maskColor="rgba(0, 0, 0, 0.5)"
        nodeColor="#52525b"
      />
    </ReactFlow>
  );
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <div className="w-full h-full">
        <CanvasContent />
      </div>
    </ReactFlowProvider>
  );
}
