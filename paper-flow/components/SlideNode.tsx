'use client';

import { useState, memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Slide } from '../app/types/slides';
import { NODE_WIDTH, NODE_WIDTH_EXPANDED } from '../app/lib/slidesToFlowNodes';

type SlideNodeData = Slide & {
  label: string;
  onExpandChange?: (expanded: boolean) => void;
  onTitleChange?: (title: string) => void;
  onSpeakerNotesChange?: (speaker_notes: string[]) => void;
};

function SlideNode({ id, data, sourcePosition, targetPosition }: NodeProps) {
  const {
    title,
    speaker_notes = [],
    est_time,
    onExpandChange,
    onTitleChange,
    onSpeakerNotesChange,
  } = data as SlideNodeData;
  const [expanded, setExpanded] = useState(false);
  const [newNoteDraft, setNewNoteDraft] = useState('');

  const handleToggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    onExpandChange?.(next);
  }, [expanded, onExpandChange]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onTitleChange?.(e.target.value);
    },
    [onTitleChange]
  );

  const handleNoteChange = useCallback(
    (idx: number, value: string) => {
      const next = [...speaker_notes];
      next[idx] = value;
      onSpeakerNotesChange?.(next);
    },
    [speaker_notes, onSpeakerNotesChange]
  );

  const handleNoteChangeTextarea = useCallback(
    (idx: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleNoteChange(idx, e.target.value);
    },
    [handleNoteChange]
  );

  const commitNewNote = useCallback(() => {
    const v = newNoteDraft.trim();
    if (v) {
      onSpeakerNotesChange?.([...speaker_notes, v]);
      setNewNoteDraft('');
    }
  }, [newNoteDraft, speaker_notes, onSpeakerNotesChange]);

  return (
    <div
      className="bg-white border-2 border-zinc-300 rounded-lg shadow-sm transition-all duration-200 ease-in-out hover:border-zinc-400 hover:shadow-md"
      style={
        expanded
          ? { minWidth: NODE_WIDTH, maxWidth: NODE_WIDTH_EXPANDED, width: NODE_WIDTH_EXPANDED }
          : { width: NODE_WIDTH }
      }
    >
      <Handle
        type="target"
        position={targetPosition ?? Position.Left}
        className="!bg-zinc-400"
      />

      {/* Header - editable title (wraps); rest of header clickable to expand/collapse */}
      <div
        className="p-3 break-words overflow-hidden cursor-pointer"
        onClick={handleToggle}
      >
        <div className="flex items-start justify-between gap-2">
          <textarea
            value={title}
            onChange={handleTitleChange}
            onClick={(e) => e.stopPropagation()}
            rows={2}
            className="flex-1 min-w-0 text-sm font-medium text-zinc-800 leading-tight bg-transparent border-none outline-none focus:ring-1 focus:ring-zinc-400 focus:ring-inset rounded px-0.5 -mx-0.5 cursor-text resize-none overflow-hidden py-0"
            placeholder="Slide title"
            style={{ minHeight: '1.5rem' }}
          />
          <span className="text-xs text-zinc-400 flex-shrink-0 pt-0.5">
            {expanded ? '−' : '+'}
          </span>
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          {est_time} min
        </div>
      </div>

      {/* Expanded content - editable talking points (wrap like title); bullet aligned to first line */}
      {expanded && (
        <div className="border-t border-zinc-200 p-3 pt-2 break-words overflow-hidden">
          <p className="text-xs font-medium text-zinc-600 mb-2">Talking Points:</p>
          <ul className="space-y-1.5">
            {speaker_notes.map((note, idx) => (
              <li key={idx} className="flex gap-2 items-start">
                <span className="text-zinc-400 text-xs leading-relaxed pt-[0.35rem] shrink-0 w-[0.5rem] text-center">•</span>
                <textarea
                  value={note}
                  onChange={(e) => handleNoteChangeTextarea(idx, e)}
                  onClick={(e) => e.stopPropagation()}
                  rows={2}
                  className="flex-1 min-w-0 text-xs text-zinc-600 leading-relaxed bg-transparent border-none outline-none focus:ring-1 focus:ring-zinc-400 focus:ring-inset rounded px-0.5 -mx-0.5 cursor-text resize-none overflow-hidden py-0"
                  placeholder="Talking point"
                  style={{ minHeight: '1.25rem' }}
                />
              </li>
            ))}
            <li className="flex gap-2 items-start">
              <span className="text-zinc-400 text-xs leading-relaxed pt-[0.35rem] shrink-0 w-[0.5rem] text-center">•</span>
              <textarea
                value={newNoteDraft}
                onChange={(e) => setNewNoteDraft(e.target.value)}
                onBlur={commitNewNote}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitNewNote();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                rows={2}
                className="flex-1 min-w-0 text-xs text-zinc-500 italic bg-transparent border-none outline-none focus:ring-1 focus:ring-zinc-400 focus:ring-inset rounded px-0.5 -mx-0.5 cursor-text resize-none overflow-hidden py-0 placeholder:italic"
                placeholder="Add a talking point…"
                style={{ minHeight: '1.25rem' }}
              />
            </li>
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
