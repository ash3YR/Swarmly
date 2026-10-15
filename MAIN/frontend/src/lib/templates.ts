import { Node, Edge } from '@xyflow/react';
import { NodeData } from '@/types/graph';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  badge: string;
  icon: string;
  flowPreview: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
}

export const STARTER_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'research_agent',
    name: 'Research Agent',
    description: 'Autonomous research loop using web search with standard LangGraph ToolNode execution.',
    badge: 'Agent + Tool',
    icon: 'Brain',
    flowPreview: 'Researcher ⇄ Tavily Search',
    nodes: [
      {
        id: 'agent_researcher',
        type: 'llm_agent',
        position: { x: 250, y: 100 },
        data: {
          label: 'Research Agent',
          nodeType: 'llm_agent',
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7,
          systemPrompt:
            'You are an expert research analyst. Formulate queries, search for reliable data, and synthesize clear factual answers.',
        },
      },
      {
        id: 'tool_search',
        type: 'tool',
        position: { x: 250, y: 320 },
        data: {
          label: 'Web Search',
          nodeType: 'tool',
          toolName: 'tavily_search',
        },
      },
    ],
    edges: [
      {
        id: 'edge_researcher_to_tool',
        source: 'agent_researcher',
        target: 'tool_search',
      },
      {
        id: 'edge_tool_to_researcher',
        source: 'tool_search',
        target: 'agent_researcher',
      },
    ],
  },
  {
    id: 'research_to_writer',
    name: 'Research to Writer',
    description: 'Two-stage pipeline: deep research synthesized by an editorial writer agent.',
    badge: 'Sequential Pipeline',
    icon: 'Sparkles',
    flowPreview: 'Researcher → Writer',
    nodes: [
      {
        id: 'agent_researcher',
        type: 'llm_agent',
        position: { x: 250, y: 100 },
        data: {
          label: 'Researcher',
          nodeType: 'llm_agent',
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.5,
          systemPrompt:
            'Conduct comprehensive research and provide bulleted findings with citations.',
        },
      },
      {
        id: 'agent_writer',
        type: 'llm_agent',
        position: { x: 250, y: 320 },
        data: {
          label: 'Editorial Writer',
          nodeType: 'llm_agent',
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          systemPrompt:
            'Transform raw research findings into an engaging, publication-ready article.',
        },
      },
    ],
    edges: [
      {
        id: 'edge_researcher_to_writer',
        source: 'agent_researcher',
        target: 'agent_writer',
      },
    ],
  },
  {
    id: 'supervisor_workers',
    name: 'Supervisor with Workers',
    description: 'Supervisor routing tasks dynamically to specialized Worker agents via conditional branching.',
    badge: 'Conditional Router',
    icon: 'GitBranch',
    flowPreview: 'Supervisor → Router → [Coder | Researcher]',
    nodes: [
      {
        id: 'agent_supervisor',
        type: 'llm_agent',
        position: { x: 280, y: 80 },
        data: {
          label: 'Supervisor',
          nodeType: 'llm_agent',
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.2,
          systemPrompt:
            'You are a team supervisor. Review the objective and route to the appropriate specialist: write "code" for technical tasks, or "research" for factual questions.',
        },
      },
      {
        id: 'router_director',
        type: 'router',
        position: { x: 280, y: 260 },
        data: {
          label: 'Task Router',
          nodeType: 'router',
          conditions: [
            {
              keyword: 'code',
              targetNodeId: 'worker_coder',
            },
            {
              keyword: 'research',
              targetNodeId: 'worker_researcher',
            },
          ],
        },
      },
      {
        id: 'worker_coder',
        type: 'llm_agent',
        position: { x: 100, y: 460 },
        data: {
          label: 'Coding Specialist',
          nodeType: 'llm_agent',
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.3,
          systemPrompt: 'You are an expert software engineer. Implement clean, robust code.',
        },
      },
      {
        id: 'worker_researcher',
        type: 'llm_agent',
        position: { x: 460, y: 460 },
        data: {
          label: 'Research Specialist',
          nodeType: 'llm_agent',
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.6,
          systemPrompt: 'You are an expert research analyst. Provide deep factual analysis.',
        },
      },
    ],
    edges: [
      {
        id: 'edge_supervisor_to_router',
        source: 'agent_supervisor',
        target: 'router_director',
      },
      {
        id: 'edge_router_to_coder',
        source: 'router_director',
        target: 'worker_coder',
        label: 'code',
      },
      {
        id: 'edge_router_to_researcher',
        source: 'router_director',
        target: 'worker_researcher',
        label: 'research',
      },
    ],
  },
];
