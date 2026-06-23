import type { LLMProvider } from '../../types/index.js';

const RETRY_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 3000;

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
        const content = await this.callProvider(systemPrompt, userPrompt);
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
    return this.callProvider(systemPrompt, userPrompt);
  }

  private async callProvider(systemPrompt: string, userPrompt: string): Promise<string> {
    switch (this.provider) {
      case 'gemini': return this.callGemini(systemPrompt, userPrompt);
      case 'openai': return this.callOpenAI(systemPrompt, userPrompt);
      case 'anthropic': return this.callAnthropic(systemPrompt, userPrompt);
      default: throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  private async callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 65536,
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Gemini HTTP ${response.status}: ${errBody.substring(0, 200)}`);
    }
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Empty Gemini response');
    return content;
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 16000
      })
    });
    if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    if (!response.ok) throw new Error(`Anthropic HTTP ${response.status}`);
    const data = await response.json();
    return data.content?.[0]?.text || '';
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
