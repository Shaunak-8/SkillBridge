// src/components/student/PortfolioSection.tsx
// Workstream 4: Portfolio manager with full CRUD, safe external links, and delete confirmation (NeoFlux styling)

import React, { useState } from "react";
import {
  AlertCircle,
  Briefcase,
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
    } catch (err) {
      setGlobalError(err instanceof Error && err.message ? err.message : "An unexpected error occurred while saving.");
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
    } catch (err) {
      setGlobalError(err instanceof Error && err.message ? err.message : "Could not delete project. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-4">
      {/* Header and Add button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[#151515]">Portfolio & Built Work</h2>
          <p className="text-xs font-medium text-[#655F52]">
            Share practical proof of what you have built or contributed to.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#111111] bg-[#D83D63] px-4 py-2.5 text-xs font-black text-white shadow-[3px_3px_0_#111111] hover:bg-[#C02C51] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#111111] transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Project
        </button>
      </div>

      {globalError && (
        <div className="flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#FCE8ED] p-3 text-xs font-bold text-[#D83D63] shadow-[2px_2px_0_#111111]">
          <AlertCircle size={16} className="shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Portfolio items list or empty state */}
      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#111111] bg-white p-8 text-center shadow-[4px_4px_0_#111111]">
          <div className="mx-auto grid size-12 place-items-center rounded-xl border-2 border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[2px_2px_0_#111111]">
            <Briefcase size={22} strokeWidth={2.2} />
          </div>
          <h3 className="mt-4 font-black text-base text-[#151515]">No portfolio projects yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-relaxed text-[#655F52]">
            Projects help local shopkeepers and businesses understand what you can build. Add a college project, a small business site, or a personal tool!
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#F7F0D2] px-4 py-2 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F2BE4E] active:translate-x-[1px] active:translate-y-[1px] transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-xl border-2 border-[#111111] bg-white p-5 shadow-[4px_4px_0_#111111] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#111111]"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-sm text-[#151515] leading-snug">{item.title}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      aria-label={`Edit ${item.title}`}
                      className="rounded-lg border border-[#111111] bg-[#F7F0D2] p-1.5 text-[#151515] hover:bg-[#F2BE4E] shadow-[1px_1px_0_#111111] transition"
                    >
                      <Pencil size={13} strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      aria-label={`Delete ${item.title}`}
                      className="rounded-lg border border-[#111111] bg-[#FCE8ED] p-1.5 text-[#D83D63] hover:bg-[#D83D63] hover:text-white shadow-[1px_1px_0_#111111] transition"
                    >
                      <Trash2 size={13} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>

                {item.role && (
                  <p className="mt-1 text-xs font-black text-[#D83D63]">
                    Role: {item.role}
                  </p>
                )}

                <p className="mt-2.5 text-xs font-medium leading-relaxed text-[#655F52] line-clamp-3">
                  {item.description}
                </p>

                {item.skillsUsed && item.skillsUsed.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.skillsUsed.map((skill, sIdx) => (
                      <span
                        key={`${skill}-${sIdx}`}
                        className="rounded-md border-[1.5px] border-[#111111] bg-[#F7F0D2] px-2 py-0.5 text-[11px] font-bold text-[#151515] shadow-[1px_1px_0_#111111]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {item.projectUrl && (
                <div className="mt-4 border-t-2 border-[#111111] pt-3">
                  <a
                    href={item.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-[#151515] hover:text-[#D83D63] hover:underline"
                  >
                    <span>View project link</span>
                    <ExternalLink size={13} strokeWidth={2.5} />
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border-2 border-[#111111] bg-white p-6 shadow-[8px_8px_0_#111111] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3">
              <h3 className="text-base sm:text-lg font-black text-[#151515]">
                {editingItem ? "Edit Portfolio Project" : "Add Portfolio Project"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-lg border border-[#111111] p-1 text-[#151515] hover:bg-[#F7F0D2]"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#151515]">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Local Kirana Order Counter Web App"
                  maxLength={120}
                  className="mt-1.5 w-full rounded-xl border-2 border-[#111111] bg-[#F7F0D2] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#151515] placeholder:text-[#655F52]/60 outline-none focus:bg-white focus:shadow-[3px_3px_0_#111111]"
                />
                {formErrors.title && (
                  <p className="mt-1 text-xs font-bold text-[#D83D63]">{formErrors.title}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#151515]">
                  Your Role / Contribution
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Lead Frontend Builder, UX Designer, Solo Creator"
                  maxLength={120}
                  className="mt-1.5 w-full rounded-xl border-2 border-[#111111] bg-[#F7F0D2] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#151515] placeholder:text-[#655F52]/60 outline-none focus:bg-white focus:shadow-[3px_3px_0_#111111]"
                />
                {formErrors.role && (
                  <p className="mt-1 text-xs font-bold text-[#D83D63]">{formErrors.role}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="flex justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#151515]">
                    Description *
                  </label>
                  <span className="text-[11px] font-bold text-[#655F52]">{description.length}/2000</span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what the project was, who used it, and what problem it solved..."
                  maxLength={2000}
                  className="mt-1.5 w-full rounded-xl border-2 border-[#111111] bg-[#F7F0D2] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#151515] placeholder:text-[#655F52]/60 outline-none focus:bg-white focus:shadow-[3px_3px_0_#111111]"
                />
                {formErrors.description && (
                  <p className="mt-1 text-xs font-bold text-[#D83D63]">{formErrors.description}</p>
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
                tone="gold"
              />

              {/* Project link */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#151515]">
                  External Project Link (Optional)
                </label>
                <input
                  type="url"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  placeholder="https://github.com/... or https://myproject.demo"
                  className="mt-1.5 w-full rounded-xl border-2 border-[#111111] bg-[#F7F0D2] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#151515] placeholder:text-[#655F52]/60 outline-none focus:bg-white focus:shadow-[3px_3px_0_#111111]"
                />
                {formErrors.projectUrl && (
                  <p className="mt-1 text-xs font-bold text-[#D83D63]">{formErrors.projectUrl}</p>
                )}
                <p className="mt-1 text-[11px] font-medium text-[#655F52]">
                  Must begin with http:// or https://. Script links or unsafe schemes are rejected.
                </p>
              </div>

              {/* Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t-2 border-[#111111] pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl border-2 border-[#111111] bg-white px-4 py-2 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#D83D63] px-5 py-2 text-xs font-black text-white shadow-[3px_3px_0_#111111] hover:bg-[#C02C51] active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border-2 border-[#111111] bg-white p-6 shadow-[8px_8px_0_#111111]">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl border-2 border-[#111111] bg-[#FCE8ED] text-[#D83D63] shadow-[2px_2px_0_#111111]">
                <Trash2 size={20} strokeWidth={2.5} />
              </span>
              <div>
                <h3 className="font-black text-base text-[#151515]">Delete Project?</h3>
                <p className="text-xs font-medium text-[#655F52]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mt-4 text-xs font-medium text-[#151515] leading-relaxed bg-[#F7F0D2] p-3 rounded-xl border-2 border-[#111111] shadow-[2px_2px_0_#111111]">
              Are you sure you want to remove <strong>&ldquo;{itemToDelete.title}&rdquo;</strong> from your portfolio?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2]"
              >
                Keep project
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#D83D63] px-4 py-2 text-xs font-black text-white shadow-[3px_3px_0_#111111] hover:bg-[#C02C51] active:translate-x-[2px] active:translate-y-[2px] transition-all"
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
