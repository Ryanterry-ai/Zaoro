import { exec } from 'child_process';
import { promisify } from 'util';
import type { LLMConfig, LLMMessage, LLMProviderAdapter, LLMResponse } from './types.js';

const execAsync = promisify(exec);

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-20250514';
const TIMEOUT_MS = 120_000;

function resolveModel(config: LLMConfig): string {
  return config.model ?? DEFAULT_MODEL;
}

function formatPrompt(messages: LLMMessage[]): string {
  return messages
    .map((m) => {
      if (m.role === 'system') return `[System]\n${m.content}`;
      if (m.role === 'assistant') return `[Assistant]\n${m.content}`;
      return `[User]\n${m.content}`;
    })
    .join('\n\n');
}

async function runOpenCodeCommand(args: string[], timeout: number): Promise<string> {
  const cmd = `opencode ${args.join(' ')}`;
  const { stdout, stderr } = await execAsync(cmd, {
    timeout,
    maxBuffer: 1024 * 1024 * 10,
    env: { ...process.env },
  });
  if (stderr && !stdout.trim()) {
    throw new Error(`opencode CLI error: ${stderr.trim()}`);
  }
  return stdout.trim();
}

async function tryCliRun(
  messages: LLMMessage[],
  config: LLMConfig,
): Promise<LLMResponse | null> {
  try {
    const prompt = formatPrompt(messages);
    const model = resolveModel(config);
    const escaped = prompt.replace(/"/g, '\\"').replace(/`/g, '\\`');

    const result = await runOpenCodeCommand(
      ['-m', model, '-p', `"${escaped}"`],
      TIMEOUT_MS,
    );

    if (!result) return null;

    return {
      content: result,
      model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      provider: 'opencode',
    };
  } catch {
    return null;
  }
}

async function callOpenCodeApi(
  messages: LLMMessage[],
  config: LLMConfig,
): Promise<LLMResponse> {
  const baseURL = config.baseURL ?? 'http://localhost:4096/api/chat';
  const model = resolveModel(config);

  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: config.maxTokens ?? 4096,
  };
  if (config.temperature !== undefined) body.temperature = config.temperature;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = config.apiKey ? process.env[config.apiKey] : undefined;
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const response = await fetch(baseURL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenCode API error ${response.status}: ${errBody}`);
  }

  const data = (await response.json()) as {
    content?: string;
    message?: string;
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  const content = data.content ?? data.message ?? data.choices?.[0]?.message?.content ?? '';

  return {
    content,
    model: data.model ?? model,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
    provider: 'opencode',
  };
}

export const openCodeAdapter: LLMProviderAdapter = {
  name: 'opencode',

  async isAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('opencode --version', { timeout: 5000 });
      return stdout.trim().length > 0;
    } catch {
      // fall through
    }
    try {
      const res = await fetch('http://localhost:4096/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    const cliResult = await tryCliRun(messages, config);
    if (cliResult) return cliResult;

    return callOpenCodeApi(messages, config);
  },

  async *stream(messages: LLMMessage[], config: LLMConfig): AsyncGenerator<string> {
    const baseURL = config.baseURL ?? 'http://localhost:4096/api/chat';
    const model = resolveModel(config);

    const body: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: config.maxTokens ?? 4096,
      stream: true,
    };
    if (config.temperature !== undefined) body.temperature = config.temperature;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = config.apiKey ? process.env[config.apiKey] : undefined;
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(baseURL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenCode streaming error ${response.status}: ${errBody}`);
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
              content?: string;
              choices?: Array<{ delta?: { content?: string } }>;
              delta?: { text?: string };
            };
            const token =
              event.content ??
              event.choices?.[0]?.delta?.content ??
              event.delta?.text;
            if (token) yield token;
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
