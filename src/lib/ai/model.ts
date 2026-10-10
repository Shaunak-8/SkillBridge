/**
 * Default Gemini text model for brief generation, refinement and translation (override with LLM_MODEL).
 * LLM_MODEL takes precedence. Use a model verified with the configured API key;
 * older models can be listed by the provider yet reject generateContent calls.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

