import { exec } from 'child_process';
import { promisify } from 'util';
import type { LLMConfig, LLMMessage, LLMProviderAdapter, LLMResponse } from './types.js';

const execAsync = promisify(exec);

const CLAUDE_DESKTOP_LOCAL_URL = 'http://127.0.0.1:5173';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const TIMEOUT_MS = 120_000;

function getApiKey(config: LLMConfig): string | undefined {
  const envVar = config.apiKey;
  if (!envVar) return undefined;
  return process.env[envVar];
}

function resolveModel(config: LLMConfig): string {
  return config.model ?? DEFAULT_MODEL;
}

function formatMessagesForAnthropic(messages: LLMMessage[]): { system: string; messages: Array<{ role: string; content: string }> } {
  const systemParts: string[] = [];
  const userMessages: Array<{ role: string; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push(msg.content);
    } else {
      userMessages.push({ role: msg.role, content: msg.content });
    }
  }

  return {
    system: systemParts.join('\n'),
    messages: userMessages,
  };
}

function formatMessagesForDesktopCli(messages: LLMMessage[]): string {
  const parts: string[] = [];
  for (const msg of messages) {
    parts.push(`[${msg.role}] ${msg.content}`);
  }
  return parts.join('\n\n');
}

async function tryDesktopCli(messages: LLMMessage[]): Promise<LLMResponse | null> {
  try {
    const prompt = formatMessagesForDesktopCli(messages);
    const escaped = prompt.replace(/'/g, "''");
    const { stdout } = await execAsync(
      `claude --print -p '${escaped}'`,
      { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 * 10 },
    );
    const content = stdout.trim();
    if (!content) return null;
    return {
      content,
      model: DEFAULT_MODEL,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      provider: 'claude-desktop',
    };
  } catch {
    return null;
  }
}

async function tryDesktopLocalApi(
  messages: LLMMessage[],
  model: string,
): Promise<LLMResponse | null> {
  try {
    const { system, messages: chatMessages } = formatMessagesForAnthropic(messages);
    const response = await fetch(`${CLAUDE_DESKTOP_LOCAL_URL}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        messages: chatMessages,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      model?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const text = data.content
      ?.filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('');

    if (!text) return null;

    return {
      content: text,
      model: data.model ?? model,
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      provider: 'claude-desktop',
    };
  } catch {
    return null;
  }
}

async function callAnthropicApi(
  messages: LLMMessage[],
  config: LLMConfig,
): Promise<LLMResponse> {
  const apiKey = getApiKey(config);
  if (!apiKey) {
    throw new Error('Claude Desktop adapter: no API key provided. Set apiKey in config to an env var name containing your Anthropic key.');
  }

  const model = resolveModel(config);
  const { system, messages: chatMessages } = formatMessagesForAnthropic(messages);

  const body: Record<string, unknown> = {
    model,
    max_tokens: config.maxTokens ?? 4096,
    messages: chatMessages,
  };
  if (system) body.system = system;
  if (config.temperature !== undefined) body.temperature = config.temperature;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
    model: string;
    usage: { input_tokens: number; output_tokens: number };
  };

  const text = data.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('');

  return {
    content: text,
    model: data.model,
    usage: {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    },
    provider: 'claude-desktop',
  };
}

export const claudeDesktopAdapter: LLMProviderAdapter = {
  name: 'claude-desktop',

  async isAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('claude --version', { timeout: 5000 });
      return stdout.trim().length > 0;
    } catch {
      // fall through
    }
    try {
      const res = await fetch(`${CLAUDE_DESKTOP_LOCAL_URL}/v1/messages`, {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(3000),
      });
      return res.ok || res.status === 404 || res.status === 405;
    } catch {
      return false;
    }
  },

  async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    const cliResult = await tryDesktopCli(messages);
    if (cliResult) return cliResult;

    const model = resolveModel(config);
    const localResult = await tryDesktopLocalApi(messages, model);
    if (localResult) return localResult;

    return callAnthropicApi(messages, config);
  },

  async *stream(messages: LLMMessage[], config: LLMConfig): AsyncGenerator<string> {
    const apiKey = getApiKey(config);
    if (!apiKey) {
      throw new Error('Claude Desktop streaming requires an API key.');
    }

    const model = resolveModel(config);
    const { system, messages: chatMessages } = formatMessagesForAnthropic(messages);

    const body: Record<string, unknown> = {
      model,
      max_tokens: config.maxTokens ?? 4096,
      messages: chatMessages,
      stream: true,
    };
    if (system) body.system = system;
    if (config.temperature !== undefined) body.temperature = config.temperature;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Anthropic streaming error ${response.status}: ${errBody}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

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
              type?: string;
              delta?: { text?: string };
            };
            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield event.delta.text;
            }
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
