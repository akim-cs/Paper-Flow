'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { MDXEditorProps } from '@mdxeditor/editor';
import "@mdxeditor/editor/style.css";

const TALKING_POINTS_HEADER = '# Talking Points\n';

const InitializedMDXEditor = dynamic(() => import('./InitializedMDXEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[120px] w-full rounded border border-paper-flow-border bg-paper-flow-canvas-solid/30 p-3 text-sm text-paper-flow-text/70">
      Loading editor…
    </div>
  ),
});

type SlideNodeEditorProps = MDXEditorProps & {
  className?: string;
};

/**
 * Rich markdown editor for slide nodes. Dynamically loaded (no SSR).
 * Displays content under a "# Talking Points" header; only the content (without the header) is passed to onChange for saving.
 * Use className "nodrag nopan" so React Flow doesn't capture drag/pan when editing.
 */
export default function SlideNodeEditor({
  className = '',
  markdown = '',
  onChange,
  ...props
}: SlideNodeEditorProps) {
  const displayMarkdown = TALKING_POINTS_HEADER + (markdown ?? '');
  const handleChange = useCallback(
    (newMarkdown: string, initialMarkdownNormalize?: boolean) => {
      const toSave = newMarkdown.startsWith(TALKING_POINTS_HEADER)
        ? newMarkdown.slice(TALKING_POINTS_HEADER.length)
        : newMarkdown;
      onChange?.(toSave, initialMarkdownNormalize ?? false);
    },
    [onChange]
  );
  return (
    <div className={`nodrag nopan min-h-[120px] w-full [&_.mdx-editor]:!min-h-[100px] ${className} cursor-text`}>
      <InitializedMDXEditor {...props} markdown={displayMarkdown} onChange={handleChange} />
    </div>
  );
}
