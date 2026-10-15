import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { toast } from '@/store/toastStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useGraphStore } from '@/store/graphStore';

const PRESERVED_WORKFLOW_KEY = 'swarmly_preserved_workflow';
const GUEST_SESSION_KEY = 'swarmly_guest_session';

interface AuthState {
  user: User | null;
  session: Session | null;
  token: string | null;
  isGuest: boolean;
  isLoading: boolean;
  isLoginModalOpen: boolean;
  isAuthPromptOpen: boolean;

  setIsLoginModalOpen: (isOpen: boolean) => void;
  setIsAuthPromptOpen: (isOpen: boolean) => void;
  setSession: (session: Session | null) => void;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  cacheGuestWorkflowForAuth: () => void;
  restorePreservedWorkflow: () => boolean;
  signInWithGoogle: () => Promise<void>;
  signInDevDemo: () => void;
  signOut: () => Promise<void>;
  handleSessionExpired: () => void;
  initAuth: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  token: null,
  isGuest: typeof window !== 'undefined' ? sessionStorage.getItem(GUEST_SESSION_KEY) === 'true' : false,
  isLoading: true,
  isLoginModalOpen: false,
  isAuthPromptOpen: false,

  setIsLoginModalOpen: (isLoginModalOpen) => set({ isLoginModalOpen }),
  setIsAuthPromptOpen: (isAuthPromptOpen) => set({ isAuthPromptOpen }),

  enterGuestMode: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(GUEST_SESSION_KEY, 'true');
    }
    set({ isGuest: true, isLoading: false });
    toast.info('Guest Mode', 'Exploring Swarmly IDE as guest. Sign in anytime to save your work to the cloud.');
  },

  exitGuestMode: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
    }
    set({ isGuest: false });
  },

  cacheGuestWorkflowForAuth: () => {
    try {
      const { nodes, edges, agentName } = useGraphStore.getState();
      if (nodes && nodes.length > 0) {
        localStorage.setItem(
          PRESERVED_WORKFLOW_KEY,
          JSON.stringify({ nodes, edges, agentName })
        );
      }
    } catch {
      // storage unavailable
    }
  },

  restorePreservedWorkflow: () => {
    try {
      const cached = localStorage.getItem(PRESERVED_WORKFLOW_KEY);
      if (!cached) return false;

      const data = JSON.parse(cached);
      if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
        useGraphStore.getState().setNodes(data.nodes);
        useGraphStore.getState().setEdges(data.edges || []);
        if (data.agentName) {
          useGraphStore.setState({ agentName: data.agentName });
        }
        localStorage.removeItem(PRESERVED_WORKFLOW_KEY);
        toast.success(
          'Workflow restored',
          `Restored your draft "${data.agentName || 'workflow'}" ready to save to your cloud workspace.`
        );
        return true;
      }
    } catch {
      localStorage.removeItem(PRESERVED_WORKFLOW_KEY);
    }
    return false;
  },

  setSession: (session) => {
    if (session?.user && typeof window !== 'undefined') {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
    }
    set({
      session,
      user: session?.user ?? null,
      token: session?.access_token ?? null,
      isGuest: session?.user ? false : get().isGuest,
      isLoading: false,
    });
    if (session?.user) {
      get().restorePreservedWorkflow();
    }
  },

  handleSessionExpired: () => {
    // Only act if there was an active user/token to avoid false toasts in guest mode
    if (!get().user && !get().token) return;

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
    }
    set({ user: null, session: null, token: null, isGuest: false, isLoading: false });
    useWorkspaceStore.getState().resetWorkspace();
    useGraphStore.getState().clearGraph();
    toast.warning('Session expired', 'Your session has expired. Please sign in again.');
  },

  signInWithGoogle: async () => {
    // Preserve any existing guest work before navigating to Google OAuth
    get().cacheGuestWorkflowForAuth();

    if (!isSupabaseConfigured) {
      toast.warning(
        'Supabase not configured',
        'Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
      );
      return;
    }

    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        toast.error('Google Sign-In failed', error.message);
      }
    } catch (err: any) {
      toast.error('Authentication error', err?.message || 'Could not initiate Google sign in.');
    }
  },

  signInDevDemo: () => {
    get().cacheGuestWorkflowForAuth();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
    }

    const devUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'developer@swarmly.dev',
      app_metadata: {},
      user_metadata: { name: 'Lead Architect' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;

    set({
      user: devUser,
      token: 'demo-dev-token',
      session: null,
      isGuest: false,
      isLoading: false,
    });
    get().restorePreservedWorkflow();
    toast.info('Developer Mode', 'Logged in as developer@swarmly.dev for local IDE testing.');
  },

  signOut: async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(GUEST_SESSION_KEY);
      }
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      console.error('Sign out error:', err);
    } finally {
      set({ user: null, session: null, token: null, isGuest: false, isLoading: false });
      useWorkspaceStore.getState().resetWorkspace();
      useGraphStore.getState().clearGraph();
      toast.success('Signed out', 'You have been signed out successfully.');
    }
  },

  initAuth: () => {
    if (!isSupabaseConfigured) {
      set({ isLoading: false });
      return () => {};
    }

    // 1. Immediately check getSession to restore session from storage on reload
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session?.user) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(GUEST_SESSION_KEY);
        }
        set({
          session,
          user: session.user,
          token: session.access_token,
          isGuest: false,
          isLoading: false,
        });
        get().restorePreservedWorkflow();
        useWorkspaceStore.getState().loadProjects();
      } else {
        set({ isLoading: false });
      }
    });

    // 2. Listen for subsequent auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(GUEST_SESSION_KEY);
        }
        const previousUserId = get().user?.id;
        set({
          session,
          user: session.user,
          token: session.access_token,
          isGuest: false,
          isLoading: false,
        });

        // Do not reload projects if it's just a background token refresh
        if (event === 'TOKEN_REFRESHED') {
          return;
        }

        // On explicit sign-in or user identity switch, restore draft and load projects
        if (event === 'SIGNED_IN' || session.user.id !== previousUserId) {
          get().restorePreservedWorkflow();
          useWorkspaceStore.getState().loadProjects();
        }
      } else if (event === 'SIGNED_OUT') {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(GUEST_SESSION_KEY);
        }
        set({
          session: null,
          user: null,
          token: null,
          isGuest: false,
          isLoading: false,
        });
        useWorkspaceStore.getState().resetWorkspace();
        useGraphStore.getState().clearGraph();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },
}));
