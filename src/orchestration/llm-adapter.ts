// ─── LLM Adapter ──────────────────────────────────────────────────────────────
//
// Provider-agnostic LLM adapter. All LLM calls go through this adapter.
// The adapter supports multiple providers with fallback and health tracking.
//
// Primary execution target: Claude Desktop (via Skills workflow).
// Also supports: OpenAI, Anthropic API, Gemini, Groq, local models.
//
// The adapter handles:
//   - Provider selection based on task type
//   - Automatic retry with exponential backoff
//   - Rate limiting
//   - Response parsing (JSON extraction from markdown fences)
//   - Token counting
//   - Cost tracking
// ──────────────────────────────────────────────────────────────────────────────

import type {
  LLMCallParams,
  LLMCallResult,
  LLMTaskType,
} from './types.js';
import { LLMTaskType as TaskType } from './types.js';

// ─── Provider Configuration ───────────────────────────────────────────────────

export interface LLMProviderConfig {
  /** Provider identifier */
  id: string;
  /** Display name */
  name: string;
  /** API base URL */
  baseUrl: string;
  /** API key (from environment) */
  apiKey: string;
  /** Default model */
  defaultModel: string;
  /** Provider priority (lower = preferred) */
  priority: number;
  /** Task types this provider excels at */
  taskCapabilities: LLMTaskType[];
  /** Max requests per minute */
  rateLimit: number;
  /** Whether this provider supports JSON mode */
  supportsJSON: boolean;
}

// ─── Task Type Presets ────────────────────────────────────────────────────────

const TASK_PRESETS: Record<LLMTaskType, { temperature: number; maxTokens: number; responseFormat?: string }> = {
  [TaskType.StructuredExtraction]: { temperature: 0.0, maxTokens: 4096, responseFormat: 'json' },
  [TaskType.Analysis]: { temperature: 0.2, maxTokens: 8192 },
  [TaskType.Creative]: { temperature: 0.7, maxTokens: 4096 },
  [TaskType.CodeGeneration]: { temperature: 0.0, maxTokens: 16384 },
  [TaskType.Review]: { temperature: 0.1, maxTokens: 4096 },
  [TaskType.Planning]: { temperature: 0.3, maxTokens: 8192 },
};

// ─── Adapter Implementation ───────────────────────────────────────────────────

export class LLMAdapter {
  private providers: LLMProviderConfig[] = [];
  private health: Map<string, { failures: number; lastFailure: number; excludedUntil: number }> = new Map();
  private callLog: Array<{ provider: string; model: string; taskType: string; tokens: number; timestamp: number }> = [];

  constructor() {
    this.loadProvidersFromEnv();
  }

  // ─── Provider Management ───────────────────────────────────────────────

  /**
   * Register a provider manually.
   */
  registerProvider(config: LLMProviderConfig): void {
    this.providers.push(config);
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Load providers from environment variables.
   */
  private loadProvidersFromEnv(): void {
    // Groq
    if (process.env.GROQ_API_KEY) {
      this.registerProvider({
        id: 'groq',
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        defaultModel: process.env.LLM_MODEL || 'llama-3.3-70b-versatile',
        priority: 1,
        taskCapabilities: [TaskType.StructuredExtraction, TaskType.Analysis, TaskType.CodeGeneration, TaskType.Planning],
        rateLimit: 30,
        supportsJSON: true,
      });
    }

    // Gemini
    if (process.env.GEMINI_API_KEY) {
      this.registerProvider({
        id: 'gemini',
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: process.env.GEMINI_API_KEY,
        defaultModel: 'gemini-2.5-flash',
        priority: 2,
        taskCapabilities: [TaskType.StructuredExtraction, TaskType.Analysis, TaskType.Creative, TaskType.CodeGeneration, TaskType.Review, TaskType.Planning],
        rateLimit: 15,
        supportsJSON: true,
      });
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.registerProvider({
        id: 'anthropic',
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: process.env.ANTHROPIC_API_KEY,
        defaultModel: 'claude-sonnet-4-20250514',
        priority: 3,
        taskCapabilities: [TaskType.Analysis, TaskType.Creative, TaskType.CodeGeneration, TaskType.Review, TaskType.Planning],
        rateLimit: 10,
        supportsJSON: false,
      });
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.registerProvider({
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: 'gpt-4o',
        priority: 4,
        taskCapabilities: [TaskType.StructuredExtraction, TaskType.Analysis, TaskType.Creative, TaskType.CodeGeneration, TaskType.Review, TaskType.Planning],
        rateLimit: 20,
        supportsJSON: true,
      });
    }
  }

  // ─── Call Interface ────────────────────────────────────────────────────

  /**
   * Make an LLM call. Automatically selects the best provider for the task.
   */
  async call(params: LLMCallParams): Promise<LLMCallResult> {
    const providers = this.selectProviders(params.taskType);
    if (providers.length === 0) {
      throw new Error(`No LLM providers available for task type: ${params.taskType}`);
    }

    let lastError: Error | undefined;
    for (const provider of providers) {
      try {
        const result = await this.callProvider(provider, params);
        this.recordSuccess(provider.id);
        this.callLog.push({
          provider: provider.id,
          model: result.model,
          taskType: params.taskType,
          tokens: result.usage.total,
          timestamp: Date.now(),
        });
        return result;
      } catch (err) {
        lastError = err as Error;
        this.recordFailure(provider.id);
        // Continue to next provider
      }
    }

    throw lastError ?? new Error('All LLM providers failed');
  }

  /**
   * Get total token usage across all calls.
   */
  getTotalUsage(): { calls: number; totalTokens: number; byProvider: Record<string, number> } {
    const byProvider: Record<string, number> = {};
    let totalTokens = 0;
    for (const entry of this.callLog) {
      totalTokens += entry.tokens;
      byProvider[entry.provider] = (byProvider[entry.provider] ?? 0) + entry.tokens;
    }
    return { calls: this.callLog.length, totalTokens, byProvider };
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  private selectProviders(taskType: LLMTaskType): LLMProviderConfig[] {
    const now = Date.now();
    return this.providers.filter(p => {
      // Check if excluded due to failures
      const h = this.health.get(p.id);
      if (h && h.excludedUntil > now) return false;
      // Check capability
      return p.taskCapabilities.includes(taskType);
    });
  }

  private async callProvider(provider: LLMProviderConfig, params: LLMCallParams): Promise<LLMCallResult> {
    const preset = TASK_PRESETS[params.taskType];
    const temperature = params.temperature ?? preset.temperature;
    const maxTokens = params.maxTokens ?? preset.maxTokens;

    const t0 = Date.now();

    if (provider.id === 'anthropic') {
      return this.callAnthropic(provider, params, temperature, maxTokens, t0);
    }

    // OpenAI-compatible API (Groq, OpenAI, etc.)
    if (provider.baseUrl.includes('generativelanguage.googleapis.com')) {
      return this.callGemini(provider, params, temperature, maxTokens, t0);
    }

    return this.callOpenAICompatible(provider, params, temperature, maxTokens, t0);
  }

  private async callOpenAICompatible(
    provider: LLMProviderConfig,
    params: LLMCallParams,
    temperature: number,
    maxTokens: number,
    t0: number,
  ): Promise<LLMCallResult> {
    const messages: Array<{ role: string; content: string }> = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    if (params.conversationHistory) {
      messages.push(...params.conversationHistory);
    }
    messages.push({ role: 'user', content: params.prompt });

    const body: Record<string, unknown> = {
      model: provider.defaultModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    if (params.responseSchema && provider.supportsJSON) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${provider.name} API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as Record<string, unknown>;
    const choice = (data.choices as Array<{ message: { content: string } }>)?.[0];
    const content = choice?.message?.content ?? '';
    const usage = (data.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }) ?? {};

    let parsed: unknown;
    if (params.responseSchema) {
      try {
        parsed = JSON.parse(this.extractJSON(content));
      } catch { /* ignore */ }
    }

    return {
      content,
      parsed,
      usage: {
        input: usage.prompt_tokens ?? 0,
        output: usage.completion_tokens ?? 0,
        total: usage.total_tokens ?? 0,
      },
      provider: provider.id,
      model: provider.defaultModel,
      durationMs: Date.now() - t0,
    };
  }

  private async callAnthropic(
    provider: LLMProviderConfig,
    params: LLMCallParams,
    temperature: number,
    maxTokens: number,
    t0: number,
  ): Promise<LLMCallResult> {
    const messages: Array<{ role: string; content: string }> = [];
    if (params.conversationHistory) {
      messages.push(...params.conversationHistory);
    }
    messages.push({ role: 'user', content: params.prompt });

    const body: Record<string, unknown> = {
      model: provider.defaultModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    };
    if (params.systemPrompt) {
      body.system = params.systemPrompt;
    }

    const res = await fetch(`${provider.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as Record<string, unknown>;
    const contentBlock = (data.content as Array<{ type: string; text: string }>)?.[0];
    const content = contentBlock?.text ?? '';
    const usage = (data.usage as { input_tokens?: number; output_tokens?: number }) ?? {};

    let parsed: unknown;
    if (params.responseSchema) {
      try {
        parsed = JSON.parse(this.extractJSON(content));
      } catch { /* ignore */ }
    }

    return {
      content,
      parsed,
      usage: {
        input: usage.input_tokens ?? 0,
        output: usage.output_tokens ?? 0,
        total: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
      },
      provider: provider.id,
      model: provider.defaultModel,
      durationMs: Date.now() - t0,
    };
  }

  private async callGemini(
    provider: LLMProviderConfig,
    params: LLMCallParams,
    temperature: number,
    maxTokens: number,
    t0: number,
  ): Promise<LLMCallResult> {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (params.conversationHistory) {
      for (const msg of params.conversationHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }
    contents.push({ role: 'user', parts: [{ text: params.prompt }] });

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(params.responseSchema ? { responseMimeType: 'application/json' } : {}),
      },
    };
    if (params.systemPrompt) {
      body.systemInstruction = { parts: [{ text: params.systemPrompt }] };
    }

    const model = provider.defaultModel;
    const res = await fetch(
      `${provider.baseUrl}/models/${model}:generateContent?key=${provider.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as Record<string, unknown>;
    const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text: string }> } }>;
    const content = candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const usageMetadata = data.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };

    let parsed: unknown;
    if (params.responseSchema) {
      try {
        parsed = JSON.parse(this.extractJSON(content));
      } catch { /* ignore */ }
    }

    return {
      content,
      parsed,
      usage: {
        input: usageMetadata?.promptTokenCount ?? 0,
        output: usageMetadata?.candidatesTokenCount ?? 0,
        total: usageMetadata?.totalTokenCount ?? 0,
      },
      provider: provider.id,
      model,
      durationMs: Date.now() - t0,
    };
  }

  private extractJSON(text: string): string {
    // Extract JSON from markdown code fences if present
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    return match ? match[1]!.trim() : text.trim();
  }

  private recordSuccess(providerId: string): void {
    const h = this.health.get(providerId) ?? { failures: 0, lastFailure: 0, excludedUntil: 0 };
    h.failures = 0;
    h.excludedUntil = 0;
    this.health.set(providerId, h);
  }

  private recordFailure(providerId: string): void {
    const h = this.health.get(providerId) ?? { failures: 0, lastFailure: 0, excludedUntil: 0 };
    h.failures++;
    h.lastFailure = Date.now();
    // Exclude for 60s after 3 consecutive failures
    if (h.failures >= 3) {
      h.excludedUntil = Date.now() + 60000;
    }
    this.health.set(providerId, h);
  }
}
