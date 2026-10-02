'use client';
/**
 * @file Canvas.tsx
 * @description Full-screen ReactFlow canvas.
 *
 * Layout: fills the entire viewport (position: fixed).
 * All other UI (Toolbar, PropertiesPanel, CodeModal) float OVER this canvas.
 * This is the Excalidraw pattern — canvas = background, UI = overlays.
 *
 * Drag-and-drop: node types are dragged from the Toolbar icons into the canvas.
 * The `onDrop` handler reads the type from dataTransfer and places the node
 * at the cursor's canvas position using `screenToFlowPosition`.
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

/* ── Node type registry ────────────────────────────────────────────────────── */
const nodeTypes = {
  llm_agent: AgentNode,
  tool: ToolNode,
  router: RouterNode,
};

/* ── Default label map ─────────────────────────────────────────────────────── */
const DEFAULT_LABEL: Record<NodeType, string> = {
  llm_agent: 'LLM Agent',
  tool: 'Tool',
  router: 'Router',
};

/* ── Inner canvas (needs ReactFlow context) ────────────────────────────────── */
function CanvasContent() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, selectNode, addNode } =
    useGraphStore();
  const { screenToFlowPosition } = useReactFlow();

  // Per-type counters for default node labels
  const counters = useRef<Record<NodeType, number>>({ llm_agent: 0, tool: 0, router: 0 });

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow-type') as NodeType;
      if (!type || !(type in nodeTypes)) return;

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      counters.current[type] = (counters.current[type] ?? 0) + 1;

      addNode({
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: `${DEFAULT_LABEL[type]} ${counters.current[type]}`,
          nodeType: type,
        } as NodeData,
      });
    },
    [screenToFlowPosition, addNode],
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
      fitViewOptions={{ padding: 0.3 }}
      snapToGrid
      snapGrid={[8, 8]}
      deleteKeyCode={['Delete', 'Backspace']}
      minZoom={0.2}
      maxZoom={2.5}
      style={{ background: 'var(--canvas-bg, #1a1a1a)' }}
    >
      {/* Dot grid — subtle, like Excalidraw */}
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="#2e2e2e"
      />
      {/* Controls — positioned bottom-right via CSS */}
      <Controls showInteractive={false} />
      {/* MiniMap — bottom-right above controls */}
      <MiniMap
        nodeColor={(node) => {
          const type = (node.data as NodeData).nodeType;
          return type === 'llm_agent' ? '#7c6af7' : type === 'tool' ? '#3ecf8e' : '#f59e0b';
        }}
        maskColor="rgba(26,26,26,0.8)"
        style={{ width: 120, height: 80 }}
      />
    </ReactFlow>
  );
}

/* ── Exported Canvas — wraps with ReactFlowProvider ────────────────────────── */
export function Canvas() {
  return (
    <ReactFlowProvider>
      {/* Full-screen: position fixed so Toolbar/PropertiesPanel float over it */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <CanvasContent />
      </div>
    </ReactFlowProvider>
  );
}
