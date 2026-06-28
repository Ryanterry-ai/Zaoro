---
name: Model Adapter Layer
bucket: N/A
---

# Model Adapter Layer

## Purpose
Every skill must call the LLM through this layer. No skill may assume a specific model provider.

## Interface

```typescript
interface AdapterConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'local';
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

interface CallOptions {
  taskType: TaskType;
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'json' | 'text';
}

type TaskType =
  | 'structured-extraction'
  | 'component-breakdown'
  | 'creative-copy'
  | 'code-generation'
  | 'triage-fix'
  | 'merge-resolution';
```

## Task type presets

| TaskType | Temperature | JSON mode | Max tokens |
|----------|-------------|-----------|------------|
| structured-extraction | 0.0 | Yes | 4096 |
| component-breakdown | 0.1 | Yes | 4096 |
| creative-copy | 0.7 | No | 2048 |
| code-generation | 0.0 | No | 8192 |
| triage-fix | 0.0 | No | 4096 |
| merge-resolution | 0.0 | No | 2048 |

## Rules
1. If the configured model doesn't support structured output natively, the adapter validates/repairs JSON itself (Bucket A — a parser, not a second LLM call).
2. On JSON parse failure: one retry with the raw output fed back with "Fix the JSON, output only valid JSON" prefix.
3. Never retry more than once. If it fails twice, return the error to the calling skill.
4. Log every call with taskType, token count, latency, and success/failure for the run log.
