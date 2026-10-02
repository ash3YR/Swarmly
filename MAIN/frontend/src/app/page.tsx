'use client';
import { Header } from '@/components/Header';
import { NodePalette } from '@/components/NodePalette';
import { Canvas } from '@/components/Canvas';
import { ConfigPanel } from '@/components/ConfigPanel';
import { CodeModal } from '@/components/CodeModal';

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <NodePalette />
        <div className="flex-1 relative">
          <Canvas />
        </div>
        <ConfigPanel />
      </div>
      <CodeModal />
    </div>
  );
}
