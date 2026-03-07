'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Project } from '@/app/types/project';

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => Promise<void>;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(project.id);
    } catch (error) {
      console.error('Failed to delete project:', error);
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const formatDate = (timestamp: { toDate: () => Date } | undefined) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="group relative rounded-xl border border-paper-flow-border bg-white p-5 transition-shadow hover:shadow-md">
      <Link href={`/projects/${project.id}`} className="block">
        <h3 className="mb-2 text-lg font-semibold text-zinc-900 line-clamp-2">
          {project.name}
        </h3>
        <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
          <span>{project.slides.length} slides</span>
          <span>·</span>
          <span>{project.config.timeLimit} min</span>
          <span>·</span>
          <span className="capitalize">{project.config.audienceLevel}</span>
        </div>
        {project.originalFileName && (
        <p className="mb-3 truncate text-sm text-zinc-400">
          {project.originalFileName}
        </p>
        )}
        <p className="text-xs text-zinc-400">
          Updated {formatDate(project.updatedAt)}
        </p>
      </Link>

      <button
        onClick={(e) => {
          e.preventDefault();
          setShowConfirm(true);
        }}
        className="absolute right-3 top-3 rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-red-500 group-hover:opacity-100"
        title="Delete project"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>

      {showConfirm && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/95">
          <div className="text-center">
            <p className="mb-4 text-sm text-zinc-700">
              Delete this project?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
