'use client';

import { memo, useCallback, useRef, useEffect } from 'react';
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
  onContentChange?: (contentMarkdown: string) => void;
  onInsertAfter?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onOpenTranscript?: (nodeId: string) => void;
};

function SlideNode({ id, data, sourcePosition, targetPosition }: NodeProps) {
  const {
    title,
    est_time,
    contentMarkdown = '',
    transcript,
    isExpanded = false,
    onExpandChange,
    onTitleChange,
    onContentChange,
    onInsertAfter,
    onDelete,
    onOpenTranscript,
  } = data as SlideNodeData;

  const titleRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow title so full text is visible when collapsed or expanded.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const run = () => {
      el.style.height = 'auto';
      el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
    };

    const raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
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

      {/* Header - editable title; rest clickable to expand/collapse */}
      <div className="p-3 break-words overflow-visible cursor-pointer" onClick={handleToggle}>
        <div className="flex items-start justify-between gap-2">
          <textarea
            ref={titleRef}
            value={title}
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

            <button
              type="button"
              onClick={handleToggle}
              className={`text-sm ${theme.secondaryText} hover:opacity-80 font-medium w-5 h-5 rounded flex items-center justify-center transition-transform duration-200`}
              title={isExpanded ? 'Collapse slide' : 'Expand slide'}
              aria-label={isExpanded ? 'Collapse slide' : 'Expand slide'}
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          </div>
        </div>

        <div className={`mt-1 text-xs ${theme.secondaryTextAlt}`}>{est_time} min</div>
      </div>

      {/* Expanded content - Markdown editor */}
      {isExpanded && (
        <div className={`${theme.expandedBorder} ${theme.expandedBg} p-3 pt-2 break-words overflow-visible rounded-b-xl`}>
          <div className="flex items-center justify-between mb-1.5">
            <p className={`text-xs font-medium ${theme.expandedLabel}`}>Notes</p>
            {onOpenTranscript && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTranscript(id);
                }}
                className={`text-xs px-2 py-1 rounded ${theme.secondaryText} hover:bg-paper-flow-border/20 border border-paper-flow-border transition-colors`}
                title="View transcript for this slide"
              >
                View Transcript
              </button>
            )}
          </div>
          <div className="min-w-0 w-full">
            <SlideNodeEditor
              markdown={contentMarkdown}
              onChange={(markdown) => onContentChange?.(markdown)}
              contentEditableClassName="mdx-editor-content-prose min-h-[80px] text-paper-flow-text outline-none"
            />
          </div>
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