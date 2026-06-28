import type { LLMProvider } from '../../types/index.js';

const RETRY_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 3000;

/**
 * BILLMCaller — thin wrapper around skills/_adapter/index.js.
 * All LLM calls go through the adapter. This class exists for backward
 * compatibility with the 10 BI core modules that import it.
 */
export class BILLMCaller {
  private provider: LLMProvider;
  private apiKey: string;
  private model: string;

  constructor(provider: LLMProvider, apiKey: string, model?: string) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model || this.defaultModel(provider);
  }

  private defaultModel(provider: LLMProvider): string {
    switch (provider) {
      case 'anthropic': return 'claude-3-7-sonnet-20250219';
      case 'gemini': return 'gemini-2.5-flash';
      case 'openai':
      default: return 'gpt-4o';
    }
  }

  async callStructured<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`[bi-llm] ${this.provider}/${this.model} (attempt ${attempt})`);
        const content = await this.callAdapter('structured-extraction', systemPrompt, userPrompt);
        return this.parseJSON<T>(content);
      } catch (err: any) {
        const isQuota = /429|quota/i.test(err.message || '');
        const isTransient = /429|500|502|503|504|ECONNRESET|ETIMEDOUT/.test(err.message || '');

        if (isQuota) {
          console.log(`[bi-llm] Quota exhausted. Using structured fallback.`);
          throw new Error('QUOTA_EXHAUSTED');
        }

        if (attempt < RETRY_ATTEMPTS && isTransient) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`[bi-llm] Transient error. Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }
        throw err;
      }
    }
    throw new Error('LLM call failed after retries');
  }

  async callRaw(systemPrompt: string, userPrompt: string): Promise<string> {
    return this.callAdapter('structured-extraction', systemPrompt, userPrompt);
  }

  private async callAdapter(taskType: string, systemPrompt: string, userPrompt: string): Promise<string> {
    // Delegate to skills/_adapter/index.js callModel()
    const path = await import('path');
    const adapterPath = path.resolve(process.cwd(), 'skills', '_adapter', 'index.js');
    const adapter = await import(adapterPath);
    const result = await adapter.callModel({
      taskType,
      prompt: userPrompt,
      context: systemPrompt,
    });
    return result.content;
  }

  private parseJSON<T>(content: string): T {
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return JSON.parse(cleaned.substring(start, end + 1)) as T;
      }
      throw new Error(`Failed to parse JSON from LLM response: ${cleaned.substring(0, 200)}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
