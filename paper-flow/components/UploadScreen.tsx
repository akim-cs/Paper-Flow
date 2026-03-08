'use client';

import { useState, useRef } from 'react';
//import type { Slide } from '../app/types/slides';
//import mockSlides from '../app/data/mockSlides.json';

// type Props = {
//   onUploadComplete: (slides: Slide[]) => void;
// };

type Props = {
  onUploadComplete: (paperId: string) => void;
  onLoadDemo?: () => void;
}

// /**
//  * Upload UI: user uploads a paper; when processing is done, call onUploadComplete(slides).
//  * For now: placeholder that loads mock slides
//  */
// export default function UploadScreen({ onUploadComplete }: Props) {
//   const handleLoadMock = () => {
//     onUploadComplete(mockSlides as Slide[]);
//   };

//   return (
//     <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-950">
//       <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
//         Upload a paper
//       </h2>
//       <p className="max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
//         Paper upload and API processing will go here. For now, load mock slides to see the flow.
//       </p>
//       <button
//         type="button"
//         onClick={handleLoadMock}
//         className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
//       >
//         Load mock slides
//       </button>
//     </div>
//   );
// }

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// export default function UploadScreen({ onUploadComplete }: Props) {

export default function UploadScreen({ onUploadComplete, onLoadDemo }: Props) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    setSelectedFile(file);
    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);

      const res = await fetch('/api/upload-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64 }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to upload PDF');
      }

      const { paperId } = await res.json();
      onUploadComplete(paperId);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setSelectedFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!loading) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (loading) return;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-paper-flow-border bg-white p-12">
      <h2 className="text-xl font-semibold text-zinc-900">Upload a paper</h2>
      <p className="max-w-md text-center text-sm text-zinc-500">
        Select a PDF research paper to generate slides automatically.
      </p>

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        disabled={loading}
        className="sr-only"
      />

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={loading ? -1 : 0}
        aria-label="Upload PDF — click or drag and drop"
        onClick={() => !loading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!loading) fileInputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'flex w-full max-w-sm flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-150 outline-none',
          isDragOver
            ? 'border-paper-flow-border bg-paper-flow-canvas-solid/30'
            : 'border-zinc-300 hover:border-paper-flow-border hover:bg-paper-flow-canvas/30',
          loading
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-paper-flow-border focus-visible:ring-offset-2',
        ].join(' ')}
      >
        {loading ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-paper-flow-border" />
            <p className="text-sm text-zinc-500">Processing PDF…</p>
          </>
        ) : selectedFile ? (
          <>
            <svg className="h-10 w-10 text-paper-flow-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm font-medium text-paper-flow-text">{selectedFile.name}</p>
            <p className="text-xs text-zinc-400">Click to choose a different file</p>
          </>
        ) : (
          <>
            <svg className={`h-10 w-10 transition-colors ${isDragOver ? 'text-paper-flow-border' : 'text-zinc-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div>
              <p className="text-sm font-medium text-zinc-700">
                {isDragOver ? 'Drop to upload' : 'Drag a PDF here'}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                or{' '}
                <span className="text-paper-flow-border underline underline-offset-2">
                  click to browse
                </span>
              </p>
            </div>
            <p className="text-xs text-zinc-300">PDF files only</p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {onLoadDemo && (
        <button
          type="button"
          onClick={onLoadDemo}
          className="rounded-lg border border-paper-flow-border bg-transparent px-4 py-2 text-sm font-medium text-paper-flow-text transition-colors hover:bg-paper-flow-canvas-solid/50"
        >
          Load demo (Octopus slides)
        </button>
      )}
    </div>
  );
}

