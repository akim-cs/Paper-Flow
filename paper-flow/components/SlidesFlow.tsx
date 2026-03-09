'use client';

import { useMemo, useEffect, useCallback, useRef, useState, type ComponentType, type ReactNode } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Position,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import type { Slide, PresentationConfig, Sections } from '../app/types/slides';
import {
  slidesToFlowNodes,
  NODE_WIDTH,
  NODE_WIDTH_EXPANDED,
  HORIZONTAL_GAP,
} from '../app/lib/slidesToFlowNodes';
import { downloadSlidesAsPptx } from '../app/lib/export/slidesToPptx';
import SlideNode from './SlideNode';
import TranscriptPanel from './TranscriptPanel';

const nodeTypes: Record<string, ComponentType<any>> = {
  slideNode: SlideNode,
};

// ─── Initial viewport tuning ──────────────────────────────────────────────────
// Adjust these if you want more or fewer nodes visible at startup.
const FIT_ALL_THRESHOLD = 6;   // 1–N nodes: show the full graph
const VISIBLE_NODES_MEDIUM = 6; // 7–10 nodes: show this many from the start
const VISIBLE_NODES_LARGE = 5;  // 11+ nodes: show this many from the start
// ──────────────────────────────────────────────────────────────────────────────

function HelpPopoverItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5 items-start">
      <span className="text-paper-flow-border mt-0.5 shrink-0">•</span>
      <span className="text-sm text-paper-flow-text/90">{children}</span>
    </li>
  );
}

const kbdClass =
  'rounded border border-paper-flow-border bg-paper-flow-canvas-solid/50 px-1.5 py-0.5 font-mono text-xs';

type Props = {
  slides: Slide[];
  onSlidesChange?: (slides: Slide[]) => void;
  config?: PresentationConfig;
  sections?: Sections;
};

function nodesToOrderedSlides(nodes: Node[]): Slide[] {
  const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
  return sorted.map((node, index) => {
    const slide: Slide = {
      id: (node.id as string) ?? `slide-${index}`,
      title: (node.data.title as string) ?? (node.data.label as string) ?? '',
      est_time: (node.data.est_time as number) ?? 2,
      contentMarkdown: (node.data.contentMarkdown as string) ?? '',
    };

    // Only include optional fields if present (Firebase doesn't allow undefined)
    if (node.data.transcript) slide.transcript = node.data.transcript as string;
    if (node.data.source_section) slide.source_section = node.data.source_section as Slide['source_section'];
    if (node.data.paper_heading) slide.paper_heading = node.data.paper_heading as string;
    if (node.data.bulletSources) slide.bulletSources = node.data.bulletSources as Slide['bulletSources'];

    return slide;
  });
}

function xAfter(node: Node): number {
  return node.position.x + NODE_WIDTH + HORIZONTAL_GAP;
}

function xBetween(prev: Node, next: Node): number {
  return (prev.position.x + next.position.x) / 2;
}

function applyExpandLayout(nodes: Node[], expandedNodeIds: Set<string>): Node[] {
  const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
  let x = 0;
  const y = 100;
  return sorted.map((node) => {
    const width = expandedNodeIds.has(node.id) ? NODE_WIDTH_EXPANDED : NODE_WIDTH;
    const position = { x, y };
    x += width + HORIZONTAL_GAP;
    return { ...node, position };
  });
}

export default function SlidesFlow({ slides, onSlidesChange, config, sections }: Props) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => slidesToFlowNodes(slides),
    [slides]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodesRef = useRef(nodes);
  const insertIdRef = useRef(0);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());

  // Stored React Flow instance — used for the "Fit All" button
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfInstanceRef = useRef<ReactFlowInstance<any, any> | null>(null);

  // Initial fitView options: for small graphs show everything; for larger graphs
  // fit only the first N nodes so the canvas stays readable on load.
  const fitViewOptions = useMemo(() => {
    const n = initialNodes.length;
    if (n <= FIT_ALL_THRESHOLD) {
      return { padding: 0.15 };
    }
    const visibleCount = n <= 10 ? VISIBLE_NODES_MEDIUM : VISIBLE_NODES_LARGE;
    return {
      padding: 0.15,
      nodes: initialNodes.slice(0, visibleCount).map((node) => ({ id: node.id })),
    };
  }, [initialNodes]);

  const handleFitAll = useCallback(() => {
    rfInstanceRef.current?.fitView({ padding: 0.1, duration: 400 });
  }, []);

  // Transcript panel state
  const [transcriptPanelState, setTranscriptPanelState] = useState<{
    isOpen: boolean;
    activeSlideId: string | null;
    generatingSlideId: string | null;
  }>({
    isOpen: false,
    activeSlideId: null,
    generatingSlideId: null,
  });

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    if (initialNodes.length === 0) {
      setNodes([]);
      setEdges(initialEdges);
      return;
    }

    const current = nodesRef.current;

    const sortedCurrent = [...current].sort(
      (a, b) => a.position.x - b.position.x || a.id.localeCompare(b.id)
    );

    // Base merge on sortedCurrent.length so we never produce duplicate ids when
    // parent still has more slides (e.g. after insert then delete).
    const merged = [
      ...initialNodes.slice(0, sortedCurrent.length).map((fromParent, i) => ({
        ...fromParent,
        id: sortedCurrent[i].id,
      })),
      ...sortedCurrent.slice(initialNodes.length),
    ];

    const layouted = applyExpandLayout(merged, expandedNodeIds);

    const newEdges: Edge[] = layouted.slice(0, -1).map((n, i) => ({
      id: `e-${n.id}-${layouted[i + 1].id}`,
      source: n.id,
      target: layouted[i + 1].id,
      markerEnd: { type: MarkerType.ArrowClosed },
    }));

    setNodes(layouted);
    setEdges(newEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges, expandedNodeIds]);

  useEffect(() => {
    setNodes((prev) => (prev.length === 0 ? prev : applyExpandLayout(prev, expandedNodeIds)));
  }, [expandedNodeIds, setNodes]);

  const handleExpandChange = useCallback((nodeId: string, expanded: boolean) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(nodeId);
      else next.delete(nodeId);
      return next;
    });
  }, []);

  const handleTitleChange = useCallback((nodeId: string, title: string) => {
    setNodes((prev) => {
      const updated = prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, title, label: title } } : n
      );
      if (onSlidesChange) {
        setTimeout(() => onSlidesChange(nodesToOrderedSlides(updated)), 0);
      }
      return updated;
    });
  }, [setNodes, onSlidesChange]);

  const handleContentChange = useCallback((nodeId: string, contentMarkdown: string) => {
    setNodes((prev) => {
      const updated = prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, contentMarkdown } } : n
      );
      if (onSlidesChange) {
        setTimeout(() => onSlidesChange(nodesToOrderedSlides(updated)), 0);
      }
      return updated;
    });
  }, [setNodes, onSlidesChange]);

  const handleDelete = useCallback(
    (nodeId: string) => {
      const currentNodes = nodesRef.current;
      const without = currentNodes.filter((n) => n.id !== nodeId);

      if (without.length === 0) {
        setNodes([]);
        setEdges([]);
        setExpandedNodeIds((prev) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
        if (onSlidesChange) onSlidesChange([]);
        return;
      }

      const sorted = [...without].sort(
        (a, b) => a.position.x - b.position.x || a.id.localeCompare(b.id)
      );

      const layouted = applyExpandLayout(sorted, expandedNodeIds);

      const newEdgeList: Edge[] = layouted.slice(0, -1).map((n, i) => ({
        id: `e-${n.id}-${layouted[i + 1].id}`,
        source: n.id,
        target: layouted[i + 1].id,
        markerEnd: { type: MarkerType.ArrowClosed },
      }));

      setExpandedNodeIds((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });

      setNodes(layouted);
      setEdges(newEdgeList);

      if (onSlidesChange) {
        setTimeout(() => onSlidesChange(nodesToOrderedSlides(layouted)), 0);
      }
    },
    [expandedNodeIds, setNodes, setEdges, onSlidesChange]
  );

  const handleInsertAfter = useCallback(
    (nodeId: string) => {
      const currentNodes = nodesRef.current;
      const sorted = [...currentNodes].sort(
        (a, b) => a.position.x - b.position.x || a.id.localeCompare(b.id)
      );
      const index = sorted.findIndex((n) => n.id === nodeId);
      if (index === -1) return;

      // const newSlide: Slide = { title: '', est_time: 0, contentMarkdown: '' };
      const newId = `slide-insert-${++insertIdRef.current}`;
      const isLast = index === sorted.length - 1;
      const newX = isLast ? xAfter(sorted[index]) : xBetween(sorted[index], sorted[index + 1]);

      const newNode: Node = {
        id: newId,
        type: 'slideNode',
        position: { x: newX, y: 100 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: '',
          title: '',
          est_time: 2,
          contentMarkdown: '',
        },
      };

      const withNew = [...sorted, newNode];
      const layouted = applyExpandLayout(withNew, expandedNodeIds);

      const newEdgeList: Edge[] = layouted.slice(0, -1).map((n, i) => ({
        id: `e-${n.id}-${layouted[i + 1].id}`,
        source: n.id,
        target: layouted[i + 1].id,
        markerEnd: { type: MarkerType.ArrowClosed },
      }));

      setNodes(layouted);
      setEdges(newEdgeList);

      if (onSlidesChange) {
        setTimeout(() => onSlidesChange(nodesToOrderedSlides(layouted)), 0);
      }
    },
    [expandedNodeIds, setNodes, setEdges, onSlidesChange]
  );

  const onNodeDragStop = useCallback(() => {
    if (!onSlidesChange) return;
    setTimeout(() => {
      const orderedSlides = nodesToOrderedSlides(nodesRef.current);
      onSlidesChange(orderedSlides);
    }, 0);
  }, [onSlidesChange]);

  const onConnect = (connection: { source: string; target: string }) => {
    setEdges((prev) =>
      addEdge(
        { ...connection, markerEnd: { type: MarkerType.ArrowClosed } } as Parameters<typeof addEdge>[0],
        prev
      )
    );
  };

  const handleDownloadPptx = useCallback(() => {
    const orderedSlides = nodesToOrderedSlides(nodes);
    if (orderedSlides.length === 0) return;
    downloadSlidesAsPptx(orderedSlides, 'PaperFlow.pptx');
  }, [nodes]);

  const handleGenerateTranscript = useCallback(
    async (
      slideId: string,
      options?: { userInstructions?: string },
      onSuccess?: () => void
    ) => {
      if (!config) return;

      // Get all current slides (with their existing transcripts if any)
      // Use current nodes state instead of ref to ensure we have the latest est_time
      const allSlides = nodesToOrderedSlides(nodes);

      // Find the index of the slide we're generating for
      const slideIndex = allSlides.findIndex((s) => s.id === slideId);
      if (slideIndex === -1) return;

      setTranscriptPanelState((prev) => ({
        ...prev,
        generatingSlideId: slideId,
      }));

      try {
        const body: {
          slides: Slide[];
          slideIndex: number;
          audienceLevel: PresentationConfig['audienceLevel'];
          researcherType: PresentationConfig['researcherType'];
          userInstructions?: string;
        } = {
          slides: allSlides,
          slideIndex,
          audienceLevel: config.audienceLevel,
          researcherType: config.researcherType,
        };
        if (options?.userInstructions?.trim()) {
          body.userInstructions = options.userInstructions.trim().slice(0, 800);
        }

        const response = await fetch('/api/generate-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error('Failed to generate transcript');
        }

        const { transcript } = await response.json();

        // Update the node with the transcript
        setNodes((prev) => {
          const updated = prev.map((n) =>
            n.id === slideId ? { ...n, data: { ...n.data, transcript } } : n
          );
          if (onSlidesChange) {
            setTimeout(() => onSlidesChange(nodesToOrderedSlides(updated)), 0);
          }
          return updated;
        });

        setTranscriptPanelState((prev) => ({
          ...prev,
          generatingSlideId: null,
        }));
        onSuccess?.();
      } catch (error) {
        console.error('Error generating transcript:', error);
        setTranscriptPanelState((prev) => ({
          ...prev,
          generatingSlideId: null,
        }));
      }
    },
    [config, nodes, setNodes, onSlidesChange]
  );

  const handleOpenTranscriptPanel = useCallback((slideId: string) => {
    setTranscriptPanelState({
      isOpen: true,
      activeSlideId: slideId,
      generatingSlideId: null,
    });
  }, []);

  const handleSelectSlide = useCallback((slideId: string) => {
    setTranscriptPanelState((prev) => ({
      ...prev,
      activeSlideId: slideId,
    }));
  }, []);

  const handleCloseTranscript = useCallback(() => {
    setTranscriptPanelState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const handleUpdateEstTime = useCallback(
    (slideId: string, estTime: number) => {
      setNodes((prev) => {
        const updated = prev.map((n) =>
          n.id === slideId ? { ...n, data: { ...n.data, est_time: estTime } } : n
        );
        if (onSlidesChange) {
          setTimeout(() => onSlidesChange(nodesToOrderedSlides(updated)), 0);
        }
        return updated;
      });
    },
    [setNodes, onSlidesChange]
  );

  const handleUpdateTranscript = useCallback(
    (slideId: string, transcript: string) => {
      setNodes((prev) => {
        const updated = prev.map((n) =>
          n.id === slideId ? { ...n, data: { ...n.data, transcript } } : n
        );
        if (onSlidesChange) {
          setTimeout(() => onSlidesChange(nodesToOrderedSlides(updated)), 0);
        }
        return updated;
      });
    },
    [setNodes, onSlidesChange]
  );

  const [helpStage, setHelpStage] = useState<'closed' | 'entering' | 'open' | 'exiting'>('closed');
  const helpRef = useRef<HTMLDivElement>(null);

  const helpOpen = helpStage !== 'closed';

  useEffect(() => {
    if (helpStage === 'entering') {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setHelpStage('open'));
      });
      return () => cancelAnimationFrame(id);
    }
    if (helpStage === 'exiting') {
      const t = setTimeout(() => setHelpStage('closed'), 200);
      return () => clearTimeout(t);
    }
  }, [helpStage]);

  useEffect(() => {
    if (!helpOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target;
      if (helpRef.current && target instanceof Node && !helpRef.current.contains(target) && helpStage === 'open') setHelpStage('exiting');
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [helpOpen, helpStage]);

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isExpanded: expandedNodeIds.has(n.id),
          onExpandChange: (expanded: boolean) => handleExpandChange(n.id, expanded),
          onTitleChange: (title: string) => handleTitleChange(n.id, title),
          onContentChange: (contentMarkdown: string) => handleContentChange(n.id, contentMarkdown),
          onInsertAfter: (nodeId: string) => handleInsertAfter(nodeId),
          onDelete: (nodeId: string) => handleDelete(nodeId),
          onOpenTranscript: config ? (nodeId: string) => handleOpenTranscriptPanel(nodeId) : undefined,
        },
      })),
    [nodes, expandedNodeIds, handleExpandChange, handleTitleChange, handleContentChange, handleInsertAfter, handleDelete, handleOpenTranscriptPanel, config]
  );

  // Get current slides with transcript data for the panel
  const currentSlides = useMemo(() => nodesToOrderedSlides(nodes), [nodes]);

  return (
    <>
      <div className="h-[80vh] w-full flex flex-col rounded-xl border border-paper-flow-border bg-white">
        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-3 py-2 border-b border-paper-flow-border bg-paper-flow-canvas-solid/50 rounded-t-xl">
          <button
            type="button"
            onClick={() => rfInstanceRef.current?.zoomIn()}
            className="flex h-8 w-6 items-center justify-center text-paper-flow-text hover:opacity-70 transition-opacity cursor-pointer"
            title="Zoom in"
          >
            <span className="text-lg leading-none">+</span>
          </button>
          <button
            type="button"
            onClick={() => rfInstanceRef.current?.zoomOut()}
            className="flex h-8 w-6 items-center justify-center text-paper-flow-text hover:opacity-70 transition-opacity cursor-pointer"
            title="Zoom out"
          >
            <span className="text-lg leading-none">−</span>
          </button>
          <button
            type="button"
            onClick={handleFitAll}
            className="flex h-8 w-8 items-center justify-center text-paper-flow-text hover:opacity-70 transition-opacity cursor-pointer"
            title="Fit all slides"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>
          <div className="relative flex items-center gap-2" ref={helpRef}>
            <button
              type="button"
              onClick={() => setHelpStage((s) => (s === 'closed' ? 'entering' : s === 'open' ? 'exiting' : s))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-paper-flow-border bg-white text-paper-flow-text hover:bg-paper-flow-border/30 transition-colors focus:outline-none focus:ring-2 focus:ring-paper-flow-border focus:ring-offset-1 cursor-pointer"
              aria-label="How to use the timeline"
              aria-expanded={helpOpen}
              aria-haspopup="true"
            >
              <span className="text-sm font-semibold leading-none">?</span>
            </button>
            {helpStage !== 'closed' && (
              <div
                className={`absolute right-10 top-full z-50 -mt-1 w-80 rounded-xl border border-paper-flow-border bg-white shadow-xl shadow-black/10 origin-top-right transition-all duration-200 ease-out overflow-hidden ${
                  helpStage === 'open' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'
                }`}
                role="dialog"
                aria-label="Timeline interactions"
              >
                <div className="px-4 py-2.5 border-b border-paper-flow-border" style={{ backgroundColor: '#D99D97' }}>
                  <p className="text-lg text-white font-semibold text-paper-flow-text tracking-tight">Node Interactions Guide:</p>
                </div>
                <ul className="px-4 py-3 space-y-2.5 list-none">
                  <HelpPopoverItem><strong className="text-paper-flow-text font-medium">Drag</strong> a node to reorder the node sequence.</HelpPopoverItem>
                  <HelpPopoverItem><strong className="text-paper-flow-text font-medium">Click ▼</strong> to expand and edit the title or talking points in markdown.</HelpPopoverItem>
                  <HelpPopoverItem><strong className="text-paper-flow-text font-medium">Click ⊕</strong> to insert a new node to the right in the sequence.</HelpPopoverItem>
                  <HelpPopoverItem><strong className="text-paper-flow-text font-medium">Click ×</strong> to delete the node.</HelpPopoverItem>
                  <HelpPopoverItem><strong className="text-paper-flow-text font-medium">Select</strong> a node/edge and press <kbd className={kbdClass}>Delete</kbd> or <kbd className={kbdClass}>Backspace</kbd> to remove it.</HelpPopoverItem>
                  <HelpPopoverItem><strong className="text-paper-flow-text font-medium">Click + Drag</strong> node handles to create new edges.</HelpPopoverItem>
                  <HelpPopoverItem><strong className="text-paper-flow-text font-medium">Click the title</strong> to edit it directly without expanding the node.</HelpPopoverItem>
                  <HelpPopoverItem><strong className="text-paper-flow-text font-medium">Click Sources</strong> in an expanded node to view per-bullet paper citations (shown when citations are available).</HelpPopoverItem>
                  <HelpPopoverItem><strong className="text-paper-flow-text font-medium">Click the ⓘ badge</strong> next to a bullet to see the paper section, heading, page number, and source excerpt.</HelpPopoverItem>
                  {config && (
                    <HelpPopoverItem><strong className="text-paper-flow-text font-medium">Click</strong> <kbd className={kbdClass}>View Transcript</kbd> on an expanded node to generate or view speaker notes.</HelpPopoverItem>
                  )}
                </ul>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleDownloadPptx}
            disabled={nodes.length === 0}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-paper-flow-border bg-[#D99D97] text-white hover:bg-paper-flow-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title={nodes.length === 0 ? 'No slides to export' : 'Download as PowerPoint (.pptx)'}
          >
            Download as PPTX
          </button>
        </div>
        <div className="flex-1 min-h-0 h-full rounded-b-xl overflow-hidden">
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onInit={(instance) => { rfInstanceRef.current = instance; }}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
            fitViewOptions={fitViewOptions}
            className="rounded-xl"
          >
            <Background gap={16} bgColor="#f3d8d240" size={1} />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>

      {config && (
        <TranscriptPanel
          isOpen={transcriptPanelState.isOpen}
          slides={currentSlides}
          activeSlideId={transcriptPanelState.activeSlideId}
          generatingSlideId={transcriptPanelState.generatingSlideId}
          onSelectSlide={handleSelectSlide}
          onGenerateTranscript={handleGenerateTranscript}
          onClose={handleCloseTranscript}
          onUpdateEstTime={handleUpdateEstTime}
          onUpdateTranscript={handleUpdateTranscript}
          config={config}
          sections={sections}
        />
      )}
    </>
  );
}