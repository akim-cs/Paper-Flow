'use client';

import { useState, memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Slide } from '../app/types/slides';
import { NODE_WIDTH, NODE_WIDTH_EXPANDED } from '../app/lib/slidesToFlowNodes';

type SlideNodeData = Slide & {
  label: string;
  onExpandChange?: (expanded: boolean) => void;
};

function SlideNode({ id, data, sourcePosition, targetPosition }: NodeProps) {
  const { title, speaker_notes, est_time, onExpandChange } = data as SlideNodeData;
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    onExpandChange?.(next);
  }, [expanded, onExpandChange]);

  return (
    <div
      className="bg-white border-2 border-zinc-300 rounded-lg shadow-sm transition-all duration-200 ease-in-out cursor-pointer hover:border-zinc-400 hover:shadow-md"
      style={
        expanded
          ? { minWidth: NODE_WIDTH, maxWidth: NODE_WIDTH_EXPANDED, width: NODE_WIDTH_EXPANDED }
          : { width: NODE_WIDTH }
      }
      onClick={handleToggle}
    >
      <Handle
        type="target"
        position={targetPosition ?? Position.Left}
        className="!bg-zinc-400"
      />

      {/* Header - always visible; text wraps */}
      <div className="p-3 break-words overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-zinc-800 leading-tight break-words min-w-0">
            {title}
          </h3>
          <span className="text-xs text-zinc-400 flex-shrink-0">
            {expanded ? '−' : '+'}
          </span>
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          {est_time} min
        </div>
      </div>

      {/* Expanded content - text wraps */}
      {expanded && speaker_notes && speaker_notes.length > 0 && (
        <div className="border-t border-zinc-200 p-3 pt-2 break-words overflow-hidden">
          <p className="text-xs font-medium text-zinc-600 mb-2">Talking Points:</p>
          <ul className="space-y-1.5">
            {speaker_notes.map((note, idx) => (
              <li
                key={idx}
                className="text-xs text-zinc-600 leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-zinc-400 break-words"
              >
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Handle
        type="source"
        position={sourcePosition ?? Position.Right}
        className="!bg-zinc-400"
      />
    </div>
  );
}

export default memo(SlideNode);
