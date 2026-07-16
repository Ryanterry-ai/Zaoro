import type { LLMConfig, LLMProvider, LLMProviderAdapter } from './types.js';
import { claudeDesktopAdapter } from './claude-desktop.js';
import { codexAdapter } from './codex.js';
import { openCodeAdapter } from './opencode.js';

const adapters: Record<LLMProvider, LLMProviderAdapter> = {
  'claude-desktop': claudeDesktopAdapter,
  codex: codexAdapter,
  opencode: openCodeAdapter,
  gemini: createStubAdapter('gemini'),
  openai: createStubAdapter('openai'),
  ollama: createStubAdapter('ollama'),
  custom: createStubAdapter('custom'),
};

function createStubAdapter(name: LLMProvider): LLMProviderAdapter {
  return {
    name,
    async isAvailable() {
      return false;
    },
    async chat(_messages: never[], _config: never): Promise<never> {
      throw new Error(`Provider "${name}" adapter is not implemented yet.`);
    },
  };
}

export function createLLMProvider(config: LLMConfig): LLMProviderAdapter {
  const adapter = adapters[config.provider];
  if (!adapter) {
    throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
  return adapter;
}

export async function detectAvailableProviders(): Promise<LLMProvider[]> {
  const allProviders: LLMProvider[] = [
    'claude-desktop',
    'codex',
    'opencode',
    'gemini',
    'openai',
    'ollama',
  ];

  const checks = await Promise.allSettled(
    allProviders.map(async (p) => {
      const adapter = adapters[p];
      const available = await adapter.isAvailable();
      return { provider: p, available };
    }),
  );

  return checks
    .filter(
      (r): r is PromiseFulfilledResult<{ provider: LLMProvider; available: boolean }> =>
        r.status === 'fulfilled' && r.value.available,
    )
    .map((r) => r.value.provider);
}

export function getDefaultProvider(): LLMProvider {
  if (process.env.ANTHROPIC_API_KEY) return 'claude-desktop';
  if (process.env.OPENAI_API_KEY) return 'codex';
  if (process.env.GOOGLE_API_KEY) return 'gemini';
  return 'claude-desktop';
}

export { claudeDesktopAdapter, codexAdapter, openCodeAdapter };
