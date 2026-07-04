/**
 * Resolves LLM provider configuration from environment variables.
 * Implements a cascading check that prioritizes dedicated instance variables
 * while falling back gracefully to standard universal flags.
 *
 * Resolution order:
 * 1. OPENCODE_LLM_KEY (dedicated instance token)
 * 2. LLM_API_KEY (legacy explicit config)
 * 3. Provider-specific keys (GROQ_API_KEY, GEMINI_API_KEY, etc.)
 * 4. OPENAI_API_KEY (standard platform flag)
 * 5. Mock key in non-production (graceful degradation)
 * 6. Throw meaningful error in production (fail-safe)
 */
export function resolveLLMConfig(): { provider: string; apiKey: string } {
  // 1. Direct Dedicated Token Check
  if (process.env.OPENCODE_LLM_KEY) {
    return { provider: process.env.LLM_PROVIDER || 'openai', apiKey: process.env.OPENCODE_LLM_KEY };
  }

  // 2. Legacy Explicit Config (both provider and key must be set)
  if (process.env.LLM_PROVIDER && process.env.LLM_API_KEY) {
    return { provider: process.env.LLM_PROVIDER, apiKey: process.env.LLM_API_KEY };
  }

  // 3. Provider-specific keys from render.yaml
  if (process.env.GROQ_API_KEY) {
    return { provider: 'groq', apiKey: process.env.GROQ_API_KEY };
  }
  if (process.env.GEMINI_API_KEY) {
    return { provider: 'gemini', apiKey: process.env.GEMINI_API_KEY };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY };
  }

  // 4. Cascade Fallback to Standard Platform Flag
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY };
  }

  // 5. LLM_API_KEY alone (without LLM_PROVIDER)
  if (process.env.LLM_API_KEY) {
    return { provider: process.env.LLM_PROVIDER || 'openai', apiKey: process.env.LLM_API_KEY };
  }

  // 6. Fail-safe: Non-crashing default fallback behavior
  if (process.env.NODE_ENV !== 'production') {
    return { provider: 'openai', apiKey: 'mock-local-development-key' };
  }

  // In production, throw a tailored, meaningful engine error instead of letting axios/sdk explode with a 401
  throw new Error(
    'LLM Configuration Missing: Please configure OPENCODE_LLM_KEY or OPENAI_API_KEY in your system environment variables.',
  );
}
