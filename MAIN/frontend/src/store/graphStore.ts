import { create } from 'zustand';
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
} from '@xyflow/react';
import { NodeData, ValidationErrorItem } from '@/types/graph';
import { WorkflowTemplate } from '@/lib/templates';

interface GraphState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  agentName: string;
  generatedCode: string | null;
  isGenerating: boolean;
  isValidating: boolean;
  isCodeModalOpen: boolean;
  isInspectorOpen: boolean;
  isTemplateModalOpen: boolean;
  validationErrors: ValidationErrorItem[];

  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange<Node<NodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  selectNode: (id: string | null) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  setGeneratedCode: (code: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setIsValidating: (isValidating: boolean) => void;
  setIsCodeModalOpen: (isOpen: boolean) => void;
  setIsInspectorOpen: (isOpen: boolean) => void;
  setIsTemplateModalOpen: (isOpen: boolean) => void;
  setValidationErrors: (errors: ValidationErrorItem[]) => void;
  addNode: (node: Node<NodeData>) => void;
  clearGraph: () => void;
  loadTemplate: (template: WorkflowTemplate) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  agentName: 'My Agent',
  generatedCode: null,
  isGenerating: false,
  isValidating: false,
  isCodeModalOpen: false,
  isInspectorOpen: true,
  isTemplateModalOpen: false,
  validationErrors: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    const sourceNode = get().nodes.find((n) => n.id === connection.source);
    let edgeToAdd: any = { ...connection };

    // If source is a router, label the edge with matching condition keyword if present
    if (sourceNode?.data.nodeType === 'router' && sourceNode.data.conditions) {
      const match = sourceNode.data.conditions.find(
        (c) => c.targetNodeId === connection.target
      );
      if (match && match.keyword) {
        edgeToAdd.label = match.keyword;
      }
    }

    set({
      edges: addEdge(edgeToAdd, get().edges),
    });
  },

  selectNode: (id) => {
    set({
      selectedNodeId: id,
      // Automatically open inspector when a node is selected
      ...(id ? { isInspectorOpen: true } : {}),
    });
  },

  updateNodeData: (id, data) => {
    const updatedNodes = get().nodes.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node
    );

    let updatedEdges = get().edges;

    // If updating a router node's conditions, synchronize outgoing edge labels
    const targetNode = updatedNodes.find((n) => n.id === id);
    if (targetNode?.data.nodeType === 'router' && data.conditions !== undefined) {
      const conditions = data.conditions || [];
      updatedEdges = updatedEdges.map((edge) => {
        if (edge.source === id) {
          const matchingCond = conditions.find((c) => c.targetNodeId === edge.target);
          return {
            ...edge,
            label: matchingCond?.keyword || undefined,
          };
        }
        return edge;
      });
    }

    set({
      nodes: updatedNodes,
      edges: updatedEdges,
    });
  },

  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  setGeneratedCode: (code) => set({ generatedCode: code }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setIsValidating: (isValidating) => set({ isValidating }),
  setIsCodeModalOpen: (isOpen) => set({ isCodeModalOpen: isOpen }),
  setIsInspectorOpen: (isOpen) => set({ isInspectorOpen: isOpen }),
  setIsTemplateModalOpen: (isOpen) => set({ isTemplateModalOpen: isOpen }),
  setValidationErrors: (validationErrors) => set({ validationErrors }),

  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
      selectedNodeId: node.id,
      isInspectorOpen: true,
    });
  },

  clearGraph: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      generatedCode: null,
      validationErrors: [],
    });
  },

  loadTemplate: (template) => {
    set({
      agentName: template.name,
      nodes: template.nodes,
      edges: template.edges,
      selectedNodeId: template.nodes[0]?.id ?? null,
      isTemplateModalOpen: false,
      isInspectorOpen: true,
      validationErrors: [],
    });
  },
}));
