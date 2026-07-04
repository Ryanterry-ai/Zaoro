import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveLLMConfig } from '../src/core/resolve-llm-config.js';

describe('LLM Token Cascade Resolver', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear targeted tokens to isolate test stages
    delete process.env.OPENCODE_LLM_KEY;
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should prioritize OPENCODE_LLM_KEY over all other keys', () => {
    process.env.OPENCODE_LLM_KEY = 'opencode_secret';
    process.env.OPENAI_API_KEY = 'openai_secret';
    process.env.GROQ_API_KEY = 'groq_secret';

    const creds = resolveLLMConfig();
    expect(creds.apiKey).toBe('opencode_secret');
  });

  it('should use LLM_PROVIDER with OPENCODE_LLM_KEY', () => {
    process.env.OPENCODE_LLM_KEY = 'opencode_secret';
    process.env.LLM_PROVIDER = 'anthropic';

    const creds = resolveLLMConfig();
    expect(creds.apiKey).toBe('opencode_secret');
    expect(creds.provider).toBe('anthropic');
  });

  it('should default provider to openai with OPENCODE_LLM_KEY', () => {
    process.env.OPENCODE_LLM_KEY = 'opencode_secret';

    const creds = resolveLLMConfig();
    expect(creds.apiKey).toBe('opencode_secret');
    expect(creds.provider).toBe('openai');
  });

  it('should fall back to GROQ_API_KEY when OPENCODE_LLM_KEY is absent', () => {
    process.env.GROQ_API_KEY = 'groq_secret';

    const creds = resolveLLMConfig();
    expect(creds.apiKey).toBe('groq_secret');
    expect(creds.provider).toBe('groq');
  });

  it('should fall back to GEMINI_API_KEY when no dedicated keys', () => {
    process.env.GEMINI_API_KEY = 'gemini_secret';

    const creds = resolveLLMConfig();
    expect(creds.apiKey).toBe('gemini_secret');
    expect(creds.provider).toBe('gemini');
  });

  it('should fall back to ANTHROPIC_API_KEY when no dedicated keys', () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic_secret';

    const creds = resolveLLMConfig();
    expect(creds.apiKey).toBe('anthropic_secret');
    expect(creds.provider).toBe('anthropic');
  });

  it('should fall back to OPENAI_API_KEY when no other keys', () => {
    process.env.OPENAI_API_KEY = 'openai_secret';

    const creds = resolveLLMConfig();
    expect(creds.apiKey).toBe('openai_secret');
    expect(creds.provider).toBe('openai');
  });

  it('should fall back to LLM_API_KEY alone (without LLM_PROVIDER)', () => {
    process.env.LLM_API_KEY = 'llm_api_secret';

    const creds = resolveLLMConfig();
    expect(creds.apiKey).toBe('llm_api_secret');
    expect(creds.provider).toBe('openai');
  });

  it('should use LLM_PROVIDER and LLM_API_KEY together (legacy config)', () => {
    process.env.LLM_PROVIDER = 'gemini';
    process.env.LLM_API_KEY = 'llm_api_secret';

    const creds = resolveLLMConfig();
    expect(creds.apiKey).toBe('llm_api_secret');
    expect(creds.provider).toBe('gemini');
  });

  it('should return mock key in non-production when no keys configured', () => {
    process.env.NODE_ENV = 'development';

    const creds = resolveLLMConfig();
    expect(creds.apiKey).toBe('mock-local-development-key');
    expect(creds.provider).toBe('openai');
  });

  it('should throw in production when no keys configured', () => {
    process.env.NODE_ENV = 'production';

    expect(() => resolveLLMConfig()).toThrow('LLM Configuration Missing');
  });

  it('should prioritize legacy LLM_PROVIDER/LLM_API_KEY over provider-specific keys', () => {
    process.env.LLM_PROVIDER = 'anthropic';
    process.env.LLM_API_KEY = 'legacy_secret';
    process.env.GROQ_API_KEY = 'groq_secret';
    process.env.GEMINI_API_KEY = 'gemini_secret';

    const creds = resolveLLMConfig();
    expect(creds.apiKey).toBe('legacy_secret');
    expect(creds.provider).toBe('anthropic');
  });

  it('should not fall back to mock key in production test environment', () => {
    process.env.NODE_ENV = 'test';

    // test is not 'production', so should get mock key
    const creds = resolveLLMConfig();
    expect(creds.apiKey).toBe('mock-local-development-key');
  });

  it('should not crash in production with empty keys', () => {
    process.env.NODE_ENV = 'production';
    process.env.OPENAI_API_KEY = '';

    expect(() => resolveLLMConfig()).toThrow('LLM Configuration Missing');
  });
});
