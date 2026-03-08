'use client';

import { useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { MDXEditorProps } from '@mdxeditor/editor';
import "@mdxeditor/editor/style.css";

const InitializedMDXEditor = dynamic(() => import('./InitializedMDXEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[200px] w-full rounded border border-paper-flow-border bg-paper-flow-canvas-solid/30 p-4 text-sm text-paper-flow-text/70">
      Loading editor…
    </div>
  ),
});

type TranscriptEditorProps = Omit<MDXEditorProps, 'markdown' | 'onChange'> & {
  transcript: string;
  onTranscriptChange: (transcript: string) => void;
  className?: string;
};

/**
 * Rich markdown editor for transcripts.
 * Dynamically loaded (no SSR). No header management (unlike SlideNodeEditor).
 */
export default function TranscriptEditor({
  transcript,
  onTranscriptChange,
  className = '',
  ...props
}: TranscriptEditorProps) {
  // Latch: once non-empty transcript is seen, switch to a stable 'populated' key
  // so InitializedMDXEditor remounts exactly once (empty → populated) and never
  // flickers again during user edits or slide switches.
  const hasSeenContentRef = useRef(!!transcript);
  if (transcript && !hasSeenContentRef.current) {
    hasSeenContentRef.current = true;
  }
  const editorKey = hasSeenContentRef.current ? 'populated' : 'empty';

  const handleChange = useCallback(
    (newMarkdown: string, initialMarkdownNormalize?: boolean) => {
      // Skip MDXEditor's initialization-normalization event so it
      // never overwrites real transcript content during mounting.
      if (!initialMarkdownNormalize) {
        onTranscriptChange(newMarkdown);
      }
    },
    [onTranscriptChange]
  );

  return (
    <div className={`nodrag nopan min-h-[200px] w-full ${className}`}>
      <InitializedMDXEditor
        key={editorKey}
        {...props}
        markdown={transcript}
        onChange={handleChange}
      />
    </div>
  );
}
