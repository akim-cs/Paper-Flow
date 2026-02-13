'use client';

import { useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Node,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import type { Slide } from '../app/types/slides';
import { slidesToFlowNodes } from '../app/lib/slidesToFlowNodes';

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

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

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

  return (
    <div className="h-[80vh] w-full rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        className="rounded-xl"
      >
        <Background gap={16} size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
