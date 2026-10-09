// src/components/student/PortfolioSection.tsx
// Workstream 4: Portfolio manager with full CRUD, safe external links, and delete confirmation

import React, { useState } from "react";
import {
  AlertCircle,
  Briefcase,
  Check,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { PortfolioItemInput, StudentPortfolioItemDTO } from "@/types/student";
import { validatePortfolioInput } from "@/lib/validation/student";
import { SkillTagInput } from "./SkillTagInput";

interface PortfolioSectionProps {
  items: StudentPortfolioItemDTO[];
  onItemCreated: (newItem: StudentPortfolioItemDTO) => void;
  onItemUpdated: (updatedItem: StudentPortfolioItemDTO) => void;
  onItemDeleted: (deletedItemId: string) => void;
}

export function PortfolioSection({
  items,
  onItemCreated,
  onItemUpdated,
  onItemDeleted,
}: PortfolioSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StudentPortfolioItemDTO | null>(null);
  const [itemToDelete, setItemToDelete] = useState<StudentPortfolioItemDTO | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [skillsUsed, setSkillsUsed] = useState<string[]>([]);
  const [projectUrl, setProjectUrl] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle("");
    setRole("");
    setDescription("");
    setSkillsUsed([]);
    setProjectUrl("");
    setFormErrors({});
    setGlobalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: StudentPortfolioItemDTO) => {
    setEditingItem(item);
    setTitle(item.title);
    setRole(item.role || "");
    setDescription(item.description);
    setSkillsUsed(item.skillsUsed || []);
    setProjectUrl(item.projectUrl || "");
    setFormErrors({});
    setGlobalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setGlobalError(null);

    const payload: PortfolioItemInput = {
      title,
      role: role.trim() || undefined,
      description,
      skillsUsed,
      projectUrl: projectUrl.trim() || undefined,
    };

    const validation = validatePortfolioInput(payload);
    if (!validation.valid || !validation.sanitized) {
      setFormErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        // PATCH existing item
        const res = await fetch(`/api/students/me/portfolio/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validation.sanitized),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || "Failed to update project");
        }
        onItemUpdated(json.data);
      } else {
        // POST new item
        const res = await fetch("/api/students/me/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validation.sanitized),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || "Failed to add project");
        }
        onItemCreated(json.data);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setGlobalError(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setGlobalError(null);

    try {
      const res = await fetch(`/api/students/me/portfolio/${itemToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to delete project");
      }
      onItemDeleted(itemToDelete.id);
      setItemToDelete(null);
    } catch (err: any) {
      setGlobalError(err.message || "Could not delete project. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-4">
      {/* Header and Add button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Portfolio & Built Work</h2>
          <p className="text-xs text-muted">
            Share practical proof of what you have built or contributed to.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="btn-press inline-flex items-center justify-center gap-2 rounded-xl border-1.5 border-charcoal bg-saffron px-4 py-2.5 text-xs font-bold text-charcoal shadow-brutal hover:bg-saffron-dark hover:text-white transition"
        >
          <Plus size={16} />
          Add Project
        </button>
      </div>

      {globalError && (
        <div className="flex items-center gap-2 rounded-xl border border-terracotta/40 bg-terracotta/10 p-3 text-xs text-terracotta-dark">
          <AlertCircle size={16} className="shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Portfolio items list or empty state */}
      {items.length === 0 ? (
        <div className="rounded-2xl border-1.5 border-dashed border-charcoal/25 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-charcoal/20 bg-warmCanvas text-charcoal">
            <Briefcase size={22} />
          </div>
          <h3 className="mt-4 font-bold text-ink">No portfolio projects yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
            Projects help local shopkeepers and businesses understand what you can build. It can be a college project, a small business website, or personal tool!
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border-1.5 border-charcoal bg-warmCanvas px-4 py-2 text-xs font-bold text-charcoal shadow-brutal hover:bg-saffron hover:text-charcoal transition"
          >
            <Plus size={15} />
            Add your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border-1.5 border-charcoal/20 bg-white p-5 shadow-brutal transition-all hover:border-charcoal/40"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-ink leading-snug">{item.title}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      aria-label={`Edit ${item.title}`}
                      className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink transition"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      aria-label={`Delete ${item.title}`}
                      className="rounded-lg p-1.5 text-muted hover:bg-terracotta/10 hover:text-terracotta transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {item.role && (
                  <p className="mt-1 text-xs font-semibold text-saffron-dark">
                    Role: {item.role}
                  </p>
                )}

                <p className="mt-2.5 text-xs leading-relaxed text-muted line-clamp-3">
                  {item.description}
                </p>

                {item.skillsUsed && item.skillsUsed.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.skillsUsed.map((skill, sIdx) => (
                      <span
                        key={`${skill}-${sIdx}`}
                        className="rounded-md border border-charcoal/15 bg-warmCanvas px-2 py-0.5 text-[11px] font-medium text-charcoal"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {item.projectUrl && (
                <div className="mt-4 border-t border-line pt-3">
                  <a
                    href={item.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                  >
                    <span>View project link</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border-2 border-charcoal bg-white p-6 shadow-brutal-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-ink">
                {editingItem ? "Edit Portfolio Project" : "Add Portfolio Project"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Local Kirana Order Counter Web App"
                  maxLength={120}
                  className="mt-1.5 w-full rounded-xl border-1.5 border-charcoal/20 bg-warmCanvas px-3.5 py-2.5 text-xs text-ink placeholder:text-muted outline-none focus:border-charcoal focus:ring-2 focus:ring-charcoal/10"
                />
                {formErrors.title && (
                  <p className="mt-1 text-xs text-terracotta">{formErrors.title}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                  Your Role / Contribution
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Lead Frontend Builder, UX Designer, Solo Creator"
                  maxLength={120}
                  className="mt-1.5 w-full rounded-xl border-1.5 border-charcoal/20 bg-warmCanvas px-3.5 py-2.5 text-xs text-ink placeholder:text-muted outline-none focus:border-charcoal focus:ring-2 focus:ring-charcoal/10"
                />
                {formErrors.role && (
                  <p className="mt-1 text-xs text-terracotta">{formErrors.role}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="flex justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Description *
                  </label>
                  <span className="text-[11px] text-muted">{description.length}/2000</span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what the project was, who used it, and what problem it solved..."
                  maxLength={2000}
                  className="mt-1.5 w-full rounded-xl border-1.5 border-charcoal/20 bg-warmCanvas px-3.5 py-2.5 text-xs text-ink placeholder:text-muted outline-none focus:border-charcoal focus:ring-2 focus:ring-charcoal/10"
                />
                {formErrors.description && (
                  <p className="mt-1 text-xs text-terracotta">{formErrors.description}</p>
                )}
              </div>

              {/* Skills used */}
              <SkillTagInput
                label="Skills & Tools Used"
                placeholder="e.g. React, Excel, Photography, Hindi copy"
                helperText="List the technologies or practical skills you utilized in this project."
                tags={skillsUsed}
                onChange={setSkillsUsed}
                maxTags={12}
                tone="saffron"
              />

              {/* Project link */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                  External Project Link (Optional)
                </label>
                <input
                  type="url"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  placeholder="https://github.com/... or https://myproject.demo"
                  className="mt-1.5 w-full rounded-xl border-1.5 border-charcoal/20 bg-warmCanvas px-3.5 py-2.5 text-xs text-ink placeholder:text-muted outline-none focus:border-charcoal focus:ring-2 focus:ring-charcoal/10"
                />
                {formErrors.projectUrl && (
                  <p className="mt-1 text-xs text-terracotta">{formErrors.projectUrl}</p>
                )}
                <p className="mt-1 text-[11px] text-muted">
                  Must begin with http:// or https://. Script links or unsafe schemes are rejected.
                </p>
              </div>

              {/* Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl border border-charcoal/20 bg-white px-4 py-2 text-xs font-semibold text-charcoal hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-press inline-flex items-center gap-2 rounded-xl border-1.5 border-charcoal bg-saffron px-5 py-2 text-xs font-bold text-charcoal shadow-brutal hover:bg-saffron-dark hover:text-white transition disabled:opacity-50"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  {editingItem ? "Update Project" : "Add Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border-2 border-charcoal bg-white p-5 shadow-brutal-lg">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-terracotta/15 text-terracotta">
                <Trash2 size={20} />
              </span>
              <div>
                <h3 className="font-bold text-ink">Delete Portfolio Project?</h3>
                <p className="text-xs text-muted">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-charcoal leading-relaxed bg-warmCanvas p-3 rounded-xl border border-charcoal/15">
              Are you sure you want to remove <strong>&ldquo;{itemToDelete.title}&rdquo;</strong> from your portfolio?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="rounded-xl border border-charcoal/20 bg-white px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-canvas"
              >
                Keep project
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-press inline-flex items-center gap-2 rounded-xl border-1.5 border-charcoal bg-terracotta px-4 py-2 text-xs font-bold text-white shadow-brutal hover:bg-terracotta-dark transition"
              >
                {isDeleting && <Loader2 size={13} className="animate-spin" />}
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
