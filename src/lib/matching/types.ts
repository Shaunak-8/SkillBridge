export type RemotePreference = 'remote' | 'onsite' | 'either';
export type StudentVisibility = 'public' | 'matching' | 'private';

export interface MatchProject {
  id: string; title: string; summary: string; problemStatement: string; category: string;
  requiredSkills: string[]; remoteOk: boolean; locationText: string | null; status: string;
}
export interface MatchPortfolioItem { title: string; description: string; skillsUsed: string[] }
export interface MatchStudent {
  id: string; displayName: string; bio: string; skills: string[]; interests: string[];
  preferredCategories: string[]; availabilityHoursPerWeek: number | null;
  remotePreference: RemotePreference; visibility: StudentVisibility; portfolio: MatchPortfolioItem[];
}

/** Text document handed to a Retriever. */
export interface MatchDoc { id: string; text: string }

export interface MatchSignals {
  matchedSkills: string[];
  portfolioEvidence: { itemTitle: string; skill: string }[];
  categoryMatch: boolean;
  availabilityHours: number | null;
  similarity: number;
}
export interface MatchResult { id: string; rank: number; signals: MatchSignals; reasons: string[] }
export interface RankOptions { k?: number }
