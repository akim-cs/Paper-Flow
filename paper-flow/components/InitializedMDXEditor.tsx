'use client';

import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorProps,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

/**
 * MDXEditor with standard plugins. Use only on the client (e.g. via dynamic import with ssr: false).
 */
export default function InitializedMDXEditor(props: MDXEditorProps) {
  return (
    <MDXEditor
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
      ]}
      {...props}
    />
  );
}
