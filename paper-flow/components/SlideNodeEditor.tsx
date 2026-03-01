'use client';

import dynamic from 'next/dynamic';
import type { MDXEditorProps } from '@mdxeditor/editor';
import "@mdxeditor/editor/style.css";

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
 * Use className "nodrag nopan" so React Flow doesn't capture drag/pan when editing.
 */
export default function SlideNodeEditor({
  className = '',
  ...props
}: SlideNodeEditorProps) {
  return (
    <div className={`nodrag nopan min-h-[120px] w-full [&_.mdx-editor]:!min-h-[100px] ${className} cursor-text`}>
      <InitializedMDXEditor {...props} />
    </div>
  );
}
