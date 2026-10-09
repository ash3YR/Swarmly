import { Project, Workflow } from '@/types/workspace';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data.detail || fallback;
  } catch {
    return fallback;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function coordinateSessionRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session?.access_token) {
        useAuthStore.getState().setSession(data.session);
        return data.session.access_token;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function requestWithAuth(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null,
  retry = true
): Promise<Response> {
  const currentToken = token ?? useAuthStore.getState().token;
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const newToken = await coordinateSessionRefresh();
    if (newToken) {
      // Retry exactly once with refreshed token
      return requestWithAuth(endpoint, options, newToken, false);
    } else {
      // Refresh failed: session is truly invalid
      useAuthStore.getState().handleSessionExpired();
    }
  }

  return res;
}


export async function fetchProjects(token?: string | null): Promise<Project[]> {
  const res = await requestWithAuth('/api/projects', { method: 'GET' }, token);
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to load projects');
    throw new Error(msg);
  }
  return res.json();
}

export async function createProject(name: string, token?: string | null): Promise<Project> {
  const res = await requestWithAuth(
    '/api/projects',
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    },
    token
  );
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to create project');
    throw new Error(msg);
  }
  return res.json();
}

export async function updateProject(id: string, name: string, token?: string | null): Promise<Project> {
  const res = await requestWithAuth(
    `/api/projects/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    },
    token
  );
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to update project');
    throw new Error(msg);
  }
  return res.json();
}

export async function deleteProject(id: string, token?: string | null): Promise<void> {
  const res = await requestWithAuth(
    `/api/projects/${id}`,
    {
      method: 'DELETE',
    },
    token
  );
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to delete project');
    throw new Error(msg);
  }
}

export async function fetchWorkflows(projectId: string, token?: string | null): Promise<Workflow[]> {
  const res = await requestWithAuth(`/api/projects/${projectId}/workflows`, { method: 'GET' }, token);
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to load workflows');
    throw new Error(msg);
  }
  return res.json();
}

export async function createWorkflow(
  projectId: string,
  name: string,
  graphJson: { nodes: any[]; edges: any[] },
  token?: string | null
): Promise<Workflow> {
  const res = await requestWithAuth(
    `/api/projects/${projectId}/workflows`,
    {
      method: 'POST',
      body: JSON.stringify({ name, graph_json: graphJson }),
    },
    token
  );
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to create workflow');
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchWorkflow(workflowId: string, token?: string | null): Promise<Workflow> {
  const res = await requestWithAuth(`/api/workflows/${workflowId}`, { method: 'GET' }, token);
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to load workflow');
    throw new Error(msg);
  }
  return res.json();
}

export async function saveWorkflow(
  workflowId: string,
  name: string,
  graphJson: { nodes: any[]; edges: any[] },
  token?: string | null
): Promise<Workflow> {
  const res = await requestWithAuth(
    `/api/workflows/${workflowId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ name, graph_json: graphJson }),
    },
    token
  );
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to save workflow');
    throw new Error(msg);
  }
  return res.json();
}

export async function deleteWorkflow(workflowId: string, token?: string | null): Promise<void> {
  const res = await requestWithAuth(
    `/api/workflows/${workflowId}`,
    {
      method: 'DELETE',
    },
    token
  );
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to delete workflow');
    throw new Error(msg);
  }
}
