import type { MatchDoc } from './types';

export interface Retriever {
  retrieve(query: MatchDoc, candidates: MatchDoc[], k: number): RetrievedMatch[];
}

/** `semantic` is true when similarity is an embedding cosine rather than a lexical tf-idf cosine. */
export interface RetrievedMatch { id: string; similarity: number; semantic?: boolean }

/** Embedding cosine at or above this counts as a real semantic signal on its own. */
export const MIN_SEMANTIC_SIMILARITY = 0.35;

const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'our', 'that', 'the', 'to', 'we', 'with', 'you', 'your', 'my', 'this', 'will', 'can']);

export function tokenize(text: string): string[] {
  return text
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function termCounts(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  return counts;
}

export class LexicalRetriever implements Retriever {
  retrieve(query: MatchDoc, candidates: MatchDoc[], k: number) {
    const docs = [query, ...candidates].map((d) => termCounts(tokenize(d.text)));
    const df = new Map<string, number>();
    for (const d of docs) for (const t of d.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    const idf = (t: string) => Math.log((1 + docs.length) / (1 + (df.get(t) ?? 0))) + 1;
    const vector = (d: Map<string, number>) => {
      const v = new Map<string, number>();
      for (const [t, c] of d) v.set(t, c * idf(t));
      return v;
    };
    const norm = (v: Map<string, number>) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));
    const q = vector(docs[0]);
    const qNorm = norm(q);
    return candidates
      .map((c, i) => {
        const v = vector(docs[i + 1]);
        const vNorm = norm(v);
        let dot = 0;
        for (const [t, w] of q) dot += w * (v.get(t) ?? 0);
        return { id: c.id, similarity: qNorm && vNorm ? dot / (qNorm * vNorm) : 0 };
      })
      .sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id))
      .slice(0, k);
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/**
 * Pure: receives precomputed vectors (candidate id to vector) and the query vector.
 * Any candidate without a usable vector (or all of them when the query vector is missing)
 * falls back to the lexical retriever, flagged `semantic: false`.
 */
export class EmbeddingRetriever implements Retriever {
  constructor(
    private readonly queryVector: number[] | null,
    private readonly vectors: ReadonlyMap<string, number[]>,
    private readonly fallback: Retriever = new LexicalRetriever(),
  ) {}

  retrieve(query: MatchDoc, candidates: MatchDoc[], k: number): RetrievedMatch[] {
    const q = this.queryVector;
    const usable = (id: string) => {
      const v = this.vectors.get(id);
      return q && v && v.length === q.length ? v : null;
    };
    const lexical = candidates.some((c) => !usable(c.id))
      ? new Map(this.fallback.retrieve(query, candidates, candidates.length).map((r) => [r.id, r.similarity]))
      : new Map<string, number>();
    return candidates
      .map((c): RetrievedMatch => {
        const v = usable(c.id);
        return v ? { id: c.id, similarity: Math.max(0, cosine(q!, v)), semantic: true }
          : { id: c.id, similarity: lexical.get(c.id) ?? 0, semantic: false };
      })
      .sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id))
      .slice(0, k);
  }
}
