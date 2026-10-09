import { LexicalRetriever, tokenize, type Retriever } from './retriever';
import type { MatchDoc, MatchProject, MatchResult, MatchSignals, MatchStudent, RankOptions } from './types';

/** Scoring weights. Skill overlap dominates; similarity is only a weak tie-breaker. */
export const WEIGHTS = {
  requiredSkill: 10, // per required skill the student lists
  portfolioEvidence: 4, // per required skill demonstrated in a portfolio item
  category: 5, // project category in preferred categories or interests
  availability: 1, // availability stated
  similarity: 3, // multiplied by 0..1 cosine
} as const;
/** Similarity alone qualifies a candidate only at or above this. */
export const MIN_SIMILARITY = 0.2;
export const DEFAULT_K = 10;
const SHARED_TERMS_SHOWN = 3;

const norm = (s: string) => s.trim().toLowerCase();

const projectDoc = (p: MatchProject): MatchDoc => ({
  id: p.id, text: [p.title, p.summary, p.problemStatement, p.category, ...p.requiredSkills].join(' '),
});
const studentDoc = (s: MatchStudent): MatchDoc => ({
  id: s.id,
  text: [s.bio, ...s.skills, ...s.interests, ...s.preferredCategories,
    ...s.portfolio.flatMap((i) => [i.title, i.description, ...i.skillsUsed])].join(' '),
});

export function isEligible(project: MatchProject, student: MatchStudent): boolean {
  if (project.status !== 'published') return false;
  if (student.visibility !== 'public' && student.visibility !== 'matching') return false;
  return !(student.remotePreference === 'remote' && !project.remoteOk);
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((v) => !seen.has(norm(v)) && seen.add(norm(v)));
}

function computeSignals(project: MatchProject, student: MatchStudent, similarity: number): MatchSignals {
  const have = new Set(student.skills.map(norm));
  const matchedSkills = dedupe(project.requiredSkills.filter((s) => have.has(norm(s))));
  const portfolioEvidence: MatchSignals['portfolioEvidence'] = [];
  for (const skill of matchedSkills) {
    for (const item of student.portfolio) {
      const used = item.skillsUsed.find((u) => norm(u) === norm(skill));
      if (used) { portfolioEvidence.push({ itemTitle: item.title, skill: used }); break; }
    }
  }
  const wanted = new Set([...student.preferredCategories, ...student.interests].map(norm));
  return {
    matchedSkills, portfolioEvidence,
    categoryMatch: wanted.has(norm(project.category)),
    availabilityHours: student.availabilityHoursPerWeek,
    similarity,
  };
}

function hasMeaningfulSignal(s: MatchSignals): boolean {
  return s.matchedSkills.length > 0 || s.categoryMatch || s.similarity >= MIN_SIMILARITY;
}

function score(s: MatchSignals): number {
  return s.matchedSkills.length * WEIGHTS.requiredSkill
    + s.portfolioEvidence.length * WEIGHTS.portfolioEvidence
    + (s.categoryMatch ? WEIGHTS.category : 0)
    + (s.availabilityHours !== null ? WEIGHTS.availability : 0)
    + s.similarity * WEIGHTS.similarity;
}

function sharedTerms(a: string, b: string): string[] {
  const other = new Set(tokenize(b));
  return [...new Set(tokenize(a).filter((t) => other.has(t)))].sort().slice(0, SHARED_TERMS_SHOWN);
}

function buildReasons(project: MatchProject, student: MatchStudent, s: MatchSignals): string[] {
  const reasons = s.matchedSkills.map((k) => `Lists required skill "${k}"`);
  for (const e of s.portfolioEvidence) reasons.push(`Portfolio item "${e.itemTitle}" used "${e.skill}"`);
  if (s.categoryMatch) reasons.push(`Prefers "${project.category}" projects`);
  if (s.availabilityHours !== null) reasons.push(`Available ${s.availabilityHours} hrs/week`);
  if (s.matchedSkills.length === 0 && !s.categoryMatch) {
    const terms = sharedTerms(projectDoc(project).text, studentDoc(student).text);
    if (terms.length) reasons.push(`Profile and project text both mention ${terms.map((t) => `"${t}"`).join(', ')}`);
  }
  return reasons;
}

interface Pair { project: MatchProject; student: MatchStudent; candidateId: string }

function rankPairs(query: MatchDoc, pairs: Pair[], docOf: (p: Pair) => MatchDoc, opts: RankOptions, retriever: Retriever): MatchResult[] {
  if (pairs.length === 0) return [];
  const sims = new Map(retriever.retrieve(query, pairs.map(docOf), pairs.length).map((r) => [r.id, r.similarity]));
  return pairs
    .map((p) => {
      const signals = computeSignals(p.project, p.student, sims.get(p.candidateId) ?? 0);
      return { p, signals, score: score(signals) };
    })
    .filter((x) => hasMeaningfulSignal(x.signals))
    .sort((a, b) => b.score - a.score || a.p.candidateId.localeCompare(b.p.candidateId))
    .slice(0, opts.k ?? DEFAULT_K)
    .map((x, i) => ({ id: x.p.candidateId, rank: i + 1, signals: x.signals, reasons: buildReasons(x.p.project, x.p.student, x.signals) }));
}

export function recommendStudentsForProject(
  project: MatchProject, students: MatchStudent[], opts: RankOptions = {}, retriever: Retriever = new LexicalRetriever(),
): MatchResult[] {
  const pairs = students.filter((s) => isEligible(project, s)).map((student) => ({ project, student, candidateId: student.id }));
  return rankPairs(projectDoc(project), pairs, (p) => studentDoc(p.student), opts, retriever);
}

export function recommendProjectsForStudent(
  student: MatchStudent, projects: MatchProject[], opts: RankOptions = {}, retriever: Retriever = new LexicalRetriever(),
): MatchResult[] {
  const pairs = projects.filter((p) => isEligible(p, student)).map((project) => ({ project, student, candidateId: project.id }));
  return rankPairs(studentDoc(student), pairs, (p) => projectDoc(p.project), opts, retriever);
}
