import { Node } from '@xyflow/react';
import { NodeType, NodeData } from '@/types/graph';

let idCounter = 1;

export function getUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${idCounter++}`;
}

export const DEFAULT_LABELS: Record<NodeType, string> = {
  llm_agent: 'LLM Agent',
  tool: 'Tool',
  router: 'Router',
};

export function createDefaultNode(
  type: NodeType,
  position: { x: number; y: number },
  customLabel?: string
): Node<NodeData> {
  const id = getUniqueId(type);

  let initialData: NodeData;

  switch (type) {
    case 'llm_agent':
      initialData = {
        label: customLabel || DEFAULT_LABELS.llm_agent,
        nodeType: 'llm_agent',
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        systemPrompt: '',
      };
      break;

    case 'tool':
      initialData = {
        label: customLabel || DEFAULT_LABELS.tool,
        nodeType: 'tool',
        toolName: 'tavily_search',
      };
      break;

    case 'router':
      initialData = {
        label: customLabel || DEFAULT_LABELS.router,
        nodeType: 'router',
        conditions: [],
      };
      break;
  }

  return {
    id,
    type,
    position,
    data: initialData,
  };
}
