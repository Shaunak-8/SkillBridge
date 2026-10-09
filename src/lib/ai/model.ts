/**
 * Default Gemini text model for brief generation, refinement and translation (override with LLM_MODEL).
 * gemini-2.5-flash-lite returns 404 for newer API keys, and gemini-3.1-flash-lite is often slower than the 15s timeout.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
