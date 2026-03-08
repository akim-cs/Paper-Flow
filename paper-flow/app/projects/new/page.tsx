'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/lib/firebase/AuthContext';
import { createProject } from '@/app/lib/firebase/firestore';
import AuthGuard from '@/components/auth/AuthGuard';
import type { Slide, PresentationConfig, Sections } from '@/app/types/slides';

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Config state
  const [audienceLevel, setAudienceLevel] =
    useState<PresentationConfig['audienceLevel']>('intermediate');
  const [researcherType, setResearcherType] =
    useState<PresentationConfig['researcherType'] | null>(null);
  const [presentationSize, setPresentationSize] =
    useState<PresentationConfig['presentationSize']>('medium');

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    setSelectedFile(file);
    setLoading(true);
    setError(null);
    setOriginalFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-paper', {
        method: 'POST',
        body: formData,
      });

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
    if (!loading && researcherType) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (loading || !researcherType) return;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
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
        body: JSON.stringify({ extractedText, audienceLevel, researcherType, presentationSize }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to generate slides');
      }

      const { slides, sections }: { slides: Slide[]; sections: Sections } = await res.json();

      // Extract project name from first slide title or filename
      const projectName =
        slides[0]?.title || originalFileName?.replace('.pdf', '') || 'Untitled Project';

      // Dev logging: verify bulletSources are present before save
      if (process.env.NODE_ENV === 'development') {
        slides.forEach((s, i) => {
          console.log(`[new/page] PRE-SAVE slide ${i} "${s.title}": ${s.bulletSources?.length ?? 0} bulletSources`);
        });
      }

      // Create project in Firestore
      const projectId = await createProject(user.uid, {
        name: projectName,
        extractedText,
        config: { audienceLevel, researcherType: researcherType!, presentationSize },
        slides,
        sections,
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
          <>
            {/* Researcher Type Selector Card */}
            <div className="mb-6 rounded-xl border border-paper-flow-border bg-white p-8">
              <h2 className="mb-2 text-xl font-semibold text-zinc-900">
                You are a
              </h2>
              <p className="mb-6 text-sm text-zinc-500">
                Select your role to help us tailor the presentation generation.
              </p>

              <div className="flex overflow-hidden rounded-lg border border-zinc-300">
                {(['author', 'academic'] as const).map((type, index) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setResearcherType(type)}
                    className={`flex flex-1 flex-col items-center gap-3 py-4 px-4 text-sm font-medium transition-colors ${
                      researcherType === type
                        ? 'bg-paper-flow-border text-white'
                        : 'bg-white text-zinc-700 hover:bg-zinc-100'
                    } ${index === 0 ? 'border-r border-zinc-300' : ''}`}
                  >
                    <svg
                      className={`h-12 w-12 ${
                        researcherType === type ? 'text-white' : 'text-zinc-400'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <circle cx="12" cy="12" r="10" strokeWidth={2} />
                      <circle cx="12" cy="9" r="3" strokeWidth={2} />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.168 18.849A4.5 4.5 0 0112 16.5a4.5 4.5 0 015.832 2.349"
                      />
                    </svg>
                    <span>{type === 'author' ? 'Author Researcher' : 'Academic Researcher'}</span>
                  </button>
                ))}
              </div>

              {researcherType && (
                <p className="mt-3 text-xs text-zinc-500">
                  {researcherType === 'author'
                    ? '✓ You authored this paper and will present your own research.'
                    : '✓ You are presenting someone else\'s research for academic purposes.'
                  }
                </p>
              )}
            </div>

            {/* Upload Card */}
            <div className="rounded-xl border border-paper-flow-border bg-white p-8">
              <h2 className="mb-2 text-xl font-semibold text-zinc-900">
                Upload a paper
              </h2>
              <p className="mb-6 text-sm text-zinc-500">
                Select a PDF research paper to generate slides automatically.
              </p>

              {/* Hidden native input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                disabled={loading || !researcherType}
                className="sr-only"
              />

              {/* Dropzone */}
              <div
                role="button"
                tabIndex={!loading && researcherType ? 0 : -1}
                aria-label="Upload PDF — click or drag and drop"
                onClick={() => !loading && researcherType && fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!loading && researcherType) fileInputRef.current?.click();
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={[
                  'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-150 outline-none',
                  isDragOver
                    ? 'border-paper-flow-border bg-paper-flow-canvas-solid/30'
                    : 'border-zinc-300 hover:border-paper-flow-border hover:bg-paper-flow-canvas/30',
                  loading || !researcherType
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

              {!researcherType && (
                <p className="mt-3 text-xs text-zinc-400">
                  Please select your role above to enable upload.
                </p>
              )}
              {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
            </div>
          </>
        )}

        {step === 'config' && (
          <form
            onSubmit={handleGenerate}
            className="rounded-xl border border-paper-flow-border bg-white p-8"
          >
            <h2 className="mb-6 text-xl font-semibold text-zinc-900">
              Presentation Settings
            </h2>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">Audience Level</label>
              <div className="flex overflow-hidden rounded-lg border border-zinc-300">
                {(['beginner', 'intermediate', 'expert'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setAudienceLevel(level)}
                    className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                      audienceLevel === level
                        ? 'bg-paper-flow-border text-white'
                        : 'bg-white text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">Presentation Length</label>
              <div className="flex overflow-hidden rounded-lg border border-zinc-300">
                {([
                  { value: 'short', label: 'Short', hint: '~5 slides' },
                  { value: 'medium', label: 'Medium', hint: '~8 slides' },
                  { value: 'long',  label: 'Long',   hint: '~12 slides' },
                ] as const).map(({ value, label, hint }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPresentationSize(value)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      presentationSize === value
                        ? 'bg-paper-flow-border text-white'
                        : 'bg-white text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {label}
                    <span className={`ml-1 text-xs ${presentationSize === value ? 'text-white/70' : 'text-zinc-400'}`}>
                      {hint}
                    </span>
                  </button>
                ))}
              </div>
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
          <div className="flex flex-col items-center justify-center rounded-xl border border-paper-flow-border bg-white p-12">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900" />
            <p className="text-zinc-500">
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
