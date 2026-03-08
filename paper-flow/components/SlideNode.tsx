'use client';

import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Slide, BulletSource } from '../app/types/slides';
import { NODE_WIDTH, NODE_WIDTH_EXPANDED } from '../app/lib/slidesToFlowNodes';
import { paperFlowTheme as theme } from '../app/lib/theme';
import SlideNodeEditor from './SlideNodeEditor';

type SlideNodeData = Slide & {
  label: string;
  isExpanded?: boolean;
  paper_heading?: string;
  onExpandChange?: (expanded: boolean) => void;
  onTitleChange?: (title: string) => void;
  onContentChange?: (contentMarkdown: string) => void;
  onInsertAfter?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onOpenTranscript?: (nodeId: string) => void;
};

// ── Bullet-level source citation view ───────────────────────────────────────

const BULLET_LINE_RE = /^(\s*)([-*+])\s+(.*)/;
const HEADING_LINE_RE = /^(#{1,6})\s+(.*)/;

type ParsedLine =
  | { kind: 'bullet'; depth: number; text: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'text'; text: string };

function parseMarkdownLines(markdown: string): ParsedLine[] {
  return markdown.split('\n').map((line): ParsedLine | null => {
    const bulletMatch = line.match(BULLET_LINE_RE);
    if (bulletMatch) {
      return { kind: 'bullet', depth: bulletMatch[1].length, text: bulletMatch[3].trim() };
    }
    const headingMatch = line.match(HEADING_LINE_RE);
    if (headingMatch) {
      return { kind: 'heading', level: headingMatch[1].length, text: headingMatch[2] };
    }
    if (line.trim()) {
      return { kind: 'text', text: line };
    }
    return null;
  }).filter((l): l is ParsedLine => l !== null);
}

const SECTION_COLORS: Record<string, string> = {
  abstract: 'bg-rose-50 border-rose-200 text-rose-800',
  introduction: 'bg-sky-50 border-sky-200 text-sky-800',
  methodology: 'bg-amber-50 border-amber-200 text-amber-800',
  results: 'bg-green-50 border-green-200 text-green-800',
  discussion: 'bg-violet-50 border-violet-200 text-violet-800',
  conclusion: 'bg-teal-50 border-teal-200 text-teal-800',
};

function CitationBadge({ source }: { source: BulletSource }) {
  const [open, setOpen] = useState(false);
  const colors = SECTION_COLORS[source.normalizedSection] ?? 'bg-zinc-50 border-zinc-200 text-zinc-700';

  return (
    <span className="relative inline-block align-middle ml-1 nodrag nopan">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`text-[9px] font-bold w-3.5 h-3.5 rounded-full inline-flex items-center justify-center border transition-colors cursor-pointer ${colors}`}
        title="Show paper source"
        aria-label="Show paper source"
      >
        i
      </button>
      {open && (
        <div
          className={`absolute left-5 top-0 z-50 w-64 rounded-lg border shadow-lg p-2.5 text-[11px] leading-snug ${colors}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-1.5 gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold capitalize">{source.normalizedSection}</span>
              {source.paperHeading && (
                <span className="opacity-75 font-normal text-[10px] leading-tight">{source.paperHeading}</span>
              )}
              {source.pageNumber != null && (
                <span className="opacity-60 font-normal">p. {source.pageNumber}</span>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="opacity-60 hover:opacity-100 text-base leading-none flex-shrink-0"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="italic opacity-80">"{source.excerpt}"</p>
        </div>
      )}
    </span>
  );
}

function NotesSourcesView({
  contentMarkdown,
  bulletSources,
}: {
  contentMarkdown: string;
  bulletSources: BulletSource[] | undefined;
}) {
  const lines = parseMarkdownLines(contentMarkdown);
  // Key by bulletId (bullet text at generation time) — AI-generated bullets match; user-added bullets won't
  const sourceByText = new Map(bulletSources?.map((s) => [s.bulletId.trim(), s]) ?? []);
  const hasAny = (bulletSources?.length ?? 0) > 0;

  if (!hasAny) {
    return (
      <p className={`text-xs italic ${theme.secondaryText} px-1 py-2`}>
        Source data not available — regenerate slides to enable per-bullet citations.
      </p>
    );
  }

  return (
    <div className="nodrag nopan text-xs text-paper-flow-text leading-relaxed space-y-0.5 px-1 py-1">
      {lines.map((line, i) => {
        if (line.kind === 'heading') {
          return (
            <p key={i} className="font-semibold mt-2 mb-0.5 text-paper-flow-text/90">
              {line.text}
            </p>
          );
        }
        if (line.kind === 'text') {
          return <p key={i} className="text-paper-flow-text/80">{line.text}</p>;
        }
        // Bullet: look up by text content — only AI-generated bullets will match
        const source = sourceByText.get(line.text.trim());
        return (
          <div
            key={i}
            className="flex items-start gap-1"
            style={{ paddingLeft: `${line.depth * 0.75}rem` }}
          >
            <span className="text-paper-flow-border mt-0.5 shrink-0">•</span>
            <span className="flex-1">
              {line.text}
              {source && <CitationBadge source={source} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const SOURCE_SECTION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  abstract:     { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
  introduction: { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200' },
  methodology:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  results:      { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  discussion:   { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  conclusion:   { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200' },
};

function SlideNode({ id, data, sourcePosition, targetPosition }: NodeProps) {
  const {
    title,
    est_time,
    contentMarkdown = '',
    source_section,
    paper_heading,
    bulletSources,
    isExpanded = false,
    onExpandChange,
    onTitleChange,
    onContentChange,
    onInsertAfter,
    onDelete,
    onOpenTranscript,
  } = data as SlideNodeData;

  const [notesMode, setNotesMode] = useState<'edit' | 'sources'>('edit');
  const hasBulletSources = (bulletSources?.length ?? 0) > 0;

  // Dev-only: log whether bulletSources reached the component at mount time
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SlideNode] RENDER "${title}": ${bulletSources?.length ?? 0} bulletSources, hasBulletSources=${hasBulletSources}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs ${theme.secondaryTextAlt}`}>{est_time} min</span>
          {source_section && (() => {
            const style = SOURCE_SECTION_STYLES[source_section] ?? { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200' };
            return (
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${style.bg} ${style.text} ${style.border}`}
                title={paper_heading ?? source_section}
              >
                {source_section}
              </span>
            );
          })()}
        </div>
        {paper_heading && (
          <p className={`text-[10px] ${theme.secondaryText} opacity-70 mt-0.5 leading-tight truncate`} title={paper_heading}>
            {paper_heading}
          </p>
        )}
      </div>

      {/* Expanded content - Markdown editor */}
      {isExpanded && (
        <div className={`${theme.expandedBorder} ${theme.expandedBg} p-3 pt-2 break-words overflow-visible rounded-b-xl`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <p className={`text-xs font-medium ${theme.expandedLabel}`}>Notes</p>
              {/* Sources tab — only shown when bullet sources are present */}
              {hasBulletSources && (
                <div className="flex items-center text-[10px] gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setNotesMode('edit'); }}
                    className={`px-1.5 py-0.5 rounded transition-colors ${notesMode === 'edit' ? `font-semibold ${theme.titleText}` : `${theme.secondaryText} hover:opacity-80`}`}
                  >
                    Edit
                  </button>
                  <span className={`${theme.secondaryText} opacity-40`}>|</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setNotesMode('sources'); }}
                    className={`px-1.5 py-0.5 rounded transition-colors ${notesMode === 'sources' ? `font-semibold ${theme.titleText}` : `${theme.secondaryText} hover:opacity-80`}`}
                  >
                    Sources
                  </button>
                </div>
              )}
            </div>
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
            {notesMode === 'sources' ? (
              <NotesSourcesView
                contentMarkdown={contentMarkdown}
                bulletSources={bulletSources}
              />
            ) : (
              <SlideNodeEditor
                markdown={contentMarkdown}
                onChange={(markdown, isInit) => {
                  // Skip MDXEditor's initialization-normalization event so it
                  // never overwrites real slide content with an empty string.
                  if (!isInit) onContentChange?.(markdown);
                }}
                contentEditableClassName="mdx-editor-content-prose min-h-[80px] text-paper-flow-text outline-none"
              />
            )}
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