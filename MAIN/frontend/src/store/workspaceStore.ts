import { create } from 'zustand';
import { Project, Workflow } from '@/types/workspace';
import {
  fetchProjects,
  createProject as apiCreateProject,
  updateProject as apiUpdateProject,
  deleteProject as apiDeleteProject,
  fetchWorkflows,
  createWorkflow as apiCreateWorkflow,
  saveWorkflow as apiSaveWorkflow,
  deleteWorkflow as apiDeleteWorkflow,
} from '@/lib/workspaceApi';
import { useAuthStore } from '@/store/authStore';
import { useGraphStore } from '@/store/graphStore';
import { toast } from '@/store/toastStore';

interface WorkspaceState {
  projects: Project[];
  activeProject: Project | null;
  workflows: Workflow[];
  activeWorkflow: Workflow | null;
  isLoadingProjects: boolean;
  isWorkspaceModalOpen: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: string | null;

  setIsWorkspaceModalOpen: (isOpen: boolean) => void;
  loadProjects: () => Promise<void>;
  selectProject: (project: Project) => Promise<void>;
  createProject: (name: string) => Promise<Project | null>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  loadWorkflows: (projectId: string) => Promise<void>;
  openWorkflow: (workflow: Workflow) => void;
  createAndOpenWorkflow: (name: string) => Promise<Workflow | null>;
  manualSaveWorkflow: () => Promise<boolean>;
  autoSaveWorkflow: () => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  resetWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projects: [],
  activeProject: null,
  workflows: [],
  activeWorkflow: null,
  isLoadingProjects: false,
  isWorkspaceModalOpen: false,
  isSaving: false,
  saveStatus: 'idle',
  lastSavedAt: null,

  resetWorkspace: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('swarmly_active_project_id');
      localStorage.removeItem('swarmly_active_workflow_id');
    }
    set({
      projects: [],
      activeProject: null,
      workflows: [],
      activeWorkflow: null,
      isLoadingProjects: false,
      isWorkspaceModalOpen: false,
      isSaving: false,
      saveStatus: 'idle',
      lastSavedAt: null,
    });
  },

  setIsWorkspaceModalOpen: (isOpen) => set({ isWorkspaceModalOpen: isOpen }),

  loadProjects: async () => {
    if (get().isLoadingProjects) return;
    const { token, user } = useAuthStore.getState();
    if (!token || !user) return;

    set({ isLoadingProjects: true });
    try {
      const projects = await fetchProjects(token);
      set({ projects, isLoadingProjects: false });

      if (projects.length > 0) {
        const lastProjId = typeof window !== 'undefined' ? localStorage.getItem('swarmly_active_project_id') : null;
        const projectToSelect = projects.find((p) => p.id === lastProjId) || projects[0];
        await get().selectProject(projectToSelect);
      }
    } catch (err: any) {
      set({ isLoadingProjects: false });
      const msg = err?.message || '';
      if (!msg.toLowerCase().includes('unauthorized') && !msg.toLowerCase().includes('expired')) {
        toast.error('Failed to load projects', msg);
      }
    }
  },

  selectProject: async (project) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('swarmly_active_project_id', project.id);
    }
    set({ activeProject: project });
    await get().loadWorkflows(project.id);
  },

  createProject: async (name) => {
    const token = useAuthStore.getState().token;
    if (!token) {
      toast.warning('Sign in required', 'Please sign in with Google to create and save projects.');
      useAuthStore.getState().setIsLoginModalOpen(true);
      return null;
    }

    try {
      const newProj = await apiCreateProject(name, token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('swarmly_active_project_id', newProj.id);
      }
      set((state) => ({
        projects: [newProj, ...state.projects],
        activeProject: newProj,
        workflows: [],
      }));
      toast.success('Project created', `"${name}" is now active.`);
      return newProj;
    } catch (err: any) {
      toast.error('Could not create project', err?.message);
      return null;
    }
  },

  renameProject: async (id, name) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const updated = await apiUpdateProject(id, name, token);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updated : p)),
        activeProject: state.activeProject?.id === id ? updated : state.activeProject,
      }));
      toast.success('Project renamed', `Project name updated to "${name}".`);
    } catch (err: any) {
      toast.error('Could not rename project', err?.message);
    }
  },

  deleteProject: async (id) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      await apiDeleteProject(id, token);
      const remaining = get().projects.filter((p) => p.id !== id);
      set({
        projects: remaining,
        activeProject: remaining.length > 0 ? remaining[0] : null,
        activeWorkflow: null,
      });
      if (remaining.length > 0) {
        get().selectProject(remaining[0]);
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('swarmly_active_project_id');
        localStorage.removeItem('swarmly_active_workflow_id');
      }
      toast.success('Project deleted', 'Project and its workflows were deleted.');
    } catch (err: any) {
      toast.error('Could not delete project', err?.message);
    }
  },

  loadWorkflows: async (projectId) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const workflows = await fetchWorkflows(projectId, token);
      set({ workflows });

      // Automatically restore active workflow on project load
      if (workflows.length > 0) {
        const lastWfId = typeof window !== 'undefined' ? localStorage.getItem('swarmly_active_workflow_id') : null;
        const currentActive = get().activeWorkflow;
        let wfToOpen = workflows.find((w) => w.id === lastWfId);
        if (!wfToOpen && currentActive) {
          wfToOpen = workflows.find((w) => w.id === currentActive.id);
        }
        if (!wfToOpen) {
          wfToOpen = workflows[0];
        }
        get().openWorkflow(wfToOpen);
      } else {
        set({ activeWorkflow: null });
      }
    } catch (err: any) {
      toast.error('Failed to load workflows', err?.message);
    }
  },

  openWorkflow: (workflow) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('swarmly_active_workflow_id', workflow.id);
    }
    const { setNodes, setEdges } = useGraphStore.getState();
    const graph = workflow.graph_json || { nodes: [], edges: [] };

    setNodes(graph.nodes || []);
    setEdges(graph.edges || []);
    useGraphStore.setState({ agentName: workflow.name });

    set({
      activeWorkflow: workflow,
      saveStatus: 'saved',
      lastSavedAt: workflow.updated_at,
      isWorkspaceModalOpen: false,
    });
  },

  createAndOpenWorkflow: async (name) => {
    const token = useAuthStore.getState().token;
    const project = get().activeProject;

    if (!token || !project) {
      toast.warning('Project required', 'Please select or create a project first.');
      return null;
    }

    const { nodes, edges } = useGraphStore.getState();
    const graphJson = { nodes, edges };

    try {
      const newWf = await apiCreateWorkflow(project.id, name, graphJson, token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('swarmly_active_workflow_id', newWf.id);
      }
      set((state) => ({
        workflows: [newWf, ...state.workflows],
        activeWorkflow: newWf,
        saveStatus: 'saved',
        lastSavedAt: newWf.created_at,
        isWorkspaceModalOpen: false,
      }));
      useGraphStore.setState({ agentName: name });
      toast.success('Workflow created', `"${name}" saved to ${project.name}.`);
      return newWf;
    } catch (err: any) {
      toast.error('Failed to create workflow', err?.message);
      return null;
    }
  },

  manualSaveWorkflow: async () => {
    const token = useAuthStore.getState().token;
    const { activeProject, activeWorkflow } = get();
    const { nodes, edges, agentName } = useGraphStore.getState();

    if (!token) {
      toast.warning('Sign in required', 'Please sign in with Google to save your workflows.');
      useAuthStore.getState().setIsLoginModalOpen(true);
      return false;
    }

    // If there is no active project, prompt creating one
    if (!activeProject) {
      set({ isWorkspaceModalOpen: true });
      toast.info('Select a project', 'Create or select a project to save your workflow into.');
      return false;
    }

    set({ isSaving: true, saveStatus: 'saving' });

    try {
      const graphJson = { nodes, edges };
      const workflowName = agentName || 'Untitled Workflow';

      let savedWf: Workflow;

      if (activeWorkflow) {
        // Save existing workflow
        savedWf = await apiSaveWorkflow(activeWorkflow.id, workflowName, graphJson, token);
      } else {
        // Create new workflow in current project
        savedWf = await apiCreateWorkflow(activeProject.id, workflowName, graphJson, token);
      }

      const now = new Date().toLocaleTimeString();
      if (typeof window !== 'undefined') {
        localStorage.setItem('swarmly_active_workflow_id', savedWf.id);
      }
      set((state) => ({
        activeWorkflow: savedWf,
        workflows: state.workflows.some((w) => w.id === savedWf.id)
          ? state.workflows.map((w) => (w.id === savedWf.id ? savedWf : w))
          : [savedWf, ...state.workflows],
        isSaving: false,
        saveStatus: 'saved',
        lastSavedAt: now,
      }));

      toast.success('Workflow saved', `Saved at ${now}.`);
      return true;
    } catch (err: any) {
      set({ isSaving: false, saveStatus: 'error' });
      toast.error('Save failed', err?.message || 'Could not save workflow to backend.');
      return false;
    }
  },

  autoSaveWorkflow: async () => {
    const token = useAuthStore.getState().token;
    const { activeWorkflow } = get();
    if (!token || !activeWorkflow || get().isSaving) return;

    const { nodes, edges, agentName } = useGraphStore.getState();
    const graphJson = { nodes, edges };
    const workflowName = agentName || activeWorkflow.name;

    set({ isSaving: true, saveStatus: 'saving' });
    try {
      const savedWf = await apiSaveWorkflow(activeWorkflow.id, workflowName, graphJson, token);
      const now = new Date().toLocaleTimeString();
      if (typeof window !== 'undefined') {
        localStorage.setItem('swarmly_active_workflow_id', savedWf.id);
      }
      set((state) => ({
        activeWorkflow: savedWf,
        workflows: state.workflows.map((w) => (w.id === savedWf.id ? savedWf : w)),
        isSaving: false,
        saveStatus: 'saved',
        lastSavedAt: now,
      }));
    } catch {
      set({ isSaving: false, saveStatus: 'error' });
    }
  },

  deleteWorkflow: async (id) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      await apiDeleteWorkflow(id, token);
      set((state) => ({
        workflows: state.workflows.filter((w) => w.id !== id),
        activeWorkflow: state.activeWorkflow?.id === id ? null : state.activeWorkflow,
      }));
      toast.success('Workflow deleted', 'Workflow removed from project.');
    } catch (err: any) {
      toast.error('Could not delete workflow', err?.message);
    }
  },
}));
