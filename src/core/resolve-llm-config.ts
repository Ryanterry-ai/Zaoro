/**
 * Resolves LLM provider configuration from environment variables.
 * Supports both LLM_PROVIDER/LLM_API_KEY (legacy) and GROQ_API_KEY/GEMINI_API_KEY (render.yaml).
 * Legacy vars take precedence if both are set.
 */
export function resolveLLMConfig(): { provider: string; apiKey: string } {
  // Legacy explicit config takes precedence
  if (process.env.LLM_PROVIDER && process.env.LLM_API_KEY) {
    return { provider: process.env.LLM_PROVIDER, apiKey: process.env.LLM_API_KEY };
  }
  // Provider-specific keys from render.yaml
  if (process.env.GROQ_API_KEY) {
    return { provider: 'groq', apiKey: process.env.GROQ_API_KEY };
  }
  if (process.env.GEMINI_API_KEY) {
    return { provider: 'gemini', apiKey: process.env.GEMINI_API_KEY };
  }
  // Fallback to legacy (may be empty)
  return { provider: process.env.LLM_PROVIDER || 'openai', apiKey: process.env.LLM_API_KEY || '' };
}