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
  Position,
  type Node,
  type Edge,
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
    contentMarkdown: node.data.contentMarkdown as string | undefined,
  }));
}

/**
 * X value for a new node so it sorts after `node` (e.g. when inserting after the last node).
 * applyExpandLayout will then assign the real position.
 */
function xAfter(node: Node): number {
  return node.position.x + NODE_WIDTH + HORIZONTAL_GAP;
}

/**
 * X value for a new node so it sorts between `prev` and `next` (when inserting in the middle).
 */
function xBetween(prev: Node, next: Node): number {
  return (prev.position.x + next.position.x) / 2;
}

/**
 * Recompute x positions so every expanded node gets NODE_WIDTH_EXPANDED and others get NODE_WIDTH.
 * Order is preserved by sorting by current position.x. Multiple expanded nodes are all accounted for.
 *
 * Important for insert: a new node must get an initial position.x that sorts it in the right place.
 * If you give it x: 0 it would sort first (bug). Use xBetween(prevNode, nextNode) or xAfter(lastNode).
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

  // Recompute if any of the slide change
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => slidesToFlowNodes(slides),
    [slides]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodesRef = useRef(nodes);
  const insertIdRef = useRef(0);
  // Track which nodes are in an expanded state
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Sync nodes/edges from slides when parent data changes (e.g. after drag). Preserve current node
  // ids so expanded state stays on the same logical node after reorder (ids are not re-assigned by position).
  useEffect(() => {

    // If we deleted all nodes
    if (initialNodes.length === 0) {
      setNodes([]);
      setEdges(initialEdges);
      return;
    }
    const current = nodesRef.current;

    // Sort nodes by their x position on node drag end
    const sortedCurrent = [...current].sort(
      (a, b) => a.position.x - b.position.x || a.id.localeCompare(b.id)
    );
    const merged = initialNodes.map((fromParent, i) =>
      i < sortedCurrent.length
        ? { ...fromParent, id: sortedCurrent[i].id }
        : fromParent
    );

    // Re-expand nodes from before the drag
    const layouted = applyExpandLayout(merged, expandedNodeIds);

    // Reconnect edges between nodes on new ordering
    const newEdges: Edge[] = layouted
      .slice(0, -1)
      .map((n, i) => ({
        id: `e-${n.id}-${layouted[i + 1].id}`,
        source: n.id,
        target: layouted[i + 1].id,
        markerEnd: { type: MarkerType.ArrowClosed },
      }));
    setNodes(layouted);
    setEdges(newEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // When any node expands/collapses, recompute positions so all expanded nodes get room
  useEffect(() => {
    setNodes((prev) => (prev.length === 0 ? prev : applyExpandLayout(prev, expandedNodeIds)));
  }, [expandedNodeIds, setNodes]);

  const handleExpandChange = useCallback((nodeId: string, expanded: boolean) => {
    setExpandedNodeIds((prev) => {

      // Toggle expanded state of triggering node and create new set
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

  // const handleSpeakerNotesChange = useCallback((nodeId: string, speaker_notes: string[]) => {
  //   setNodes((prev) =>
  //     prev.map((n) =>
  //       n.id === nodeId ? { ...n, data: { ...n.data, speaker_notes } } : n
  //     )
  //   );
  // }, [setNodes]);

  const handleContentChange = useCallback((nodeId: string, contentMarkdown: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, contentMarkdown } } : n
      )
    );
  }, [setNodes]);

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
      const newEdgeList: Edge[] = layouted
        .slice(0, -1)
        .map((n, i) => ({
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

      const newSlide: Slide = { title: '', speaker_notes: [], est_time: 0 };
      const newId = `slide-insert-${++insertIdRef.current}`;
      const isLast = index === sorted.length - 1;
      const newX = isLast
        ? xAfter(sorted[index])
        : xBetween(sorted[index], sorted[index + 1]);
      const newNode: Node = {
        id: newId,
        type: 'slideNode',
        position: { x: newX, y: 100 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { label: '', ...newSlide },
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
          // onSpeakerNotesChange: (speaker_notes: string[]) =>
          //   handleSpeakerNotesChange(n.id, speaker_notes),
          onContentChange: (contentMarkdown: string) => handleContentChange(n.id, contentMarkdown),
          onInsertAfter: (nodeId: string) => handleInsertAfter(nodeId),
          onDelete: (nodeId: string) => handleDelete(nodeId),
        },
      })),
    [
      nodes,
      expandedNodeIds,
      handleExpandChange,
      handleTitleChange,
      // handleSpeakerNotesChange,
      handleContentChange,
      handleInsertAfter,
      handleDelete,
    ]
  );

  return (
    <div className="h-[80vh] w-full rounded-xl border border-paper-flow-border bg-white dark:bg-zinc-950">
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
