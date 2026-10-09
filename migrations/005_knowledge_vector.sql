BEGIN;
-- Fix the embedding dimension (Gemini gemini-embedding-001 @ 768) and add an ANN index.
ALTER TABLE skillbridge.knowledge_chunks ALTER COLUMN embedding TYPE vector(768);
CREATE INDEX IF NOT EXISTS knowledge_embedding_hnsw_idx ON skillbridge.knowledge_chunks USING hnsw (embedding vector_cosine_ops);
COMMIT;
