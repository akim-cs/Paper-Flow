'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/lib/firebase/AuthContext';
import { getProject, updateProject } from '@/app/lib/firebase/firestore';
import AuthGuard from '@/components/auth/AuthGuard';
import SlidesFlow from '@/components/SlidesFlow';
import type { Project } from '@/app/types/project';
import type { Slide } from '@/app/types/slides';

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

function ProjectEditorContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const slidesRef = useRef<Slide[]>([]);

  useEffect(() => {
    async function loadProject() {
      if (!user) return;

      try {
        const loadedProject = await getProject(projectId);

        if (!loadedProject) {
          setError('Project not found');
          return;
        }

        if (loadedProject.userId !== user.uid) {
          setError('You do not have access to this project');
          return;
        }

        setProject(loadedProject);
        setSlides(loadedProject.slides);
        slidesRef.current = loadedProject.slides;
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId, user]);

  const saveSlides = useCallback(async (slidesToSave: Slide[]) => {
    setSaveStatus('saving');
    try {
      await updateProject(projectId, { slides: slidesToSave });
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('error');
    }
  }, [projectId]);

  const handleSlidesChange = useCallback((newSlides: Slide[]) => {
    setSlides(newSlides);
    slidesRef.current = newSlides;
    setSaveStatus('unsaved');

    // Debounced auto-save (2 second delay)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveSlides(slidesRef.current);
    }, 2000);
  }, [saveSlides]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Save on page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-flow-canvas">
        <div className="text-zinc-500">Loading project...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper-flow-canvas">
        <div className="mb-4 text-red-500">{error}</div>
        <Link
          href="/projects"
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          Back to projects
        </Link>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex min-h-screen flex-col bg-paper-flow-canvas">
      <header className="border-b border-paper-flow-border bg-paper-flow-border px-6 py-4">
        <div className="flex items-center justify-between">
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
            <div>
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>{slides.length} slides</span>
                <span>·</span>
                <span>{project.config.timeLimit} min</span>
                <span>·</span>
                <span className="capitalize">{project.config.audienceLevel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-sm ${
                saveStatus === 'saved'
                  ? 'text-green-400'
                  : saveStatus === 'saving'
                  ? 'text-yellow-400'
                  : saveStatus === 'error'
                  ? 'text-red-400'
                  : 'text-white/50'
              }`}
            >
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'unsaved' && 'Unsaved changes'}
              {saveStatus === 'error' && 'Save failed'}
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm text-white/70">
          Rearrange nodes by dragging; disconnect edges with{' '}
          <kbd className="rounded border border-white/30 bg-white/10 px-1.5 py-0.5 font-mono text-xs">
            Delete
          </kbd>
          /{' '}
          <kbd className="rounded border border-white/30 bg-white/10 px-1.5 py-0.5 font-mono text-xs">
            Backspace
          </kbd>
          .
        </p>
      </header>

      <main className="flex-1 p-6">
        <SlidesFlow slides={slides} onSlidesChange={handleSlidesChange} />
      </main>
    </div>
  );
}

export default function ProjectEditorPage() {
  return (
    <AuthGuard>
      <ProjectEditorContent />
    </AuthGuard>
  );
}
