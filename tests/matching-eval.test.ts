import { describe, expect, it } from 'vitest';
import fixture from './fixtures/matching-eval.json';
import { recommendProjectsForStudent, recommendStudentsForProject } from '@/lib/matching/rank';
import type { MatchProject, MatchResult, MatchStudent } from '@/lib/matching/types';

const { students, projects } = fixture as { students: MatchStudent[]; projects: MatchProject[] };
const byId = <T extends { id: string }>(xs: T[], id: string) => xs.find((x) => x.id === id)!;
const ids = (rs: MatchResult[]) => rs.map((r) => r.id);

// Human-judged expectations from the seeded profile content (not from ranker output).
// top1: must be rank 1. alsoTop3: must appear in the top 3. neverTop3: clearly irrelevant people.
interface ProjectExpectation { top1: string; alsoTop3: string[]; neverTop3: string[]; why: string }
const projectExpectations: Record<string, ProjectExpectation> = {
  p1: { top1: 's1', alsoTop3: ['s6'], neverTop3: ['s4', 's8', 's7'], why: 'React + design, canteen ordering app portfolio' },
  p2: { top1: 's4', alsoTop3: [], neverTop3: ['s7', 's8'], why: 'Menu development; onsite Pune project' },
  p3: { top1: 's2', alsoTop3: [], neverTop3: ['s6', 's8'], why: 'Photographer with graphic design' },
  p5: { top1: 's2', alsoTop3: ['s5'], neverTop3: ['s7', 's8'], why: 'Social media + photography; private s10 must not leak in' },
  p6: { top1: 's4', alsoTop3: [], neverTop3: ['s3', 's6', 's8'], why: 'Baking + menu development, millet bakes' },
  p7: { top1: 's5', alsoTop3: [], neverTop3: ['s7', 's8'], why: 'Copywriting + social media, bookstore Instagram' },
  p9: { top1: 's7', alsoTop3: [], neverTop3: ['s3', 's6', 's8'], why: 'CAD drafting + space planning' },
  p10: { top1: 's8', alsoTop3: [], neverTop3: ['s7', 's4'], why: 'Bookkeeping + financial planning' },
  p11: { top1: 's9', alsoTop3: [], neverTop3: ['s7', 's8'], why: 'User research + copywriting, cafe interview study' },
  p12: { top1: 's2', alsoTop3: [], neverTop3: ['s3', 's6', 's8'], why: 'Photography; the video editor s10 is private' },
};
// Expectations the current ranker does not meet stay as `it.fails` (see docs/ws5-matching-eval.md).
const knownMisses = new Set<string>([]);

const studentTop: Record<string, string> = {
  s1: 'p1', s2: 'p3', s3: 'p1', s4: 'p6', s5: 'p7', s6: 'p1', s7: 'p9', s8: 'p10', s9: 'p11',
};
const knownStudentMisses = new Set<string>([]);

describe('fixture sanity', () => {
  it('has 10 students and 13 projects with 10 published', () => {
    expect(students).toHaveLength(10);
    expect(projects).toHaveLength(13);
    expect(projects.filter((p) => p.status === 'published')).toHaveLength(10);
  });
});

describe('students for each published project', () => {
  for (const [pid, exp] of Object.entries(projectExpectations)) {
    const run = knownMisses.has(pid) ? it.fails : it;
    run(`${pid}: ${exp.why}`, () => {
      const top3 = ids(recommendStudentsForProject(byId(projects, pid), students, { k: 3 }));
      expect(top3[0]).toBe(exp.top1);
      for (const s of exp.alsoTop3) expect(top3).toContain(s);
      for (const s of exp.neverTop3) expect(top3).not.toContain(s);
    });
  }
});

describe('projects for each student', () => {
  for (const [sid, pid] of Object.entries(studentTop)) {
    const run = knownStudentMisses.has(sid) ? it.fails : it;
    run(`${sid} gets ${pid} first`, () => {
      expect(recommendProjectsForStudent(byId(students, sid), projects)[0]?.id).toBe(pid);
    });
  }
});

describe('invariants over the whole fixture', () => {
  const forProjects = projects.map((p) => ({ p, out: recommendStudentsForProject(p, students) }));
  const forStudents = students.map((s) => ({ s, out: recommendProjectsForStudent(s, projects) }));

  it('never recommends the private student', () => {
    for (const { out } of forProjects) expect(ids(out)).not.toContain('s10');
    expect(forStudents.find((x) => x.s.id === 's10')!.out).toEqual([]);
  });

  it('never recommends draft, completed or in_progress projects', () => {
    for (const { out } of forStudents) for (const id of ids(out)) expect(byId(projects, id).status).toBe('published');
    for (const id of ['p4', 'p8', 'p13']) expect(forProjects.find((x) => x.p.id === id)!.out).toEqual([]);
  });

  it('never sends remote-only students to on-site projects', () => {
    for (const { s, out } of forStudents.filter((x) => x.s.remotePreference === 'remote'))
      for (const id of ids(out)) expect(byId(projects, id).remoteOk).toBe(true);
  });

  it('quotes values present in the candidate fields and shows no percentages', () => {
    for (const { p, out } of forProjects) {
      for (const r of out) {
        const s = byId(students, r.id);
        const fields = [...s.skills, ...s.interests, ...s.preferredCategories, s.bio, ...s.portfolio.flatMap((i) => [i.title, i.description, ...i.skillsUsed]), p.category, String(s.availabilityHoursPerWeek)];
        expectReasonsGrounded(r.reasons, fields);
      }
    }
    for (const { s, out } of forStudents) {
      for (const r of out) {
        const p = byId(projects, r.id);
        const fields = [...p.requiredSkills, p.category, p.title, p.summary, p.problemStatement, ...s.portfolio.map((i) => i.title), ...s.portfolio.flatMap((i) => i.skillsUsed), String(s.availabilityHoursPerWeek)];
        expectReasonsGrounded(r.reasons, fields);
      }
    }
  });
});

function expectReasonsGrounded(reasons: string[], fields: string[]) {
  const haystack = fields.join('\n').toLowerCase();
  expect(reasons.length).toBeGreaterThan(0);
  for (const reason of reasons) {
    expect(reason).not.toContain('%');
    const quoted = [...reason.matchAll(/"([^"]+)"/g)].map((m) => m[1].toLowerCase());
    for (const q of quoted) expect(haystack, `reason "${reason}"`).toContain(q);
  }
}
