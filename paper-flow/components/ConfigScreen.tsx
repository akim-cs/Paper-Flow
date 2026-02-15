'use client';

import { useState } from 'react';
import type { PresentationConfig, Slide } from '../app/types/slides';

type Props = {
  paperId: string;
  onComplete: (config: PresentationConfig, slides: Slide[]) => void;
};

export default function ConfigScreen({ paperId, onComplete }: Props) {
  const [audienceLevel, setAudienceLevel] = useState<PresentationConfig['audienceLevel']>('intermediate');
  const [timeLimit, setTimeLimit] = useState<number>(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId, audienceLevel, timeLimit })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed to generate slides");
      }

      const slides: Slide[] = await res.json();

      onComplete({ audienceLevel, timeLimit }, slides);
    } catch (err) {
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
    <div className="flex min-h-[60vh] items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="mb-6 text-xl font-semibold">Presentation Settings</h2>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium">
            Audience Level
          </label>
          <div className="flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
            {(['beginner', 'intermediate', 'expert'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setAudienceLevel(level)}
                className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                  audienceLevel === level
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label htmlFor="time" className="mb-2 block text-sm font-medium">
            Time Limit (minutes)
          </label>
          <input
            id="time"
            type="number"
            min={5}
            max={120}
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        {loading && <p className="text-sm text-zinc-500 dark:text-zinc-400">Generating slides...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-zinc-900 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
