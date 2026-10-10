import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { reindexKnowledge } from "../src/lib/ai/knowledge-index";

// Run with `npm run db:index` (tsx --conditions react-server, so 'server-only' resolves).
// Pass `--force` to re-embed every chunk even when its content hash is unchanged.
async function main() {
  const { total, embedded, skipped, failed } = await reindexKnowledge({ force: process.argv.includes("--force") });
  console.log(`Knowledge chunks: ${total} total, ${embedded} embedded, ${skipped} skipped (unchanged), ${failed} failed.`);
  if (failed > 0) throw new Error(`${failed} chunk(s) have no valid 768-dim embedding; check GEMINI_API_KEY.`);
}

main().catch((err) => {
  console.error("Indexing failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
