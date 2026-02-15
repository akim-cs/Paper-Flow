'use client';

import { useState, memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Slide } from '../app/types/slides';

type SlideNodeData = Slide & { label: string };

function SlideNode({ data, sourcePosition, targetPosition }: NodeProps) {
  const [expanded, setExpanded] = useState(false);
  const { title, speaker_notes, est_time } = data as SlideNodeData;

  return (
    <div
      className={`
        bg-white border-2 border-zinc-300 rounded-lg shadow-sm
        transition-all duration-200 ease-in-out cursor-pointer
        hover:border-zinc-400 hover:shadow-md
        ${expanded ? 'min-w-[280px]' : 'w-[200px]'}
      `}
      onClick={() => setExpanded(!expanded)}
    >
      <Handle
        type="target"
        position={targetPosition ?? Position.Left}
        className="!bg-zinc-400"
      />

      {/* Header - always visible */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-zinc-800 leading-tight">
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

      {/* Expanded content */}
      {expanded && speaker_notes && speaker_notes.length > 0 && (
        <div className="border-t border-zinc-200 p-3 pt-2">
          <p className="text-xs font-medium text-zinc-600 mb-2">Talking Points:</p>
          <ul className="space-y-1.5">
            {speaker_notes.map((note, idx) => (
              <li
                key={idx}
                className="text-xs text-zinc-600 leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-zinc-400"
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
