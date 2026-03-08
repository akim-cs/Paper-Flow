import type { Node, Edge } from '@xyflow/react';
import { MarkerType, Position } from '@xyflow/react';
import type { Slide } from '../types/slides';

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 80;
export const HORIZONTAL_GAP = 60;
/** Width when expanded (user preference, e.g. 300) */
export const NODE_WIDTH_EXPANDED = 300;

// Safety strip for slides persisted before server-side cleanup was added.
// New slides are already clean; this is a no-op for them.
const LEGACY_SRC_RE = /\s*\[src:[a-zA-Z]+\|[^\]]*\]/g;
function stripLegacySrcMarkers(md: string): string {
  return md.replace(LEGACY_SRC_RE, '');
}

export function slidesToFlowNodes(slides: Slide[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = slides.map((slide, index) => ({
    id: slide.id ?? `slide-${index}`,
    type: 'slideNode',
    position: { x: index * (NODE_WIDTH + HORIZONTAL_GAP), y: 100 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      label: slide.title,              // good to keep for any node label usage
      title: slide.title,              // IMPORTANT: SlideNode reads data.title
      est_time: slide.est_time,
      contentMarkdown: stripLegacySrcMarkers(slide.contentMarkdown ?? ''),
      transcript: slide.transcript,    // Include existing transcript if present
      source_section: slide.source_section,
      paper_heading: slide.paper_heading,
      bulletSources: slide.bulletSources,
    },
  }));

  const edges: Edge[] = nodes.slice(0, -1).map((n, index) => ({
    id: `e-${n.id}-${nodes[index + 1].id}`,   // stable edge id
    source: n.id,
    target: nodes[index + 1].id,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));

  return { nodes, edges };
}