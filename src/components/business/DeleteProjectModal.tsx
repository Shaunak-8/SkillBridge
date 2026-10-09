'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { businessRequest, FormError } from '@/lib/business/client';

interface DeleteProjectModalProps {
  project: { id: string; title?: string | null } | null;
  onClose: () => void;
  onDeleted: (deletedId: string) => void;
}

export function DeleteProjectModal({ project, onClose, onDeleted }: DeleteProjectModalProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!project) return null;

  const isConfirmed = confirmInput.trim().toLowerCase() === 'confirm';
  const displayTitle = project.title || 'Untitled Project';

  const handleDelete = async () => {
    if (!isConfirmed || deleting) return;
    setDeleting(true);
    setError('');

    try {
      await businessRequest(`/api/business/projects/${project.id}`, 'DELETE');
      onDeleted(project.id);
      onClose();
    } catch (err) {
      if (err instanceof FormError) {
        setError(err.message);
      } else {
        setError('Failed to delete project. Please try again.');
      }
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line">
        <button
          onClick={onClose}
          disabled={deleting}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-ink transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 text-rose-600 mb-3">
          <div className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">Delete Project</h3>
            <p className="text-xs text-muted">This action is permanent and cannot be undone.</p>
          </div>
        </div>

        <div className="my-4 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 text-sm">
          <p className="font-semibold text-slate-800 break-words">{displayTitle}</p>
          <p className="text-xs text-muted mt-1">ID: <code className="text-[11px] bg-slate-200/70 px-1 py-0.5 rounded font-mono">{project.id}</code></p>
        </div>

        <div className="space-y-3 text-sm">
          <label htmlFor="confirm-delete-input" className="block text-xs font-semibold text-slate-700">
            To confirm deletion, please type <span className="font-bold text-rose-600 uppercase">confirm</span> in the box below:
          </label>
          <input
            id="confirm-delete-input"
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="Type 'confirm' here"
            disabled={deleting}
            className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            autoFocus
          />
        </div>

        {error && (
          <p className="mt-3 text-xs font-medium text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={deleting}
            className="text-sm font-semibold text-slate-600"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleDelete()}
            disabled={!isConfirmed || deleting}
            className="gap-2 bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
          >
            <Trash2 size={15} />
            <span>{deleting ? 'Deleting...' : 'Delete Project'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
