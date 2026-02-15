'use client';

import { useMemo, useEffect, useCallback, useRef, useState, type ComponentType } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  BackgroundVariant,
  type Node,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import type { Slide } from '../app/types/slides';
import {
  slidesToFlowNodes,
  NODE_WIDTH,
  NODE_WIDTH_EXPANDED,
  HORIZONTAL_GAP,
} from '../app/lib/slidesToFlowNodes';
import { paperFlowCanvasBg } from '../app/lib/theme';
import SlideNode from './SlideNode';

// Define custom node types outside component to prevent re-creation on each render
const nodeTypes: Record<string, ComponentType<any>> = {
  slideNode: SlideNode,
};

type Props = {
  // Pass in a list of processed slides (paper -> json where each element is of type Slide)
  slides: Slide[];
  onSlidesChange?: (slides: Slide[]) => void;
};

function nodesToOrderedSlides(nodes: Node[]): Slide[] {
  const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
  return sorted.map((node) => ({
    title: node.data.title as string,
    speaker_notes: (node.data.speaker_notes as string[]) ?? [],
    est_time: (node.data.est_time as number) ?? 0,
  }));
}

/**
 * Recompute x positions so every expanded node gets NODE_WIDTH_EXPANDED and others get NODE_WIDTH.
 * Order is preserved by sorting by current position.x. Multiple expanded nodes are all accounted for.
 */
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

/**
 * Renders the given slides as React Flow nodes (horizontal chain).
 * Converts slides to nodes/edges via slidesToFlowNodes and keeps flow state in sync when slides change.
 * On node drag end, reorders slides by x position and snaps layout so edges reconnect automatically.
 */
export default function SlidesFlow({ slides, onSlidesChange }: Props) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => slidesToFlowNodes(slides),
    [slides]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodesRef = useRef(nodes);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Sync nodes/edges from slides (e.g. after reorder); keep expanded state and apply expand layout so nodes stay expanded on rearrange
  useEffect(() => {
    setNodes(
      initialNodes.length === 0
        ? initialNodes
        : applyExpandLayout(initialNodes, expandedNodeIds)
    );
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, expandedNodeIds, setNodes, setEdges]);

  // When any node expands/collapses, recompute positions so all expanded nodes get room
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
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, title } } : n
      )
    );
  }, [setNodes]);

  const handleSpeakerNotesChange = useCallback((nodeId: string, speaker_notes: string[]) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, speaker_notes } } : n
      )
    );
  }, [setNodes]);

  const onNodeDragStop = useCallback(() => {
    if (!onSlidesChange) return;
    // Defer so we don't update parent (CreateScreen) during this component's render.
    // Use setTimeout so we run after React has committed the drag position update and the ref is synced.
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

  // Inject callbacks and isExpanded so SlideNode is controlled by node id (not position)
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isExpanded: expandedNodeIds.has(n.id),
          onExpandChange: (expanded: boolean) => handleExpandChange(n.id, expanded),
          onTitleChange: (title: string) => handleTitleChange(n.id, title),
          onSpeakerNotesChange: (speaker_notes: string[]) =>
            handleSpeakerNotesChange(n.id, speaker_notes),
        },
      })),
    [
      nodes,
      expandedNodeIds,
      handleExpandChange,
      handleTitleChange,
      handleSpeakerNotesChange,
    ]
  );

  return (
    <div className="h-[80vh] w-full rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        className="rounded-xl"
      >
        <Background gap={16} bgColor='#f3d8d240' size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
