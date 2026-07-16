import { exec } from 'child_process';
import { promisify } from 'util';
import type { LLMConfig, LLMMessage, LLMProviderAdapter, LLMResponse } from './types.js';

const execAsync = promisify(exec);

const DEFAULT_MODEL = 'gpt-4o';
const TIMEOUT_MS = 120_000;

function resolveModel(config: LLMConfig): string {
  return config.model ?? DEFAULT_MODEL;
}

function formatPrompt(messages: LLMMessage[]): string {
  return messages
    .map((m) => {
      if (m.role === 'system') return `System: ${m.content}`;
      if (m.role === 'assistant') return `Assistant: ${m.content}`;
      return `User: ${m.content}`;
    })
    .join('\n\n');
}

async function runCodexCommand(args: string[], timeout: number): Promise<string> {
  const cmd = `codex ${args.join(' ')}`;
  const { stdout, stderr } = await execAsync(cmd, {
    timeout,
    maxBuffer: 1024 * 1024 * 10,
    env: { ...process.env },
  });
  if (stderr && !stdout.trim()) {
    throw new Error(`codex CLI error: ${stderr.trim()}`);
  }
  return stdout.trim();
}

async function callCodexApi(
  messages: LLMMessage[],
  config: LLMConfig,
): Promise<LLMResponse> {
  const apiKey = config.apiKey ? process.env[config.apiKey] : process.env.OPENAI_API_KEY;
  const baseURL = config.baseURL ?? 'https://api.openai.com/v1/chat/completions';
  const model = resolveModel(config);

  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: config.maxTokens ?? 4096,
  };
  if (config.temperature !== undefined) body.temperature = config.temperature;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(baseURL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  const content = data.choices?.[0]?.message?.content ?? '';

  return {
    content,
    model: data.model ?? model,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
    provider: 'codex',
  };
}

export const codexAdapter: LLMProviderAdapter = {
  name: 'codex',

  async isAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('codex --version', { timeout: 5000 });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  },

  async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    const prompt = formatPrompt(messages);

    try {
      const model = resolveModel(config);
      const result = await runCodexCommand(
        ['-m', model, prompt],
        config.maxTokens ? TIMEOUT_MS : TIMEOUT_MS,
      );

      return {
        content: result,
        model,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        provider: 'codex',
      };
    } catch {
      // CLI failed, fall back to API
      return callCodexApi(messages, config);
    }
  },

  async *stream(messages: LLMMessage[], config: LLMConfig): AsyncGenerator<string> {
    const apiKey = config.apiKey ? process.env[config.apiKey] : process.env.OPENAI_API_KEY;
    const baseURL = config.baseURL ?? 'https://api.openai.com/v1/chat/completions';
    const model = resolveModel(config);

    const body: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: config.maxTokens ?? 4096,
      stream: true,
    };
    if (config.temperature !== undefined) body.temperature = config.temperature;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(baseURL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI streaming error ${response.status}: ${errBody}`);
    }

    if (!response.body) throw new Error('No response body for streaming');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6);
          if (json === '[DONE]') return;

          try {
            const event = JSON.parse(json) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = event.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // skip malformed events
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
