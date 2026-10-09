import { describe, expect, it } from 'vitest';
import { EmbeddingRetriever, LexicalRetriever, MIN_SEMANTIC_SIMILARITY } from '@/lib/matching/retriever';
import { recommendProjectsForStudent, recommendStudentsForProject } from '@/lib/matching/rank';
import type { MatchProject, MatchStudent } from '@/lib/matching/types';

const project = (o: Partial<MatchProject> = {}): MatchProject => ({
  id: 'p1', title: 'Cafe website', summary: 'Build an ordering site for a local cafe', problemStatement: 'Customers cannot order online',
  category: 'Web Development', requiredSkills: ['React', 'CSS'], remoteOk: true, locationText: 'Pune', status: 'published', ...o,
});
const student = (o: Partial<MatchStudent> = {}): MatchStudent => ({
  id: 's1', displayName: 'Asha', bio: '', skills: [], interests: [], preferredCategories: [],
  availabilityHoursPerWeek: null, remotePreference: 'either', visibility: 'public', portfolio: [], ...o,
});

const react = student({
  id: 'react', skills: [' react ', 'css'], preferredCategories: ['web development'], availabilityHoursPerWeek: 10,
  portfolio: [{ title: 'Cafe ordering app', description: 'Menu and cart', skillsUsed: ['React'] }],
});
const baker = student({ id: 'baker', bio: 'I bake sourdough bread', skills: ['Baking'], interests: ['Food'] });
// One of two required skills plus a category preference: weaker than `react` but not merely incidental.
const partial = student({ id: 'partial', skills: ['CSS'], preferredCategories: ['web development'] });
const incidental = student({ id: 'incidental', bio: 'I bake sourdough bread', skills: ['CSS'] });

describe('students for project', () => {
  it('ranks the React student above a partial match and excludes the baker', () => {
    const out = recommendStudentsForProject(project(), [baker, partial, react]);
    expect(out.map((r) => r.id)).toEqual(['react', 'partial']);
    expect(out.map((r) => r.rank)).toEqual([1, 2]);
  });

  it('quotes exact field values in reasons', () => {
    const [top] = recommendStudentsForProject(project(), [react]);
    expect(top.reasons).toEqual([
      'Lists required skill "React"', 'Lists required skill "CSS"',
      'Portfolio item "Cafe ordering app" used "React"',
      'Prefers "Web Development" projects', 'Available 10 hrs/week',
    ]);
  });

  it('excludes students of a draft project', () => {
    expect(recommendStudentsForProject(project({ status: 'draft' }), [react])).toEqual([]);
  });

  it('excludes private students', () => {
    expect(recommendStudentsForProject(project(), [{ ...react, visibility: 'private' }])).toEqual([]);
  });

  it('keeps matching-visibility students', () => {
    expect(recommendStudentsForProject(project(), [{ ...react, visibility: 'matching' }])).toHaveLength(1);
  });

  it('excludes remote-only students from onsite projects but not onsite-preferring ones from remote projects', () => {
    const onsiteProject = project({ remoteOk: false });
    expect(recommendStudentsForProject(onsiteProject, [{ ...react, remotePreference: 'remote' }])).toEqual([]);
    expect(recommendStudentsForProject(onsiteProject, [{ ...react, remotePreference: 'either' }])).toHaveLength(1);
    expect(recommendStudentsForProject(project(), [{ ...react, remotePreference: 'onsite' }])).toHaveLength(1);
  });

  it('returns empty for empty inputs', () => {
    expect(recommendStudentsForProject(project(), [])).toEqual([]);
    expect(recommendProjectsForStudent(react, [])).toEqual([]);
  });

  it('respects k', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ ...partial, id: `s${i}` }));
    expect(recommendStudentsForProject(project(), many, { k: 2 })).toHaveLength(2);
  });

  it('breaks ties by id and is deterministic', () => {
    const twins = [{ ...partial, id: 'b' }, { ...partial, id: 'a' }];
    const first = recommendStudentsForProject(project(), twins);
    expect(first.map((r) => r.id)).toEqual(['a', 'b']);
    expect(recommendStudentsForProject(project(), [...twins].reverse())).toEqual(first);
  });

  it('only emits reasons backed by input fields and never percentages', () => {
    const out = recommendStudentsForProject(project(), [react, partial, baker]);
    for (const r of out) for (const reason of r.reasons) {
      expect(reason).not.toMatch(/%/);
      const quoted = [...reason.matchAll(/"([^"]+)"/g)].map((m) => m[1].toLowerCase());
      const haystack = JSON.stringify([project(), react, partial, baker]).toLowerCase();
      for (const q of quoted) expect(haystack).toContain(q);
    }
  });

  it('does not claim portfolio evidence when the portfolio lacks the skill', () => {
    const [r] = recommendStudentsForProject(project(), [partial]);
    expect(r.signals.portfolioEvidence).toEqual([]);
    expect(r.reasons.some((x) => x.startsWith('Portfolio'))).toBe(false);
  });

  it('includes a text-overlap candidate with a grounded shared-term reason', () => {
    const writer = student({ id: 'w', bio: 'ordering customers cafe online' });
    const [r] = recommendStudentsForProject(project(), [writer]);
    expect(r.id).toBe('w');
    expect(r.reasons[0]).toMatch(/^Profile and project text both mention /);
  });
});

describe('projects for student', () => {
  const projects = [
    project({ id: 'web' }),
    project({ id: 'bakery', title: 'Bakery flyers', summary: 'Design flyers', problemStatement: 'No marketing', category: 'Marketing', requiredSkills: ['Photoshop'] }),
    project({ id: 'draft', status: 'draft' }),
  ];

  it('recommends the matching published project and skips drafts and unrelated ones', () => {
    const out = recommendProjectsForStudent(react, projects);
    expect(out.map((r) => r.id)).toEqual(['web']);
  });

  it('applies the remote filter from the student side', () => {
    const remoteOnly = { ...react, remotePreference: 'remote' as const };
    expect(recommendProjectsForStudent(remoteOnly, [project({ remoteOk: false })])).toEqual([]);
  });

  it('cites category preference using the project field value', () => {
    const s = student({ id: 'm', interests: ['Marketing'] });
    const [r] = recommendProjectsForStudent(s, projects);
    expect(r.id).toBe('bakery');
    expect(r.reasons).toContain('Prefers "Marketing" projects');
  });

  it('returns nothing for a private student', () => {
    expect(recommendProjectsForStudent({ ...react, visibility: 'private' }, projects)).toEqual([]);
  });
});

describe('LexicalRetriever', () => {
  const r = new LexicalRetriever();
  it('scores overlapping text higher than disjoint text, within 0..1', () => {
    const out = r.retrieve({ id: 'q', text: 'react web app' }, [{ id: 'a', text: 'web react developer' }, { id: 'b', text: 'sourdough baking' }], 5);
    expect(out[0].id).toBe('a');
    expect(out[1].similarity).toBe(0);
    expect(out[0].similarity).toBeLessThanOrEqual(1);
  });
  it('handles empty candidates and empty query', () => {
    expect(r.retrieve({ id: 'q', text: 'x' }, [], 3)).toEqual([]);
    expect(r.retrieve({ id: 'q', text: '' }, [{ id: 'a', text: 'react' }], 3)[0].similarity).toBe(0);
  });
});

describe('incidental single-skill candidates', () => {
  it('excludes a lone shared skill (1 of 2) with no evidence, category or similarity', () => {
    expect(recommendStudentsForProject(project(), [incidental])).toEqual([]);
  });
  it('keeps a lone shared skill when the project requires only one skill', () => {
    expect(recommendStudentsForProject(project({ requiredSkills: ['CSS'] }), [incidental]).map((r) => r.id)).toEqual(['incidental']);
  });
  it('keeps a lone skill backed by portfolio evidence', () => {
    const s = student({ id: 'ev', skills: ['CSS'], portfolio: [{ title: 'Styled site', description: '', skillsUsed: ['CSS'] }] });
    expect(recommendStudentsForProject(project(), [s]).map((r) => r.id)).toEqual(['ev']);
  });
});

describe('EmbeddingRetriever', () => {
  const q = { id: 'p1', text: 'cafe website' };
  const doc = (id: string) => ({ id, text: `${id} text` });
  const retriever = (vectors: Record<string, number[]>, query: number[] | null = [1, 0]) =>
    new EmbeddingRetriever(query, new Map(Object.entries(vectors)));

  it('ranks by cosine of the supplied vectors and flags them semantic', () => {
    const out = retriever({ near: [1, 0.1], far: [0, 1] }).retrieve(q, [doc('far'), doc('near')], 5);
    expect(out.map((r) => r.id)).toEqual(['near', 'far']);
    expect(out[0]).toMatchObject({ semantic: true });
    expect(out[0].similarity).toBeGreaterThan(0.99);
    expect(out[1].similarity).toBe(0);
  });

  it('falls back to lexical per candidate when its vector is missing or mismatched', () => {
    const out = retriever({ has: [1, 0], bad: [1, 0, 0] }).retrieve({ id: 'p', text: 'react cafe' }, [
      { id: 'has', text: 'x' }, { id: 'none', text: 'react cafe' }, { id: 'bad', text: 'react cafe' }], 5);
    const by = new Map(out.map((r) => [r.id, r]));
    expect(by.get('has')!.semantic).toBe(true);
    expect(by.get('none')!.semantic).toBe(false);
    expect(by.get('none')!.similarity).toBeGreaterThan(0);
    expect(by.get('bad')!.semantic).toBe(false);
  });

  it('is fully lexical when the query vector is missing', () => {
    const out = retriever({ a: [1, 0] }, null).retrieve({ id: 'p', text: 'react' }, [{ id: 'a', text: 'react' }], 5);
    expect(out[0].semantic).toBe(false);
  });

  describe('in the ranker', () => {
    const sem = (vec: number[]) => new EmbeddingRetriever([1, 0], new Map([['x', vec]]));
    const nobody = student({ id: 'x', bio: 'unrelated words', skills: [] });

    it('admits a semantic-only candidate at the threshold with a grounded-or-neutral reason and no percent', () => {
      const [r] = recommendStudentsForProject(project(), [nobody], {}, sem([MIN_SEMANTIC_SIMILARITY, Math.sqrt(1 - MIN_SEMANTIC_SIMILARITY ** 2)]));
      expect(r.id).toBe('x');
      expect(r.reasons).toEqual(['Profile is semantically close to the project description']);
      expect(r.reasons.join()).not.toMatch(/%/);
    });

    it('drops a semantic-only candidate below the threshold', () => {
      expect(recommendStudentsForProject(project(), [nobody], {}, sem([0.3, Math.sqrt(1 - 0.09)]))).toEqual([]);
    });

    it('never lets perfect similarity outrank a candidate with a required skill', () => {
      const skilled = student({ id: 'y', skills: ['React'] });
      const r = new EmbeddingRetriever([1, 0], new Map([['x', [1, 0]], ['y', [0, 1]]]));
      expect(recommendStudentsForProject(project({ requiredSkills: ['React'] }), [nobody, skilled], {}, r).map((o) => o.id)).toEqual(['y', 'x']);
    });
  });
});
