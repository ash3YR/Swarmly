export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  workflow_count?: number;
}

export interface Workflow {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  graph_json: {
    nodes: any[];
    edges: any[];
  };
  created_at: string;
  updated_at: string;
}
