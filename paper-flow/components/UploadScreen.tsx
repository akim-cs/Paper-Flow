'use client';

import { useState } from 'react';
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);

      const res = await fetch("/api/upload-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64 })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed to upload PDF");
      }

      const { paperId } = await res.json();

      onUploadComplete(paperId);
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-paper-flow-border bg-white p-12">
      <h2 className="text-xl font-semibold text-zinc-900">
        Upload a paper
      </h2>
      <p className="max-w-md text-center text-sm text-zinc-500">
        Select a PDF research paper to generate slides automatically.
      </p>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        disabled={loading}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900"
      />

      {loading && <p className="text-sm text-zinc-500">Processing PDF...</p>}
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

