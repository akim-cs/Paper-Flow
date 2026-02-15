import type { Node, Edge } from '@xyflow/react';
import { MarkerType, Position } from '@xyflow/react';
import type { Slide } from '../types/slides';

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 80;
export const HORIZONTAL_GAP = 60;
/** Width when expanded (user preference, e.g. 300) */
export const NODE_WIDTH_EXPANDED = 300;

/**
 * Converts an array of slides parsed from the paper into React Flow nodes and edges.
 * Nodes are laid out in a horizontal row in list order; edges chain them.
 * Handles are on left/right so edges run horizontally between nodes.
 */
export function slidesToFlowNodes(slides: Slide[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = slides.map((slide, index) => ({
    id: `slide-${index}`,
    type: 'slideNode',
    position: { x: index * (NODE_WIDTH + HORIZONTAL_GAP), y: 100 },
    sourcePosition: Position.Right, // put handles on L/R of nodes
    targetPosition: Position.Left,
    data: {
      label: slide.title,
      ...slide,
    },
  }));

  /**
   * Create edges between each node in the list.
   */
  const edges: Edge[] = slides.slice(0, -1).map((_, index) => ({
    id: `e-${index}-${index + 1}`,
    source: `slide-${index}`,
    target: `slide-${index + 1}`,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));

  return { nodes, edges };
}
