'use client';
/**
 * @file page.tsx
 * @description Root application view for Swarmly Visual Multi-Agent IDE.
 * Implements:
 * - Optional Guest Access (explore editor, add/connect nodes, templates, validation, generate Python)
 * - Cloud Persistence (requires Google authentication, protects Supabase data)
 * - Restrained Dark Navy / Slate / Stone IDE layout
 * - Inter and JetBrains Mono typography
 */
import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Loader2 } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { WorkspaceSidebar } from '@/components/WorkspaceSidebar';
import { Canvas } from '@/components/Canvas';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { CanvasStatusBar } from '@/components/CanvasStatusBar';
import { NewProjectModal } from '@/components/NewProjectModal';
import { NewWorkflowModal } from '@/components/NewWorkflowModal';
import { CodeModal } from '@/components/CodeModal';
import { TemplateModal } from '@/components/TemplateModal';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { ToastContainer } from '@/components/Toast';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaceStore } from '@/store/workspaceStore';

export default function Home() {
  const { user, isGuest, isLoading, initAuth } = useAuthStore();
  const { loadProjects } = useWorkspaceStore();

  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewWorkflowOpen, setIsNewWorkflowOpen] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = initAuth();
    return () => {
      unsubscribe();
    };
  }, [initAuth]);

  // State 0: Wait for client mount to avoid hydration mismatch
  if (!mounted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          background: '#0B1117',
        }}
      />
    );
  }

  // State 1: Session resolution loading barrier
  if (isLoading && !isGuest) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          background: '#0B1117',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          color: '#8B98A5',
          fontFamily: 'var(--font-mono), monospace',
        }}
      >
        <Loader2 size={24} className="animate-spin text-[#8FA8BB]" />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#8B98A5', letterSpacing: '0.05em' }}>
          INITIALIZING SWARMLY IDE…
        </span>
      </div>
    );
  }

  // State 2: Unauthenticated entry gate (if neither logged in nor guest)
  if (!user && !isGuest) {
    return (
      <>
        <WelcomeScreen />
        <ToastContainer />
      </>
    );
  }

  // State 3: Visual Developer IDE Shell (Authenticated or Guest Mode)
  return (
    <ReactFlowProvider>
      <div
        className="animate-fade-in"
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          background: '#0B1117',
          overflow: 'hidden',
        }}
      >
        {/* IDE Top Bar (42px) */}
        <TopBar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        {/* Central Workspace: Sidebar + Canvas + Inspector */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Persistent Collapsible Sidebar */}
          <WorkspaceSidebar
            isOpen={isSidebarOpen}
            onOpenNewProject={() => setIsNewProjectOpen(true)}
            onOpenNewWorkflow={(projId) => {
              setTargetProjectId(projId);
              setIsNewWorkflowOpen(true);
            }}
          />

          {/* Central Visual Canvas */}
          <div
            style={{
              flex: 1,
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Canvas />
          </div>

          {/* Docked Inspector Properties Panel */}
          <PropertiesPanel />
        </div>

        {/* IDE Bottom Status Bar (26px) */}
        <CanvasStatusBar />

        {/* Focused Modal Dialogs */}
        <NewProjectModal
          isOpen={isNewProjectOpen}
          onClose={() => setIsNewProjectOpen(false)}
        />

        <NewWorkflowModal
          isOpen={isNewWorkflowOpen}
          onClose={() => setIsNewWorkflowOpen(false)}
          targetProjectId={targetProjectId}
        />

        {/* LangGraph Python Code Modal */}
        <CodeModal />

        {/* Workflow Starter Templates Modal */}
        <TemplateModal />

        {/* Friendly Guest Sign-In Prompt Modal */}
        <AuthPromptModal />

        {/* Global Notifications */}
        <ToastContainer />
      </div>
    </ReactFlowProvider>
  );
}
