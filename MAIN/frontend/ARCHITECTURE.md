# Swarmly — Frontend Architecture & Design Decisions

> **What this document covers**: Every major technical and UX decision in the Next.js frontend.

---

## 1. Why Next.js (not plain React/Vite)?

- App Router (Next.js 14) gives us file-based routing, layouts, and server components out of the box
- `'use client'` directive lets us be explicit about which components are interactive — enforces good discipline
- Production deployment is trivial (Vercel, self-hosted, Docker) — one command
- Future: Next.js API routes can act as a BFF (Backend-for-Frontend) if we need to proxy API calls or handle auth

For this Phase 1, most components are `'use client'` since the canvas is fully interactive. Server components will matter more in later phases (dashboard, agent list).

---

## 2. Why ReactFlow (`@xyflow/react`)?

Three canvas libraries were evaluated:

| Library | Reason for/against |
|---|---|
| **@xyflow/react** (ReactFlow v12) | ? Best DX, rich node/edge API, handles drag+drop, selection, zoom, minimap |
| D3.js | ? Too low-level — we'd rebuild what ReactFlow already provides |
| Cytoscape.js | ? More suited to graph analysis, not interactive builders |

ReactFlow is battle-tested in production tools (Retool, Langflow, Flowise). It's the right tool.

**Important**: We use `@xyflow/react` (v12 package name), NOT the old `reactflow` package. v12 introduced the `useReactFlow` hook for `screenToFlowPosition` which we rely on for drop positioning.

---

## 3. State Management — Why Zustand?

- The canvas state (nodes, edges, selected node, generated code) needs to be shared across 4+ components (Canvas, ConfigPanel, Header, CodeModal)
- Redux: too much boilerplate for our use case
- React Context: fine for simple state, but re-renders the entire tree on every change — bad for a canvas with potentially 50+ nodes
- Zustand: minimal API, surgical re-renders (components only re-render when their subscribed slice changes), no providers needed
- Works perfectly with ReactFlow's `applyNodeChanges` and `applyEdgeChanges` helpers

---

## 4. Visual Design Decisions

### Dark Theme

**Why dark?** Visual graph builder tools are almost universally dark-themed (n8n, Langflow, Flowise, ComfyUI). Reasons:
1. High contrast makes the graph edges (connections) stand out clearly
2. Reduces eye strain during long usage sessions
3. Matches the "developer tool" aesthetic the target users expect

Color palette:
- `zinc-950` canvas background (near-black, not pure black — easier on eyes)
- `zinc-900` panels and node backgrounds
- `zinc-800` borders
- `indigo-500/600` for LLM nodes and primary actions (associated with AI/intelligence)
- `emerald-500` for Tool nodes (green = "do something")
- `amber-500` for Router nodes (amber = "decision/warning")

### Node Design

Each node is a card with:
- Colored left border / top accent (not the whole background — avoids being garish)
- Icon + label for quick identification
- Small badge showing the node type
- ReactFlow handles styled as indigo dots

Nodes are intentionally compact (`min-w-[160px]`) to allow dense graphs on screen.

### Config Panel (Slide-in, not Modal)

**Decision**: Config panel slides in from the right rather than opening a modal.

**Why?**
- A modal blocks the entire canvas — you lose context of the graph while configuring
- A slide-in panel lets you see the node you're editing in context of its neighbors
- This is the pattern used by Figma, Webflow, n8n — it's the industry standard for property editors

---

## 5. Drag-and-Drop Implementation

**How it works**:
1. Palette card sets `event.dataTransfer.setData('application/reactflow-type', nodeType)` on drag start
2. Canvas listens to `onDragOver` (prevents default to allow drop) and `onDrop`
3. On drop: read the node type from dataTransfer, use `screenToFlowPosition(event.clientX, event.clientY)` to convert screen coordinates to canvas coordinates, create a new node, dispatch to store
4. Node IDs: `${nodeType}-${Date.now()}` — simple, unique enough for a client-side app with no DB

**Why `application/reactflow-type` as the dataTransfer key?**
- Namespaced to avoid collisions with browser or OS drag events
- Convention used in ReactFlow's own documentation examples

---

## 6. Code Display — Syntax Highlighting

**Library**: `react-syntax-highlighter` with `atomOneDark` theme.

**Why not a code editor (Monaco/CodeMirror)?**
- The generated code is **read-only** — users copy it, not edit it in the browser
- Monaco/CodeMirror would add ~500KB to the bundle for a feature we don't need
- `react-syntax-highlighter` is lightweight and renders correctly on all browsers

---

## 7. API Communication

**Design**: Simple `fetch` wrapper in `src/lib/api.ts`. No SDK, no React Query (yet).

**Why no React Query?**
- We have exactly ONE API call (generate code). React Query is overkill.
- Add it in Phase 2 when we have: agent list (GET), save (POST), delete (DELETE) — caching and background refetching will matter then.

---

## 8. TypeScript Strictness

All types are defined in `src/types/graph.ts` as the single source of truth. The same type names mirror the Pydantic models on the backend:
- `NodeType` ? `NodeType` (Python Enum)
- `LLMProvider` ? `LLMProvider` (Python Enum)
- `GenerateRequest` ? `GraphRequest` (Pydantic model)

This makes frontend/backend contract changes easy to spot and fix.

---

## 9. What We Deliberately Left Out (and Why)

| Feature | Status | Reason |
|---|---|---|
| Auth / Login | Phase 4 | Adds friction before users experience value |
| Database | Phase 2 | Nothing to save yet (no deployment) |
| Agent execution | Phase 3 | Requires sandboxing and execution engine |
| Undo/Redo | Phase 2 | ReactFlow supports it via `useNodesState` history |
| Collaborative editing | Phase 5 | Needs WebSocket + CRDT |
| Mobile support | Later | Complex graph editing on mobile is a UX problem |
