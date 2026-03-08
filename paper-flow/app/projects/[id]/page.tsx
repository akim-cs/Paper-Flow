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
  const [projectName, setProjectName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const slidesRef = useRef<Slide[]>([]);
  const nameRef = useRef<string>('');

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

        // Dev logging: verify bulletSources survived the Firestore round-trip
        if (process.env.NODE_ENV === 'development') {
          loadedProject.slides.forEach((s: Slide, i: number) => {
            console.log(`[projects/[id]] POST-LOAD slide ${i} "${s.title}": ${s.bulletSources?.length ?? 0} bulletSources`);
          });
        }

        setProject(loadedProject);
        setSlides(loadedProject.slides);
        setProjectName(loadedProject.name);
        slidesRef.current = loadedProject.slides;
        nameRef.current = loadedProject.name;
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

  const saveProjectName = useCallback(async (name: string) => {
    setSaveStatus('saving');
    try {
      await updateProject(projectId, { name });
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save project name:', err);
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

  const handleNameChange = useCallback((newName: string) => {
    setProjectName(newName);
    nameRef.current = newName;
    setSaveStatus('unsaved');

    // Debounced auto-save (2 second delay)
    if (nameTimeoutRef.current) {
      clearTimeout(nameTimeoutRef.current);
    }

    nameTimeoutRef.current = setTimeout(() => {
      saveProjectName(nameRef.current);
    }, 2000);
  }, [saveProjectName]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (nameTimeoutRef.current) {
        clearTimeout(nameTimeoutRef.current);
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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Link href="/projects" className="text-white hover:text-white/80 flex-shrink-0">
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
              className="h-12 w-auto rounded-xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={projectName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="bg-transparent text-xl font-bold text-white outline-none border-none focus:ring-0 px-0 py-0 w-full placeholder:text-white/50"
                placeholder="Untitled Project"
              />
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>{slides.length} slides</span>
                <span>·</span>
                <span>{project.config.timeLimit} min</span>
                <span>·</span>
                <span className="capitalize">{project.config.audienceLevel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
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
        <SlidesFlow slides={slides} onSlidesChange={handleSlidesChange} config={project.config} sections={project.sections} />
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
