import { neon } from "@neondatabase/serverless";

export function getDbClient() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.trim()) return null;
  try {
    return neon(dbUrl);
  } catch (error) {
    console.warn("Failed to initialize Neon DB client:", error);
    return null;
  }
}
