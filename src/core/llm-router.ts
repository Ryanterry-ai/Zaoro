import { LLMProvider } from '../types/index.js';

export interface LLMProviderConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  capabilities: TaskType[];
  priority: number;
  maxTokens?: number;
  temperature?: number;
}

export type TaskType = 'code-generation' | 'image-generation' | 'analysis' | 'summarization' | 'translation' | 'reasoning';

interface TaskRoute {
  task: TaskType;
  providers: string[];
}

const DEFAULT_ROUTES: TaskRoute[] = [
  { task: 'code-generation', providers: ['groq', 'anthropic', 'openai', 'gemini'] },
  { task: 'reasoning', providers: ['groq', 'anthropic', 'openai'] },
  { task: 'analysis', providers: ['gemini', 'openai', 'anthropic', 'groq'] },
  { task: 'summarization', providers: ['gemini', 'openai', 'groq'] },
  { task: 'translation', providers: ['gemini', 'openai', 'groq'] },
  { task: 'image-generation', providers: ['gemini', 'openai'] },
];

export class LLMRouter {
  private providers: Map<string, LLMProviderConfig> = new Map();
  private routes: TaskRoute[];
  private healthStatus: Map<string, { healthy: boolean; lastCheck: number; errorCount: number }> = new Map();

  constructor(configs: LLMProviderConfig[], routes?: TaskRoute[]) {
    this.routes = routes || DEFAULT_ROUTES;

    for (const config of configs) {
      this.providers.set(config.provider, config);
      this.healthStatus.set(config.provider, { healthy: true, lastCheck: Date.now(), errorCount: 0 });
    }
  }

  selectProvider(task: TaskType, excludeProviders: string[] = []): LLMProviderConfig | null {
    const route = this.routes.find(r => r.task === task);
    if (!route) {
      return this.getFirstHealthy(excludeProviders);
    }

    for (const providerName of route.providers) {
      if (excludeProviders.includes(providerName)) continue;

      const config = this.providers.get(providerName);
      if (!config) continue;

      const health = this.healthStatus.get(providerName);
      if (health && !health.healthy && Date.now() - health.lastCheck < 60000) continue;

      return config;
    }

    return this.getFirstHealthy(excludeProviders);
  }

  private getFirstHealthy(exclude: string[]): LLMProviderConfig | null {
    const sorted = [...this.providers.entries()].sort((a, b) => a[1].priority - b[1].priority);

    for (const [name, config] of sorted) {
      if (exclude.includes(name)) continue;
      const health = this.healthStatus.get(name);
      if (health && !health.healthy && Date.now() - health.lastCheck < 60000) continue;
      return config;
    }

    return null;
  }

  reportSuccess(providerName: string): void {
    this.healthStatus.set(providerName, { healthy: true, lastCheck: Date.now(), errorCount: 0 });
  }

  reportFailure(providerName: string, error: any): void {
    const current = this.healthStatus.get(providerName) || { healthy: true, lastCheck: 0, errorCount: 0 };
    const newCount = current.errorCount + 1;

    this.healthStatus.set(providerName, {
      healthy: newCount < 3,
      lastCheck: Date.now(),
      errorCount: newCount,
    });

    console.log(`[router] Provider ${providerName} failure #${newCount}: ${error.message || error}`);
  }

  getAvailableProviders(): string[] {
    return [...this.providers.keys()].filter(name => {
      const health = this.healthStatus.get(name);
      return !health || health.healthy;
    });
  }

  getStatus(): Record<string, { healthy: boolean; errorCount: number; capabilities: string[] }> {
    const status: Record<string, { healthy: boolean; errorCount: number; capabilities: string[] }> = {};
    for (const [name, config] of this.providers) {
      const health = this.healthStatus.get(name);
      status[name] = {
        healthy: health?.healthy ?? true,
        errorCount: health?.errorCount ?? 0,
        capabilities: config.capabilities,
      };
    }
    return status;
  }
}

export function createRouterFromEnv(): LLMRouter {
  const configs: LLMProviderConfig[] = [];

  // Groq (primary) - Fast inference, free tier, excellent code gen
  const groqKey = process.env.GROQ_API_KEY || (process.env.LLM_PROVIDER === 'groq' ? process.env.LLM_API_KEY : undefined);
  if (groqKey) {
    configs.push({
      provider: 'groq',
      apiKey: groqKey,
      model: process.env.LLM_MODEL || 'llama-3.3-70b-versatile',
      capabilities: ['code-generation', 'reasoning', 'analysis', 'summarization', 'translation'],
      priority: 1,
      temperature: 0.3,
      maxTokens: 8192,
    });
  }

  // Gemini (fallback) - Good for analysis when credits available
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    configs.push({
      provider: 'gemini',
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      capabilities: ['analysis', 'summarization', 'translation', 'image-generation', 'code-generation'],
      priority: 2,
    });
  }

  // Anthropic (fallback) - Best reasoning but expensive
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    configs.push({
      provider: 'anthropic',
      apiKey: anthropicKey,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219',
      capabilities: ['code-generation', 'reasoning', 'analysis'],
      priority: 3,
    });
  }

  // OpenAI (last resort)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    configs.push({
      provider: 'openai',
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      capabilities: ['code-generation', 'reasoning', 'analysis', 'image-generation'],
      priority: 4,
    });
  }

  // Fallback: if only Gemini key exists without provider指定
  if (configs.length === 0 && geminiKey) {
    configs.push({
      provider: 'gemini',
      apiKey: geminiKey,
      model: 'gemini-2.5-flash',
      capabilities: ['code-generation', 'reasoning', 'analysis', 'summarization', 'translation', 'image-generation'],
      priority: 1,
    });
  }

  return new LLMRouter(configs);
}
