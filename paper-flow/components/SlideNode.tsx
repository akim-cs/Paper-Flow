'use client';

import { useState, memo, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Slide } from '../app/types/slides';
import { NODE_WIDTH, NODE_WIDTH_EXPANDED } from '../app/lib/slidesToFlowNodes';
import { paperFlowTheme as theme } from '../app/lib/theme';
import SlideNodeEditor from './SlideNodeEditor';

type SlideNodeData = Slide & {
  label: string;
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  onTitleChange?: (title: string) => void;
  // onSpeakerNotesChange?: (speaker_notes: string[]) => void;
  onContentChange?: (contentMarkdown: string) => void;
  onInsertAfter?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
};

function SlideNode({ id, data, sourcePosition, targetPosition }: NodeProps) {
  const {
    title,
    speaker_notes = [],
    est_time,
    contentMarkdown = '',
    isExpanded = false,
    onExpandChange,
    onTitleChange,
    // onSpeakerNotesChange,
    onContentChange,
    onInsertAfter,
    onDelete,
  } = data as SlideNodeData;
  const [newNoteDraft, setNewNoteDraft] = useState('');
  const titleRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow title so full text is visible when collapsed or expanded; defer so we measure after layout.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const run = () => {
      el.style.height = 'auto';
      el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
    };
    const id = requestAnimationFrame(() => run());
    return () => cancelAnimationFrame(id);
  }, [title, isExpanded]);

  const handleToggle = useCallback(() => {
    onExpandChange?.(!isExpanded);
  }, [isExpanded, onExpandChange]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onTitleChange?.(e.target.value.replace(/\n+$/, ''));
    },
    [onTitleChange]
  );

  // const handleNoteChange = useCallback(
  //   (idx: number, value: string) => {
  //     const next = [...speaker_notes];
  //     next[idx] = value;
  //     onSpeakerNotesChange?.(next);
  //   },
  //   [speaker_notes, onSpeakerNotesChange]
  // );

  // const handleNoteChangeTextarea = useCallback(
  //   (idx: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
  //     handleNoteChange(idx, e.target.value);
  //   },
  //   [handleNoteChange]
  // );

  // const commitNewNote = useCallback(() => {
  //   const v = newNoteDraft.trim();
  //   if (v) {
  //     onSpeakerNotesChange?.([...speaker_notes, v]);
  //     setNewNoteDraft('');
  //   }
  // }, [newNoteDraft, speaker_notes, onSpeakerNotesChange]);

  return (
    <div
      className={`rounded-xl overflow-visible ${theme.nodeBorder} ${theme.nodeBg} ${theme.nodeShadow} ${theme.nodeBorderHover} ${theme.nodeShadowHover} transition-all duration-200 ease-in-out`}
      style={
        isExpanded
          ? { minWidth: NODE_WIDTH, maxWidth: NODE_WIDTH_EXPANDED, width: NODE_WIDTH_EXPANDED }
          : { width: NODE_WIDTH }
      }
    >
      <Handle
        type="target"
        position={targetPosition ?? Position.Left}
        className={`!w-2 !h-2 ${theme.handleBorder} ${theme.handleBg}`}
      />

      {/* Header - editable title (wraps); rest of header clickable to expand/collapse */}
      <div
        className="p-3 break-words overflow-visible cursor-pointer"
        onClick={handleToggle}
      >
        <div className="flex items-start justify-between gap-2">
          <textarea
            ref={titleRef}
            value={title.trimEnd()}
            onChange={handleTitleChange}
            onClick={(e) => e.stopPropagation()}
            rows={1}
            className={`w-0 flex-1 min-w-0 text-sm font-medium ${theme.titleText} leading-tight bg-transparent border-none outline-none ${theme.focusRing} rounded px-0.5 -mx-0.5 cursor-text resize-none overflow-hidden py-0 ${theme.titlePlaceholder} break-words`}
            placeholder="Slide title"
            style={{ minHeight: '1.5rem', wordBreak: 'break-word', overflowWrap: 'break-word' }}
          />
          <div className="flex flex-col items-center gap-0.2 flex-shrink-0">
            {onInsertAfter && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInsertAfter(id);
                }}
                className={`text-lg ${theme.secondaryText} hover:opacity-80 font-medium w-5 h-5 rounded flex items-center justify-center border border-transparent hover:border-current hover:cursor-pointer`}
                title="Insert slide to the right"
                aria-label="Insert slide to the right"
              >
                ⊕
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                className={`text-lg ${theme.secondaryText} hover:opacity-80 hover:text-red-600 font-medium w-5 h-5 rounded flex items-center justify-center border border-transparent hover:border-current hover:cursor-pointer`}
                title="Delete this slide"
                aria-label="Delete slide"
              >
                ×
              </button>
            )}
            <span className={`text-xs ${theme.secondaryText} font-medium w-6 h-6 flex items-center justify-center`}>
              {/* {isExpanded ? '−' : '+'} */}
            </span>
          </div>
        </div>
        <div className={`mt-1 text-xs ${theme.secondaryTextAlt}`}>
          {est_time} min
        </div>
      </div>

      {/* Expanded content - editable talking points */}
      {isExpanded && (
        <div className={`${theme.expandedBorder} ${theme.expandedBg} p-3 pt-2 break-words overflow-visible rounded-b-xl`}>
          <p className={`text-xs font-medium ${theme.expandedLabel} mb-1.5`}>Talking Points</p>
          <ul className="space-y-0.5">
            <li className="flex flex-col gap-0.5 items-stretch min-w-0 w-full">
              <SlideNodeEditor
                markdown={contentMarkdown}
                onChange={(markdown) => onContentChange?.(markdown)}
                contentEditableClassName="mdx-editor-content-prose min-h-[80px] text-paper-flow-text outline-none"
              />
            </li>
          </ul>
        </div>
      )}

      <Handle
        type="source"
        position={sourcePosition ?? Position.Right}
        className={`!w-2 !h-2 ${theme.handleBorder} ${theme.handleBg}`}
      />
    </div>
  );
}

export default memo(SlideNode);
