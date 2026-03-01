'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/lib/firebase/AuthContext';
import { createProject } from '@/app/lib/firebase/firestore';
import AuthGuard from '@/components/auth/AuthGuard';
import type { Slide, PresentationConfig } from '@/app/types/slides';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

type Step = 'upload' | 'config' | 'generating';

function NewProjectContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('upload');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config state
  const [audienceLevel, setAudienceLevel] =
    useState<PresentationConfig['audienceLevel']>('intermediate');
  const [timeLimit, setTimeLimit] = useState<number>(15);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setOriginalFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-paper", {
        method: "POST",
        body: formData
      })

      // TODO: delete
      // const arrayBuffer = await file.arrayBuffer();
      // const base64 = arrayBufferToBase64(arrayBuffer);

      // const res = await fetch('/api/upload-paper', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ file: base64 }),
      // });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to upload PDF');
      }

      const { extractedText: text } = await res.json();
      setExtractedText(text);
      setStep('config');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedText || !user) return;

    setLoading(true);
    setError(null);
    setStep('generating');

    try {
      const res = await fetch('/api/generate-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedText, audienceLevel, timeLimit }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to generate slides');
      }

      const slides: Slide[] = await res.json();

      // Extract project name from first slide title or filename
      const projectName =
        slides[0]?.title || originalFileName?.replace('.pdf', '') || 'Untitled Project';

      // Create project in Firestore
      const projectId = await createProject(user.uid, {
        name: projectName,
        extractedText,
        config: { audienceLevel, timeLimit },
        slides,
        originalFileName: originalFileName || undefined,
      });

      // Navigate to the project editor
      router.push(`/projects/${projectId}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setStep('config');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-flow-canvas">
      <header className="border-b border-paper-flow-border bg-paper-flow-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="text-white hover:text-white/80">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <img
            src="/lineart_boat.png"
            alt="Paper Flow"
            className="h-12 w-auto rounded-xl"
          />
          <h1 className="text-2xl font-bold text-white">New Project</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        {step === 'upload' && (
          <div className="rounded-xl border border-paper-flow-border bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Upload a paper
            </h2>
            <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
              Select a PDF research paper to generate slides automatically.
            </p>

            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              disabled={loading}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />

            {loading && (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                Processing PDF...
              </p>
            )}
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
          </div>
        )}

        {step === 'config' && (
          <form
            onSubmit={handleGenerate}
            className="rounded-xl border border-paper-flow-border bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Presentation Settings
            </h2>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">Audience Level</label>
              <div className="flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
                {(['beginner', 'intermediate', 'expert'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setAudienceLevel(level)}
                    className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                      audienceLevel === level
                        ? 'bg-paper-flow-border text-white'
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

            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-paper-flow-border py-3 font-medium text-white hover:bg-paper-flow-border/80 disabled:opacity-50"
            >
              Generate Slides
            </button>
          </form>
        )}

        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-paper-flow-border bg-white p-12 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
            <p className="text-zinc-500 dark:text-zinc-400">
              Generating your presentation...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <AuthGuard>
      <NewProjectContent />
    </AuthGuard>
  );
}
