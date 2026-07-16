export type LLMProvider = 'claude-desktop' | 'codex' | 'opencode' | 'gemini' | 'openai' | 'ollama' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  apiKey?: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: LLMProvider;
}

export interface LLMProviderAdapter {
  name: LLMProvider;
  isAvailable(): Promise<boolean>;
  chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse>;
  stream?(messages: LLMMessage[], config: LLMConfig): AsyncGenerator<string>;
}

export interface LLMProviderError {
  provider: LLMProvider;
  message: string;
  code?: string;
  retryable: boolean;
}
