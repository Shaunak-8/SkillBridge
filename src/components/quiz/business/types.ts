// Client-side shapes of the business quiz API (src/app/api/business/projects/[id]/quiz/**). Kept separate from
// src/lib/quiz/repo.ts, which is server-only. Correct answers and rubrics are owner-only data.
export type QuizStatus = 'draft' | 'open' | 'closed';
export type AttemptStatus = 'not_taken' | 'in_progress' | 'submitted' | 'expired';
export type ProctoringMode = 'full' | 'limited' | 'none';

export interface QuizQuestion {
  id: string; position: number; kind: 'mcq' | 'short'; prompt: string;
  options: string[] | null; correctIndex: number | null; rubric: string | null;
}
export interface Quiz {
  id: string; status: QuizStatus; timeLimitSeconds: number; openedAt: string | null; closesAt: string | null;
  questions: QuizQuestion[];
}
export interface QuizState { applicantCount: number; minApplicants: number; eligible: boolean; quiz: Quiz | null }

export interface Integrity { counts: Record<string, number>; totalAwayMs: number }
export interface ResultItem {
  applicationId: string; studentId: string; displayName: string; status: AttemptStatus;
  mcqScore: number | null; mcqMax: number | null; shortScore: number | null; shortMax: number | null;
  shortAnswer: string | null; shortFeedback: string | null; timeTakenSeconds: number | null;
  proctoringMode: ProctoringMode | null; integrity: Integrity;
}

/** What the editor works on. Options always has 4 slots (empty for a short question). */
export interface DraftQuestion { kind: 'mcq' | 'short'; prompt: string; options: string[]; correctIndex: number; rubric: string }
export type QuestionPayload =
  | { kind: 'mcq'; prompt: string; options: string[]; correctIndex: number }
  | { kind: 'short'; prompt: string; rubric: string };
