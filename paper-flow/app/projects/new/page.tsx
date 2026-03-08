'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/lib/firebase/AuthContext';
import { createProject } from '@/app/lib/firebase/firestore';
import AuthGuard from '@/components/auth/AuthGuard';
import type { Slide, PresentationConfig, Sections, OutlineItem } from '@/app/types/slides';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'extracting' | 'sections' | 'config' | 'outline' | 'generating';
type ExtractPhase = 'text' | 'sections';
type SectionKey = 'abstract' | 'introduction' | 'methodology' | 'results' | 'discussion' | 'conclusion';

// ─── Constants ────────────────────────────────────────────────────────────────

const CANONICAL_SECTIONS: SectionKey[] = [
  'abstract', 'introduction', 'methodology', 'results', 'discussion', 'conclusion',
];

const SECTION_LABELS: Record<SectionKey, string> = {
  abstract: 'Abstract',
  introduction: 'Introduction',
  methodology: 'Methodology',
  results: 'Results',
  discussion: 'Discussion',
  conclusion: 'Conclusion',
};

// Indices 0-1 are already complete before the user reaches this step.
// Indices 2-5 map to the stage numbers emitted by /api/generate-slides SSE.
const GENERATION_STAGES = [
  'Paper structure confirmed',  // 0 — done: sections reviewed
  'Outline approved',           // 1 — done: outline reviewed and edited
  'Generating slide content',   // 2 — SLIDES_PROMPT (always runs)
  'Validating citations',       // 3 — REPAIR_SLIDES_PROMPT (only if needed)
  'Building slide nodes',       // 4 — markdown parse (always runs)
  'Matching sources',           // 5 — attribution fallback (only if needed)
];

const VISIBLE_STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'sections', label: 'Sections' },
  { key: 'config', label: 'Configure' },
  { key: 'outline', label: 'Outline' },
  { key: 'generating', label: 'Generate' },
];

// Step order used to compute "done" state in the indicator
const STEP_ORDER: Step[] = ['upload', 'extracting', 'sections', 'config', 'outline', 'generating'];

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="flex items-start justify-center gap-1 border-b border-paper-flow-border/20 bg-white px-6 py-3">
      {VISIBLE_STEPS.map((s, i) => {
        const sIndex = STEP_ORDER.indexOf(s.key);
        const isDone = sIndex < currentIndex;
        // "extracting" is visually part of the upload step
        const isActive =
          s.key === currentStep ||
          (currentStep === 'extracting' && s.key === 'upload');

        return (
          <div key={s.key} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className={`h-px w-8 mt-3 ${isDone ? 'bg-paper-flow-border' : 'bg-zinc-200'}`}
              />
            )}
            <div className="flex flex-col items-center gap-1 w-16">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isDone
                    ? 'bg-paper-flow-border text-white'
                    : isActive
                    ? 'bg-paper-flow-border text-white ring-2 ring-paper-flow-border/30 ring-offset-2'
                    : 'bg-zinc-100 text-zinc-400'
                }`}
              >
                {isDone ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs text-center leading-tight ${
                  isActive ? 'text-paper-flow-text font-medium' : 'text-zinc-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function NewProjectContent() {
  const { user } = useAuth();
  const router = useRouter();

  // Flow state
  const [step, setStep] = useState<Step>('upload');
  const [extractPhase, setExtractPhase] = useState<ExtractPhase>('text');

  // Data state
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [sections, setSections] = useState<Sections | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [originalFileName, setOriginalFileName] = useState<string | null>(null);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionKey>('abstract');
  const [generationStage, setGenerationStage] = useState(0);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Config state
  const [audienceLevel, setAudienceLevel] =
    useState<PresentationConfig['audienceLevel']>('intermediate');
  const [researcherType, setResearcherType] =
    useState<PresentationConfig['researcherType'] | null>(null);
  const [presentationSize, setPresentationSize] =
    useState<PresentationConfig['presentationSize']>('medium');

  // ── File processing ──────────────────────────────────────────────────────

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setOriginalFileName(file.name);
    setExtractPhase('text');
    setStep('extracting');

    try {
      // Phase 1: extract raw text
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload-paper', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data?.error || 'Failed to upload PDF');
      }

      const { extractedText: text } = await uploadRes.json();
      setExtractedText(text);

      // Phase 2: parse sections (non-fatal if it fails)
      setExtractPhase('sections');
      try {
        const sectionsRes = await fetch('/api/parse-sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extractedText: text }),
        });

        if (sectionsRes.ok) {
          const { sections: parsed } = await sectionsRes.json();
          setSections(parsed);
          // Pre-select the first detected section
          for (const key of CANONICAL_SECTIONS) {
            if (parsed[key]?.trim()) {
              setSelectedSection(key);
              break;
            }
          }
        }
      } catch {
        // Section parsing failure is non-fatal; user can still continue
      }

      setStep('sections');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setSelectedFile(null);
      setStep('upload');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (researcherType) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!researcherType) return;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // ── Step transitions ─────────────────────────────────────────────────────

  const handleContinueToConfig = () => setStep('config');

  /**
   * Calls OUTLINE_PROMPT via /api/generate-outline using the already-parsed
   * sections and the user's config choices. Transitions to the outline step
   * immediately and shows a loading state while the response arrives.
   */
  const fetchOutline = async () => {
    if (!sections) return;
    setOutlineLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections,
          config: { audienceLevel, researcherType, presentationSize },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to generate outline');
      }
      const { outline: generated }: { outline: OutlineItem[] } = await res.json();
      setOutline(generated);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate outline');
    } finally {
      setOutlineLoading(false);
    }
  };

  const handleContinueToOutline = () => {
    setStep('outline');
    fetchOutline();
  };

  const handleUpdateOutlineTitle = (index: number, newTitle: string) => {
    setOutline((prev) => prev.map((item, i) => (i === index ? { ...item, title: newTitle } : item)));
  };

  // ── Re-parse sections ─────────────────────────────────────────────────────

  const handleReparseSections = async () => {
    if (!extractedText) return;
    setSections(null);
    setError(null);
    try {
      const res = await fetch('/api/parse-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedText }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to re-parse sections');
      }
      const { sections: parsed } = await res.json();
      setSections(parsed);
      // Re-select the first detected section
      for (const key of CANONICAL_SECTIONS) {
        if (parsed[key]?.trim()) { setSelectedSection(key); break; }
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to re-parse sections');
    }
  };

  // ── Generation ───────────────────────────────────────────────────────────

  /**
   * Streams generation progress from /api/generate-slides via SSE.
   * Updates generationStage in real-time as each Gemini call completes.
   * Navigates to the editor only after the final 'done' event arrives.
   *
   * Stages 0-1 are pre-marked as done (sections + outline already reviewed).
   * Stages 2-5 are driven by real server events.
   */
  const handleGenerate = async () => {
    if (!sections || !user) return;

    // Show stages 0-1 as already done; stage 2 is "current" while we wait for
    // the first SSE event from the server.
    setGenerationStage(2);
    setError(null);
    setStep('generating');

    try {
      const res = await fetch('/api/generate-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outline,
          sections,
          config: { audienceLevel, researcherType, presentationSize },
        }),
      });

      // Non-2xx before stream starts means a hard error (bad request, etc.)
      if (!res.ok || !res.body) {
        let message = 'Failed to generate slides';
        try { message = (await res.json())?.error || message; } catch { /* no-op */ }
        throw new Error(message);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalSlides: Slide[] | null = null;

      // Read the SSE stream until the server closes it
      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by blank lines (\n\n)
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? ''; // keep any incomplete trailing fragment

        for (const part of parts) {
          const dataLine = part.trim();
          if (!dataLine.startsWith('data: ')) continue;

          let event: { type: string; stage?: number; slides?: Slide[]; message?: string };
          try {
            event = JSON.parse(dataLine.slice(6));
          } catch {
            continue; // skip malformed event
          }

          if (event.type === 'stage' && typeof event.stage === 'number') {
            setGenerationStage(event.stage);
          } else if (event.type === 'done' && event.slides) {
            finalSlides = event.slides;
            setGenerationStage(GENERATION_STAGES.length - 1);
            break outer; // stream will close after this
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Generation failed');
          }
        }
      }

      if (!finalSlides) throw new Error('No slides received from generation pipeline');

      if (process.env.NODE_ENV === 'development') {
        finalSlides.forEach((s, i) =>
          console.log(`[new/page] PRE-SAVE slide ${i} "${s.title}": ${s.bulletSources?.length ?? 0} bulletSources`)
        );
      }

      const projectName =
        finalSlides[0]?.title || originalFileName?.replace('.pdf', '') || 'Untitled Project';

      const projectId = await createProject(user.uid, {
        name: projectName,
        extractedText: extractedText ?? '',
        config: { audienceLevel, researcherType: researcherType!, presentationSize },
        slides: finalSlides,
        sections,
        originalFileName: originalFileName || undefined,
      });

      router.push(`/projects/${projectId}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setStep('outline');
    }
  };

  // ── Shared UI pieces ─────────────────────────────────────────────────────

  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-paper-flow-canvas">
      {/* Header */}
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
          <img src="/lineart_boat.png" alt="Paper Flow" className="h-12 w-auto rounded-xl" />
          <h1 className="text-2xl font-bold text-white">New Project</h1>
        </div>
      </header>

      {/* Step indicator — hidden during full-screen loading steps */}
      {step !== 'extracting' && step !== 'generating' && (
        <StepIndicator currentStep={step} />
      )}

      {/* ── Step 1: Upload ───────────────────────────────────────────────── */}
      {step === 'upload' && (
        <main className="mx-auto max-w-2xl px-6 py-12">
          {/* Researcher type selector */}
          <div className="mb-6 rounded-xl border border-paper-flow-border bg-white p-8">
            <h2 className="mb-2 text-xl font-semibold text-zinc-900">You are a</h2>
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
                    className={`h-12 w-12 ${researcherType === type ? 'text-white' : 'text-zinc-400'}`}
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
                  : "✓ You are presenting someone else's research for academic purposes."}
              </p>
            )}
          </div>

          {/* Upload dropzone */}
          <div className="rounded-xl border border-paper-flow-border bg-white p-8">
            <h2 className="mb-2 text-xl font-semibold text-zinc-900">Upload a paper</h2>
            <p className="mb-6 text-sm text-zinc-500">
              Select a PDF research paper to generate slides automatically.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              disabled={!researcherType}
              className="sr-only"
            />

            <div
              role="button"
              tabIndex={researcherType ? 0 : -1}
              aria-label="Upload PDF — click or drag and drop"
              onClick={() => researcherType && fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && researcherType) {
                  e.preventDefault();
                  fileInputRef.current?.click();
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
                !researcherType
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-paper-flow-border focus-visible:ring-offset-2',
              ].join(' ')}
            >
              {selectedFile ? (
                <>
                  <svg
                    className="h-10 w-10 text-paper-flow-border"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-paper-flow-text">{selectedFile.name}</p>
                  <p className="text-xs text-zinc-400">Click to choose a different file</p>
                </>
              ) : (
                <>
                  <svg
                    className={`h-10 w-10 transition-colors ${isDragOver ? 'text-paper-flow-border' : 'text-zinc-300'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
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
        </main>
      )}

      {/* ── Step 1b: Extracting (loading) ─────────────────────────────────── */}
      {step === 'extracting' && (
        <main className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center gap-8 px-6">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-zinc-200 border-t-paper-flow-border" />
          <div className="text-center">
            <p className="text-lg font-semibold text-paper-flow-text">
              {extractPhase === 'text'
                ? 'Extracting text from PDF…'
                : 'Analyzing paper structure…'}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {extractPhase === 'text'
                ? 'Reading and parsing your document'
                : 'Detecting abstract, introduction, methodology, results…'}
            </p>
          </div>
          {/* Two-phase progress bar */}
          <div className="flex items-center gap-2">
            {(['text', 'sections'] as const).map((phase) => (
              <div
                key={phase}
                className={`h-2 w-20 rounded-full transition-colors ${
                  extractPhase === phase
                    ? 'bg-paper-flow-border'
                    : phase === 'text'
                    ? 'bg-paper-flow-border/40'
                    : 'bg-zinc-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-300">
            {extractPhase === 'text' ? 'Step 1 of 2' : 'Step 2 of 2'}
          </p>
        </main>
      )}

      {/* ── Step 2: Section Review ────────────────────────────────────────── */}
      {step === 'sections' && (
        <main className="flex flex-col px-6 py-6" style={{ height: 'calc(100vh - 130px)' }}>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-paper-flow-text">Review Detected Sections</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Confirm that PaperFlow correctly identified each section of your paper.
            </p>
          </div>

          {/* Split pane */}
          <div className="flex flex-1 overflow-hidden rounded-xl border border-paper-flow-border bg-white">
            {/* Left: section list */}
            <div className="flex w-60 flex-shrink-0 flex-col border-r border-paper-flow-border/30">
              <div className="border-b border-paper-flow-border/20 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Sections
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {CANONICAL_SECTIONS.map((key) => {
                  const detected = !!(sections?.[key]?.trim());
                  const heading = sections?.headings?.[key];
                  const isSelected = selectedSection === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedSection(key)}
                      className={`w-full border-l-2 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? 'border-paper-flow-border bg-paper-flow-canvas-solid/50'
                          : 'border-transparent hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 flex-shrink-0 rounded-full ${
                            detected ? 'bg-green-400' : 'bg-zinc-300'
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            isSelected ? 'text-paper-flow-text' : 'text-zinc-700'
                          }`}
                        >
                          {SECTION_LABELS[key]}
                        </span>
                      </div>
                      {heading && (
                        <p className="ml-4 mt-0.5 truncate text-xs text-zinc-400">"{heading}"</p>
                      )}
                      {!detected && (
                        <p className="ml-4 mt-0.5 text-xs text-zinc-400">Not detected</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: section content preview */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-paper-flow-border/20 px-6 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-paper-flow-text">
                    {SECTION_LABELS[selectedSection]}
                  </h3>
                  {sections?.headings?.[selectedSection] && (
                    <p className="mt-0.5 text-xs text-zinc-400">
                      "{sections.headings[selectedSection]}"
                    </p>
                  )}
                </div>
                {sections?.[selectedSection]?.trim() ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    Detected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                    Not detected
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {sections?.[selectedSection]?.trim() ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                    {sections[selectedSection].slice(0, 2400)}
                    {sections[selectedSection].length > 2400 && (
                      <span className="text-zinc-400"> …(truncated for preview)</span>
                    )}
                  </p>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <svg
                      className="mb-3 h-12 w-12 text-zinc-200"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm text-zinc-400">
                      This section was not detected in your paper.
                    </p>
                    <p className="mt-1 text-xs text-zinc-300">
                      Content may be present under a different heading.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-4 flex items-center justify-between">
            <BackButton onClick={() => setStep('upload')} />
            <div className="flex gap-3">
              <button
                onClick={handleReparseSections}
                disabled={!extractedText}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Re-parse Sections
              </button>
              <button
                onClick={handleContinueToConfig}
                className="rounded-lg bg-paper-flow-border px-5 py-2 text-sm font-medium text-white hover:bg-paper-flow-border/80"
              >
                Continue to Configuration
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ── Step 3: Configuration ─────────────────────────────────────────── */}
      {step === 'config' && (
        <main className="mx-auto max-w-2xl px-6 py-12">
          <div className="rounded-xl border border-paper-flow-border bg-white p-8">
            <h2 className="mb-6 text-xl font-semibold text-zinc-900">Presentation Settings</h2>

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

            <div className="mb-8">
              <label className="mb-2 block text-sm font-medium">Presentation Length</label>
              <div className="flex overflow-hidden rounded-lg border border-zinc-300">
                {([
                  { value: 'short', label: 'Short', hint: '~5 slides' },
                  { value: 'medium', label: 'Medium', hint: '~8 slides' },
                  { value: 'long', label: 'Long', hint: '~12 slides' },
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
                    <span
                      className={`ml-1 text-xs ${
                        presentationSize === value ? 'text-white/70' : 'text-zinc-400'
                      }`}
                    >
                      {hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

            <div className="flex items-center justify-between">
              <BackButton onClick={() => setStep('sections')} />
              <button
                onClick={handleContinueToOutline}
                className="rounded-lg bg-paper-flow-border px-5 py-2 text-sm font-medium text-white hover:bg-paper-flow-border/80"
              >
                Continue to Outline
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ── Step 4: Outline Review ────────────────────────────────────────── */}
      {step === 'outline' && (
        <main className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-paper-flow-text">Review Draft Outline</h2>
            <p className="mt-1 text-sm text-zinc-500">
              These slides will be generated from your paper. Edit titles as needed, then approve to
              start generation.
            </p>
          </div>

          {/* Loading state while OUTLINE_PROMPT runs */}
          {outlineLoading ? (
            <div className="mb-6 flex flex-col items-center justify-center gap-4 rounded-xl border border-paper-flow-border/30 bg-white py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-paper-flow-border" />
              <p className="text-sm text-zinc-500">Generating outline from paper sections…</p>
            </div>
          ) : (
            <div className="mb-6 space-y-3">
              {outline.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
                  <p className="text-sm text-zinc-400">
                    No outline items — sections may not have been detected.
                  </p>
                  <p className="mt-1 text-xs text-zinc-300">
                    You can regenerate the outline or proceed to generate slides.
                  </p>
                </div>
              ) : (
                outline.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 rounded-xl border border-paper-flow-border/40 bg-white p-4 shadow-sm"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-paper-flow-canvas-solid">
                      <span className="text-sm font-semibold text-paper-flow-text">{index + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateOutlineTitle(index, e.target.value)}
                        className="w-full border-0 border-b border-transparent bg-transparent pb-0.5 text-sm font-medium text-zinc-900 hover:border-zinc-200 focus:border-paper-flow-border focus:outline-none"
                      />
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-paper-flow-canvas-solid/60 px-2 py-0.5 text-xs capitalize text-paper-flow-text/70">
                          {item.source_section}
                        </span>
                        {item.paper_heading && item.paper_heading !== item.title && (
                          <span className="truncate text-xs text-zinc-400">
                            "{item.paper_heading}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-between">
            <BackButton onClick={() => setStep('config')} />
            <div className="flex gap-3">
              <button
                onClick={fetchOutline}
                disabled={outlineLoading || !sections}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Regenerate Outline
              </button>
              <button
                onClick={handleGenerate}
                disabled={outlineLoading || !sections}
                className="rounded-lg bg-paper-flow-border px-5 py-2 text-sm font-medium text-white hover:bg-paper-flow-border/80 disabled:opacity-50"
              >
                Approve and Generate Slides
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ── Step 5: Generation Progress ───────────────────────────────────── */}
      {step === 'generating' && (
        <main className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center gap-10 px-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-paper-flow-text">
              Building your presentation
            </h2>
            <p className="mt-2 text-sm text-zinc-400">This may take a minute…</p>
          </div>

          <div className="w-full max-w-xs space-y-4">
            {GENERATION_STAGES.map((stage, index) => {
              const isDone = index < generationStage;
              const isCurrent = index === generationStage;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                      isDone
                        ? 'bg-green-400'
                        : isCurrent
                        ? 'bg-paper-flow-border'
                        : 'bg-zinc-200'
                    }`}
                  >
                    {isDone ? (
                      <svg
                        className="h-3.5 w-3.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isCurrent ? (
                      <div className="h-3 w-3 animate-pulse rounded-full bg-white" />
                    ) : null}
                  </div>
                  <span
                    className={`text-sm transition-colors ${
                      isDone
                        ? 'text-zinc-400 line-through'
                        : isCurrent
                        ? 'font-medium text-paper-flow-text'
                        : 'text-zinc-300'
                    }`}
                  >
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>
        </main>
      )}
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
