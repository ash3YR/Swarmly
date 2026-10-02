'use client';
/**
 * @file page.tsx
 * @description Root page — Excalidraw-style layout.
 *
 * Architecture:
 * - Canvas fills the full viewport (position: fixed, z-index: 0).
 * - Toolbar, PropertiesPanel, CodeModal all float OVER the canvas.
 * - No header bar, no sidebars — just canvas + floating UI.
 *
 * The old {Header + NodePalette + Canvas + ConfigPanel} row layout is gone.
 * Everything is now positionally independent, stacked by z-index.
 */
import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { CodeModal } from '@/components/CodeModal';

export default function Home() {
  return (
    <>
      {/* z-index: 0 — canvas is the ground layer */}
      <Canvas />

      {/* z-index: 100 — floating top-center toolbar */}
      <Toolbar />

      {/* z-index: 90 — floating left-side properties panel */}
      <PropertiesPanel />

      {/* z-index: 200 — code modal overlays everything */}
      <CodeModal />
    </>
  );
}
