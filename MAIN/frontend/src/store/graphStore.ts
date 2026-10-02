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
} from '@xyflow/react';
import { NodeData } from '@/types/graph';

interface GraphState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  agentName: string;
  generatedCode: string | null;
  isGenerating: boolean;
  isCodeModalOpen: boolean;

  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange<Node<NodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  selectNode: (id: string | null) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  setGeneratedCode: (code: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setIsCodeModalOpen: (isOpen: boolean) => void;
  addNode: (node: Node<NodeData>) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  agentName: 'My Agent',
  generatedCode: null,
  isGenerating: false,
  isCodeModalOpen: false,

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
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  },

  setGeneratedCode: (code) => set({ generatedCode: code }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setIsCodeModalOpen: (isOpen) => set({ isCodeModalOpen: isOpen }),

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },
}));
