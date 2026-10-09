# WS5 matching evaluation

Ranker: `src/lib/matching` (lexical retriever + structured filters + skill/portfolio/category signals) run over the seeded data (`tests/fixtures/matching-eval.json`, mirrors `scripts/seed-ws5.mjs`). Expectations are asserted in `tests/matching-eval.test.ts` (24 tests, all met). Private student `s10` and the draft/completed/in_progress projects (`p13`, `p8`, `p4`) never appear.

## Students recommended for each published project (top 3)

| Project | Rank: student - reasons | Verdict |
|---|---|---|
| p1 Make our café orders flow (React, Graphic design) | 1. Aarav - both skills, canteen pre-order app used React and Graphic design. 2. Kabir - React, "Reorder alert prototype". 3. Dev - React, "Pharmacy inventory tracker". | Sensible |
| p2 A seasonal menu with a story (Menu development, Copywriting) | 1. Nisha - Menu development, Millet bakes series, prefers Culinary. 2. Tanvi - Copywriting, cafe interview study. 3. Zoya - Copywriting, bookstore Instagram revamp. | Sensible (Nisha is clearly right; 2-3 only cover copywriting) |
| p3 Product photography (Photography, Graphic design) | 1. Maya - both skills, Thrift store lookbook. 2. Aarav - Graphic design only. 3. Ishita - Graphic design only. | Sensible for #1; #2-3 are weak (no photography) but the only other design skills |
| p5 A social launch for Saffron (Social media, Photography) | 1. Maya - both skills. 2. Zoya - Social media, bookstore Instagram revamp. 3. Nisha - Social media only. | #1-2 sensible; #3 questionable (baker with a social skill listed, no evidence) |
| p6 Recipes that feel like home (Baking, Menu development) | 1. Nisha - both skills, Millet bakes series. | Sensible (only one real candidate) |
| p7 Tell the Mango & Co. story (Copywriting, Social media) | 1. Zoya - both skills, bookstore Instagram revamp. 2. Tanvi - Copywriting, prefers Writing & content. 3. Maya - Social media only. | Sensible |
| p9 Redesign our café floor layout (CAD drafting, Space planning) | 1. Ishita - both skills, Studio apartment layout set. | Sensible |
| p10 Clean up our books (Bookkeeping, Financial planning) | 1. Rohan - both skills, Family shop bookkeeping cleanup. | Sensible |
| p11 What do our customers think (User research, Copywriting) | 1. Tanvi - both skills, cafe interview study. 2. Zoya - Copywriting. 3. Dev - Copywriting only. | #1-2 sensible; #3 questionable (Dev's copywriting is incidental to a software profile) |
| p12 Festive bake box video (Video editing, Photography) | 1. Maya - Photography, Thrift store lookbook. | Sensible given the video editor (Arjun) is private; missing the video skill is shown honestly by the reasons |

## Projects recommended for each student (top 3)

| Student | Recommendations | Verdict |
|---|---|---|
| Aarav (React, Data analytics, Graphic design) | p1 (React + Graphic design, canteen app), p3 (Graphic design) | Sensible |
| Maya (Photography, Graphic design, Social media) | p3, p5, p12 | Sensible |
| Kabir (remote only) | p1 (React, Reorder alert prototype) | Sensible but thin; the Data analytics project p4 is in_progress so correctly excluded |
| Nisha (Baking, Menu development) | p6, p2, p5 | p6/p2 sensible; p5 weak (Social media only) |
| Zoya (Social media, Copywriting, Events) | p7, p5, p2 | Sensible |
| Dev (React, Data analytics, Copywriting; remote only) | p1, p7, p11 | p1 sensible; p7/p11 only via a secondary Copywriting skill - questionable |
| Ishita (CAD drafting, Space planning, Graphic design) | p9, p1, p3 | p9 sensible; p1/p3 via Graphic design only - weak but honest |
| Rohan (Bookkeeping, Financial planning; remote only) | p10 | Sensible |
| Tanvi (User research, Copywriting) | p11, p7, p2 | Sensible |
| Arjun (private) | none | Correct |

## Weaknesses

- Lexical retrieval cannot bridge synonyms: Zoya's "Instagram" portfolio item is not linked to "Social media" except through the exact skill tag, and "Video editing" vs. a "reel" would be missed entirely. This motivates the embedding retriever (agree model with Member 2); the `Retriever` slot is ready.
- Ranking leans on exact skill-string overlap, so one incidental shared skill (Copywriting, Graphic design, Social media) places an unrelated person in the top 3 when few strong candidates exist (p5 #3, p11 #3, Dev's p7/p11). A minimum matched-skill ratio or category requirement for weak matches would help.
- Skills have equal weight; the project's core skill (e.g. Photography for p12) is not distinguished from a supporting one.
- Remote-only students see few projects because the seed marks most projects on-site; hard filtering is correct but leaves Kabir and Rohan with a single result.
- Free-text signals (bio, problem statement) only act as a weak tie-breaker, so a student with the right domain but different skill tags is not found.
