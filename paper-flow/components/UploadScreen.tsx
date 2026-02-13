'use client';

import type { Slide } from '../app/types/slides';
import mockSlides from '../app/data/mockSlides.json';

type Props = {
  onUploadComplete: (slides: Slide[]) => void;
};

/**
 * Upload UI: user uploads a paper; when processing is done, call onUploadComplete(slides).
 * For now: placeholder that loads mock slides
 */
export default function UploadScreen({ onUploadComplete }: Props) {
  const handleLoadMock = () => {
    onUploadComplete(mockSlides as Slide[]);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Upload a paper
      </h2>
      <p className="max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
        Paper upload and API processing will go here. For now, load mock slides to see the flow.
      </p>
      <button
        type="button"
        onClick={handleLoadMock}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Load mock slides
      </button>
    </div>
  );
}
