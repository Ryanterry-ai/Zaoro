// adapters/llm-adapter.js
// Single callModel function — all skills use this, never direct API calls.
// Bucket B — this is the ONLY place LLM calls are made.

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(process.cwd(), 'docs', 'research', 'verification-run-log.jsonl');

const PRESETS = {
  'business-analysis': { temperature: 0.3, jsonMode: true },
  'visual-world': { temperature: 0.4, jsonMode: true },
  'component-build': { temperature: 0.2, jsonMode: false },
  'content-write': { temperature: 0.6, jsonMode: false },
  'structured-extract': { temperature: 0.1, jsonMode: true },
};

function logCall(entry) {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

async function callModel(taskType, prompt, context = {}, maxTokens = 4096) {
  const provider = process.env.LLM_PROVIDER || 'anthropic';
  const preset = PRESETS[taskType] || PRESETS['structured-extract'];

  const logEntry = {
    timestamp: new Date().toISOString(),
    provider,
    model: getModelForProvider(provider),
    taskType,
    callingSkill: context.callingSkill || 'unknown',
    tokens: maxTokens,
    promptLength: prompt.length,
  };

  try {
    let result;
    switch (provider) {
      case 'anthropic':
        result = await callAnthropic(prompt, preset, maxTokens);
        break;
      case 'openai':
        result = await callOpenAI(prompt, preset, maxTokens);
        break;
      case 'gemini':
        result = await callGemini(prompt, preset, maxTokens);
        break;
      case 'groq':
        result = await callGroq(prompt, preset, maxTokens);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    logEntry.success = true;
    logEntry.outputLength = result.length;
    logCall(logEntry);
    return result;
  } catch (error) {
    logEntry.success = false;
    logEntry.error = error.message;
    logCall(logEntry);
    throw error;
  }
}

function getModelForProvider(provider) {
  const models = {
    anthropic: 'claude-3-7-sonnet-20250219',
    openai: 'gpt-4o',
    gemini: 'gemini-2.5-flash',
    groq: 'llama-3.3-70b-versatile',
  };
  return process.env.LLM_MODEL || models[provider] || 'unknown';
}

async function callAnthropic(prompt, preset, maxTokens) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: getModelForProvider('anthropic'),
      max_tokens: maxTokens,
      temperature: preset.temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

async function callOpenAI(prompt, preset, maxTokens) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getModelForProvider('openai'),
      max_tokens: maxTokens,
      temperature: preset.temperature,
      response_format: preset.jsonMode ? { type: 'json_object' } : undefined,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

async function callGemini(prompt, preset, maxTokens) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${getModelForProvider('gemini')}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: preset.temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: preset.jsonMode ? 'application/json' : undefined,
        },
      }),
    }
  );

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

async function callGroq(prompt, preset, maxTokens) {
  const apiKey = process.env.GROQ_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getModelForProvider('groq'),
      max_tokens: maxTokens,
      temperature: preset.temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

function repairJSON(text) {
  // Bucket A — deterministic JSON repair, no second LLM call
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        JSON.parse(jsonMatch[0]);
        return jsonMatch[0];
      } catch {}
    }
    throw new Error('Could not repair JSON');
  }
}

module.exports = { callModel, repairJSON, logCall, PRESETS };
