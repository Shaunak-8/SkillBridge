"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge, Button, Card, Input, SectionTitle } from "@/components/ui";
import { ProjectDraft } from "@/types/ai";
import { AlertCircle, CheckCircle2, Database, HelpCircle, Library, Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";

export default function Page() {
  const [problemText, setProblemText] = useState("");
  const [category, setCategory] = useState("Web development");
  const [format, setFormat] = useState<"individual" | "team">("team");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // AI Output state
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [providerUsed, setProviderUsed] = useState<string>("");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [retrievedSourceIds, setRetrievedSourceIds] = useState<string[]>([]);
  const [ragContextUsed, setRagContextUsed] = useState<boolean>(false);
  const [retrievedFrom, setRetrievedFrom] = useState<"neon_pgvector" | "offline_seed_fallback">("offline_seed_fallback");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemText.trim() || problemText.trim().length < 10) {
      setErrorMessage("Please describe your problem in at least 10 characters.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/ai/project-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawProblemText: problemText,
          category,
          format,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to generate project brief.");
      }

      setDraft(data.draft);
      setIsFallback(Boolean(data.isFallback));
      setProviderUsed(data.providerUsed || "");
      setWarningMessage(data.warning || null);
      setRetrievedSourceIds(data.retrievedSourceIds || []);
      setRagContextUsed(Boolean(data.ragContextUsed));
      setRetrievedFrom(data.retrievedFrom || "offline_seed_fallback");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 5000);
  };

  const handleDeliverableChange = (index: number, value: string) => {
    if (!draft) return;
    const updated = [...draft.proposed_deliverables];
    updated[index] = value;
    setDraft({ ...draft, proposed_deliverables: updated });
  };

  const handleAddDeliverable = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      proposed_deliverables: [...draft.proposed_deliverables, "New deliverable item"],
    });
  };

  const handleRemoveDeliverable = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      proposed_deliverables: draft.proposed_deliverables.filter((_, i) => i !== index),
    });
  };

  return (
    <DashboardLayout role="business">
      <SectionTitle
        eyebrow="Create opportunity"
        title="Turn a challenge into a project."
        description="Describe your problem in plain language. AI with Neon pgvector RAG knowledge context will draft a structured project brief for your review."
      />

      {errorMessage && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="size-5 shrink-0 text-red-500" />
          <div className="flex-1">{errorMessage}</div>
          <Button
            type="button"
            variant="secondary"
            className="text-xs py-1 px-3"
            onClick={() => setErrorMessage(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          <span>
            Project draft saved to local session preview. <em>(Note: Permanent database persistence will connect when Member 6 executes Neon PostgreSQL project table migrations.)</em>
          </span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Problem Input Form */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2 font-bold text-ink">
            <Sparkles className="size-5 text-brand" />
            <h3>1. Describe your business problem</h3>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            <label className="block text-sm font-semibold">
              What would you like help with?
              <textarea
                required
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                disabled={isGenerating}
                className="mt-2 min-h-36 w-full rounded-xl border border-line p-3 text-sm outline-none focus:border-brand disabled:opacity-60"
                placeholder="Tell students about the problem and the outcome you want (e.g. We run a local bakery and manage custom orders on paper tickets. We need a lightweight web tool to track orders and notify customers...)"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isGenerating}
                  className="mt-2 w-full rounded-xl border border-line bg-white p-3 text-sm outline-none focus:border-brand disabled:opacity-60"
                >
                  <option>Web development</option>
                  <option>Marketing</option>
                  <option>Photography</option>
                  <option>Culinary</option>
                  <option>Data & analytics</option>
                  <option>Writing & content</option>
                  <option>Events</option>
                </select>
              </label>

              <label className="block text-sm font-semibold">
                Format
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as "individual" | "team")}
                  disabled={isGenerating}
                  className="mt-2 w-full rounded-xl border border-line bg-white p-3 text-sm outline-none focus:border-brand disabled:opacity-60"
                >
                  <option value="team">Team project</option>
                  <option value="individual">Individual student</option>
                </select>
              </label>
            </div>

            <Button type="submit" disabled={isGenerating} className="w-full justify-center py-3">
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Analyzing problem & retrieving Neon pgvector RAG context...
                </>
              ) : (
                <>
                  <Wand2 className="size-4" />
                  Generate RAG-Grounded Project Brief
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Right Column: AI-Generated Draft Preview */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-ink">
              <Wand2 className="size-5 text-brand" />
              <h3>2. Project Brief Draft</h3>
            </div>
            {draft && (
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={isFallback ? "amber" : "green"}>
                  {isFallback ? "⚠️ Fallback Template" : `✨ AI Generated (${providerUsed})`}
                </Badge>
                {ragContextUsed && (
                  <Badge tone={retrievedFrom === "neon_pgvector" ? "purple" : "blue"}>
                    {retrievedFrom === "neon_pgvector"
                      ? `🐘 Neon pgvector (${retrievedSourceIds.length} sources)`
                      : `📚 Seed Knowledge (${retrievedSourceIds.length} sources)`}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {draft && isFallback && warningMessage && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Fallback Mode Active:</strong> {warningMessage}
              </div>
            </div>
          )}

          {draft && ragContextUsed && retrievedSourceIds.length > 0 && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-start gap-2">
              {retrievedFrom === "neon_pgvector" ? (
                <Database className="size-4 shrink-0 text-purple-600 mt-0.5" />
              ) : (
                <Library className="size-4 shrink-0 text-blue-600 mt-0.5" />
              )}
              <div>
                <strong>RAG Context Source ({retrievedFrom === "neon_pgvector" ? "Neon PostgreSQL pgvector" : "Offline Seed Template"}):</strong> Grounded by approved project templates 
                <span className="font-mono text-[11px] ml-1">[{retrievedSourceIds.join(", ")}]</span>.
              </div>
            </div>
          )}

          {!draft && !isGenerating && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line p-12 text-center text-muted">
              <Sparkles className="size-10 text-brand/40 mb-3" />
              <p className="font-semibold text-ink">No brief generated yet</p>
              <p className="mt-1 text-xs max-w-xs text-muted">
                Describe your problem on the left and click &quot;Generate RAG-Grounded Project Brief&quot; to preview a structured proposal.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-brand-soft/30 p-12 text-center">
              <Loader2 className="size-8 animate-spin text-brand mb-3" />
              <p className="font-bold text-brand">Retrieving knowledge & generating brief...</p>
              <p className="mt-1 text-xs text-muted max-w-xs">
                Searching Neon PostgreSQL pgvector knowledge base for templates, extracting business goals, deliverables, and clarification questions.
              </p>
            </div>
          )}

          {draft && !isGenerating && (
            <div className="space-y-6">
              {/* Title & Goal */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Project Title
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="mt-1 font-bold text-ink"
                  />
                </label>

                <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Business Goal
                  <textarea
                    value={draft.business_goal}
                    onChange={(e) => setDraft({ ...draft, business_goal: e.target.value })}
                    className="mt-1 min-h-20 w-full rounded-xl border border-line p-3 text-sm text-ink outline-none focus:border-brand"
                  />
                </label>
              </div>

              {/* Deliverables */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Proposed Deliverables</span>
                  <button
                    type="button"
                    onClick={handleAddDeliverable}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                  >
                    <Plus className="size-3" /> Add item
                  </button>
                </div>
                <div className="space-y-2">
                  {draft.proposed_deliverables.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={item}
                        onChange={(e) => handleDeliverableChange(idx, e.target.value)}
                        className="text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(idx)}
                        className="p-1 text-muted hover:text-red-500"
                        title="Remove deliverable"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Skills */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Suggested Skills</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {draft.required_skills.map((skill, idx) => (
                    <Badge key={idx} tone={skill.category === "technical" ? "purple" : skill.category === "creative" ? "green" : "blue"}>
                      {skill.skillName} ({skill.level})
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Open Clarification Questions */}
              {draft.open_questions && draft.open_questions.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                  <div className="mb-2 flex items-center gap-2 font-bold text-amber-900 text-xs uppercase tracking-wider">
                    <HelpCircle className="size-4 text-amber-600" />
                    Clarification Questions for Business Owner
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-amber-800">
                    {draft.open_questions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="button" onClick={handleSaveDraft}>
                  Save as Draft
                </Button>
                <Button type="button" variant="secondary" onClick={() => setDraft(null)}>
                  Clear Brief
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
