import type { MatchDoc } from './types';

export interface Retriever {
  retrieve(query: MatchDoc, candidates: MatchDoc[], k: number): { id: string; similarity: number }[];
}

// ponytail: an embedding retriever (model to be agreed with Member 2, pgvector) implements this same interface later.

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
