'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/lib/firebase/AuthContext';
import { getUserProjects, deleteProject } from '@/app/lib/firebase/firestore';
import AuthGuard from '@/components/auth/AuthGuard';
import ProjectList from '@/components/projects/ProjectList';
import type { Project } from '@/app/types/project';

function ProjectsContent() {
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      if (!user) return;

      try {
        const userProjects = await getUserProjects(user.uid);
        setProjects(userProjects);
      } catch (err) {
        console.error('Failed to load projects:', err);
        // If query fails (e.g., missing index), treat as empty rather than error
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [user]);

  const handleDelete = async (projectId: string) => {
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-paper-flow-canvas">
      <header className="border-b border-paper-flow-border bg-paper-flow-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/lineart_boat.png"
              alt="Paper Flow"
              className="h-12 w-auto rounded-xl"
            />
            <h1 className="text-2xl font-bold text-white">Paper Flow</h1>
          </div>
          <div className="flex items-center gap-4">
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="h-8 w-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-sm text-white">{user?.displayName}</span>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Your Projects
          </h2>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 rounded-lg bg-paper-flow-border px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-paper-flow-border/80"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Project
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-zinc-500">Loading projects...</div>
          </div>
        )}

        {!loading && (
          <ProjectList projects={projects} onDelete={handleDelete} />
        )}
      </main>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <ProjectsContent />
    </AuthGuard>
  );
}
