'use client';
/**
 * @file Canvas.tsx
 * @description ReactFlow canvas in Dark Navy / Slate aesthetic with CanvasPalette and EmptyCanvasState.
 */
import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphStore } from '@/store/graphStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { AgentNode } from './nodes/AgentNode';
import { ToolNode } from './nodes/ToolNode';
import { RouterNode } from './nodes/RouterNode';
import { EmptyCanvasState } from './EmptyCanvasState';
import { CanvasPalette } from './CanvasPalette';
import { NodeType, NodeData } from '@/types/graph';
import { createDefaultNode } from '@/lib/nodeFactory';
import { validateWorkflow } from '@/lib/api';

/* ── Node type registry ────────────────────────────────────────────────────── */
const nodeTypes = {
  llm_agent: AgentNode,
  tool: ToolNode,
  router: RouterNode,
};

/* ── Inner canvas ──────────────────────────────────────────────────────────── */
export function Canvas() {
  const {
    nodes,
    edges,
    agentName,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    addNode,
    setValidationErrors,
    setIsValidating,
  } = useGraphStore();

  const { screenToFlowPosition } = useReactFlow();
  const validationSeq = useRef(0);

  // ── Debounced real-time validation ──────────────────────────────────────────
  useEffect(() => {
    if (nodes.length === 0) {
      setValidationErrors([]);
      setIsValidating(false);
      return;
    }

    const currentSeq = ++validationSeq.current;
    setIsValidating(true);

    const timer = setTimeout(async () => {
      try {
        const payload = {
          agent_name: agentName || 'Agent',
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.data.nodeType,
            label: n.data.label || n.id,
            provider: n.data.provider,
            model: n.data.model,
            temperature: n.data.temperature,
            system_prompt: n.data.systemPrompt,
            tool_name: n.data.toolName,
            conditions: n.data.conditions?.map((c) => ({
              keyword: c.keyword,
              target_node_id: c.targetNodeId,
            })),
          })),
          edges: edges.map((e) => ({
            source: e.source,
            target: e.target,
            label: e.label as string | undefined,
          })),
        };

        const result = await validateWorkflow(payload);
        if (currentSeq === validationSeq.current) {
          setValidationErrors(result.errors || []);
          setIsValidating(false);
        }
      } catch {
        if (currentSeq === validationSeq.current) {
          setIsValidating(false);
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [nodes, edges, agentName, setValidationErrors, setIsValidating]);

  // ── Debounced autosave (when an active workflow is open) ────────────────────
  const { autoSaveWorkflow, activeWorkflow } = useWorkspaceStore();

  useEffect(() => {
    if (!activeWorkflow) return;

    const timer = setTimeout(() => {
      autoSaveWorkflow();
    }, 1200);

    return () => clearTimeout(timer);
  }, [nodes, edges, agentName, activeWorkflow, autoSaveWorkflow]);

  // ── Dynamic edge labeling & router condition styling ─────────────────────────
  const processedEdges = useMemo(() => {
    return edges.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);

      if (sourceNode?.data.nodeType === 'router') {
        const matchingCond = sourceNode.data.conditions?.find(
          (c) => c.targetNodeId === edge.target
        );
        const conditionLabel = matchingCond?.keyword || edge.label || 'branch';

        return {
          ...edge,
          label: conditionLabel,
          style: {
            stroke: '#D4A373',
            strokeWidth: 1.5,
          },
          labelStyle: {
            fill: '#B8B1A6',
            fontWeight: 600,
            fontSize: 10,
            fontFamily: 'var(--font-mono), monospace',
          },
          labelBgStyle: {
            fill: '#182330',
            stroke: '#2A3947',
            strokeWidth: 1,
          },
          labelBgPadding: [5, 3] as [number, number],
          labelBgBorderRadius: 4,
        };
      }

      return edge;
    });
  }, [edges, nodes]);

  // ── Drag & Drop handlers ────────────────────────────────────────────────────
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
      const newNode = createDefaultNode(type, position);
      addNode(newNode);
    },
    [screenToFlowPosition, addNode]
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Floating Canvas Palette */}
      <CanvasPalette />

      <ReactFlow
        nodes={nodes}
        edges={processedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={() => selectNode(null)}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        snapToGrid
        snapGrid={[8, 8]}
        deleteKeyCode={['Delete', 'Backspace']}
        minZoom={0.2}
        maxZoom={2.5}
        style={{ background: '#0B1117' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1E2A36"
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const type = (node.data as NodeData).nodeType;
            return type === 'llm_agent' ? '#8FA8BB' : type === 'tool' ? '#7FAF9A' : '#D4A373';
          }}
          maskColor="rgba(11, 17, 23, 0.85)"
          style={{
            width: 110,
            height: 70,
            background: '#111A24',
            border: '1px solid #2A3947',
            borderRadius: 6,
          }}
        />
      </ReactFlow>

      {/* Empty State Banner when 0 nodes exist */}
      <EmptyCanvasState />
    </div>
  );
}
