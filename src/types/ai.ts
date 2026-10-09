export interface GenerateProjectDraftInput {
  rawProblemText: string;
  preferredLanguage?: string;
  category?: string;
  format?: "individual" | "team";
  draftId?: string;
}

export interface RequiredSkillDraft {
  skillName: string;
  category: "technical" | "creative" | "business";
  level: "beginner" | "intermediate" | "advanced";
  essential: boolean;
}

export interface SuggestedMilestoneDraft {
  title: string;
  description?: string;
  dueDate?: string;
}

export interface ProjectDraft {
  title: string;
  problem_statement: string;
  business_goal: string;
  category: string;
  mode: "individual" | "team";
  proposed_deliverables: string[];
  required_skills: RequiredSkillDraft[];
  suggested_milestones: SuggestedMilestoneDraft[];
  budget_range: string | null;
  timeline: string | null;
  language: string;
  open_questions: string[];
}

export interface KnowledgeChunk {
  id: string;
  content: string;
  sourceType: "approved_template" | "project_guidance" | "example_brief";
  sourceId: string;
  language: string;
  category?: string;
  metadata?: Record<string, unknown>;
  similarity?: number;
}

export interface RetrievalResult {
  chunks: KnowledgeChunk[];
  retrievedSourceIds: string[];
  queryEmbeddingGenerated: boolean;
  retrievedFrom: "neon_pgvector" | "offline_seed_fallback";
  error?: string;
}

export interface GenerateProjectDraftResponse {
  success: boolean;
  draft?: ProjectDraft;
  isFallback?: boolean;
  providerUsed?: string;
  warning?: string;
  retrievedSourceIds?: string[];
  ragContextUsed?: boolean;
  retrievedFrom?: "neon_pgvector" | "offline_seed_fallback";
  error?: {
    code: string;
    message: string;
  };
}
