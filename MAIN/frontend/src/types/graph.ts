export type NodeType = 'llm_agent' | 'tool' | 'router';
export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'ollama';
export type ToolName = 'tavily_search' | 'wikipedia' | 'calculator' | 'python_repl';

export interface NodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  // LLM fields
  provider?: LLMProvider;
  model?: string;
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  // Tool fields
  toolName?: ToolName;
  toolApiKey?: string;
  // Router fields
  conditions?: RouterCondition[];
}

export interface RouterCondition {
  keyword: string;
  targetNodeId: string;
}

export interface GenerateRequest {
  agent_name: string;
  nodes: Array<{id: string; type: NodeType; label: string; provider?: LLMProvider; model?: string; api_key?: string; system_prompt?: string; temperature?: number; tool_name?: ToolName; tool_api_key?: string; conditions?: Array<{keyword: string; target_node_id: string}>}>;
  edges: Array<{source: string; target: string; label?: string}>;
}

export interface GenerateResponse {
  code: string;
  agent_name: string;
  node_count: number;
  edge_count: number;
}
