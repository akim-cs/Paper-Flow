'use client';

import { useState } from 'react';
import type { PresentationConfig } from '../app/types/slides';

type Props = {
  onConfigComplete: (config: PresentationConfig) => void;
};

export default function ConfigScreen({ onConfigComplete }: Props) {
  const [audienceLevel, setAudienceLevel] = useState<PresentationConfig['audienceLevel']>('intermediate');
  const [timeLimit, setTimeLimit] = useState<number>(15);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfigComplete({ audienceLevel, timeLimit });
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
