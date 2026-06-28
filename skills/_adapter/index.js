/**
 * Build Engine — Model Adapter
 * The single point of contact between skills and LLM providers.
 * All model-specific glue lives here. No skill may call a model directly.
 */

const TASK_PRESETS = {
  'structured-extraction': { temperature: 0.0, jsonMode: true, maxTokens: 4096 },
  'component-breakdown':   { temperature: 0.1, jsonMode: true, maxTokens: 4096 },
  'creative-copy':         { temperature: 0.7, jsonMode: false, maxTokens: 2048 },
  'code-generation':       { temperature: 0.0, jsonMode: false, maxTokens: 8192 },
  'triage-fix':            { temperature: 0.0, jsonMode: false, maxTokens: 4096 },
  'merge-resolution':      { temperature: 0.0, jsonMode: false, maxTokens: 2048 },
};

const PROVIDERS = {
  openai:    { baseUrl: 'https://api.openai.com/v1',  chatEndpoint: '/chat/completions' },
  anthropic: { baseUrl: 'https://api.anthropic.com',   chatEndpoint: '/v1/messages' },
  google:    { baseUrl: 'https://generativelanguage.googleapis.com', chatEndpoint: '/v1beta/models' },
  groq:      { baseUrl: 'https://api.groq.com/openai', chatEndpoint: '/v1/chat/completions' },
  local:     { baseUrl: 'http://localhost:11434',       chatEndpoint: '/api/chat' },
};

function getConfig() {
  return {
    provider: process.env.BUILD_ENGINE_PROVIDER || 'openai',
    model:    process.env.BUILD_ENGINE_MODEL || 'gpt-4o-mini',
    apiKey:   process.env.BUILD_ENGINE_API_KEY || '',
    baseUrl:  process.env.BUILD_ENGINE_BASE_URL,
  };
}

/**
 * Call the configured LLM provider.
 * @param {object} options
 * @param {string} options.taskType - One of the TaskType values
 * @param {string} options.prompt - The user/system prompt
 * @param {string} [options.context] - Additional context
 * @param {number} [options.maxTokens] - Override max tokens
 * @param {number} [options.temperature] - Override temperature
 * @param {'json'|'text'} [options.responseFormat] - Override response format
 * @returns {Promise<{content: string, usage: object, latencyMs: number}>}
 */
async function callModel(options) {
  const {
    taskType,
    prompt,
    context,
    maxTokens: overrideMaxTokens,
    temperature: overrideTemp,
    responseFormat: overrideFormat,
  } = options;

  const config = getConfig();
  const preset = TASK_PRESETS[taskType] || TASK_PRESETS['structured-extraction'];
  const provider = PROVIDERS[config.provider];

  if (!provider) {
    throw new Error(`Unknown provider: ${config.provider}. Supported: ${Object.keys(PROVIDERS).join(', ')}`);
  }

  const temperature = overrideTemp ?? preset.temperature;
  const maxTokens = overrideMaxTokens ?? preset.maxTokens;
  const jsonMode = overrideFormat === 'json' || (overrideFormat === undefined && preset.jsonMode);

  const fullPrompt = context ? `${context}\n\n---\n\n${prompt}` : prompt;
  const startTime = Date.now();

  let response;
  if (config.provider === 'anthropic') {
    response = await callAnthropic(config, provider, fullPrompt, temperature, maxTokens);
  } else if (config.provider === 'google') {
    response = await callGoogle(config, provider, fullPrompt, temperature, maxTokens);
  } else {
    response = await callOpenAICompatible(config, provider, fullPrompt, temperature, maxTokens, jsonMode);
  }

  const latencyMs = Date.now() - startTime;

  const result = {
    content: response.content,
    usage: response.usage || {},
    latencyMs,
    taskType,
    provider: config.provider,
    model: config.model,
  };

  logCall(result);
  return result;
}

async function callOpenAICompatible(config, provider, prompt, temperature, maxTokens, jsonMode) {
  const url = `${config.baseUrl || provider.baseUrl}${provider.chatEndpoint}`;
  const body = {
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage,
  };
}

async function callAnthropic(config, provider, prompt, temperature, maxTokens) {
  const url = `${config.baseUrl || provider.baseUrl}${provider.chatEndpoint}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    content: data.content?.[0]?.text || '',
    usage: data.usage,
  };
}

async function callGoogle(config, provider, prompt, temperature, maxTokens) {
  const url = `${config.baseUrl || provider.baseUrl}/${config.model}:generateContent?key=${config.apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    usage: data.usageMetadata,
  };
}

function logCall(result) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    taskType: result.taskType,
    provider: result.provider,
    model: result.model,
    latencyMs: result.latencyMs,
    tokens: result.usage,
    success: !!result.content,
  };
  // Append to run log (deterministic — no LLM)
  const fs = require('fs');
  const path = require('path');
  const logDir = path.join(process.cwd(), 'docs', 'research');
  const logFile = path.join(logDir, 'llm-run-log.jsonl');
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch { /* best effort */ }
}

/**
 * Validate and repair JSON if needed. Pure deterministic — no LLM.
 */
function validateJson(raw) {
  try {
    return { valid: true, data: JSON.parse(raw) };
  } catch {
    // Try to extract JSON from markdown code blocks
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return { valid: true, data: JSON.parse(match[1].trim()) };
      } catch { /* fall through */ }
    }
    // Try to find first { or [ to last } or ]
    const firstBrace = raw.indexOf('{');
    const firstBracket = raw.indexOf('[');
    let start = -1;
    if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) start = firstBrace;
    else if (firstBracket >= 0) start = firstBracket;

    if (start >= 0) {
      const lastBrace = raw.lastIndexOf('}');
      const lastBracket = raw.lastIndexOf(']');
      const end = Math.max(lastBrace, lastBracket);
      if (end > start) {
        try {
          return { valid: true, data: JSON.parse(raw.slice(start, end + 1)) };
        } catch { /* fall through */ }
      }
    }
    return { valid: false, data: null, error: 'Failed to parse JSON' };
  }
}

module.exports = { callModel, validateJson, TASK_PRESETS, PROVIDERS, getConfig };
