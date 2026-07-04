import { describe, it, expect } from 'vitest';
import { GenerationIntent } from '../src/types/index.js';

describe('System Prompt Injection Handler', () => {
  const defaultPromptSnippet = 'Your task is to reconstruct the target user interface';

  it('should cleanly fall back to default prompt if systemPrompt is missing or empty', () => {
    const payload: GenerationIntent = { 
      type: 'clone-website',
      targetUrl: 'https://example.com'
    };
    const activePrompt = payload.systemPrompt?.trim() || defaultPromptSnippet;
    
    expect(activePrompt).toContain(defaultPromptSnippet);
  });

  it('should adopt the custom developer prompt when explicitly provided', () => {
    const payload: GenerationIntent = { 
      type: 'clone-website',
      targetUrl: 'https://example.com',
      systemPrompt: 'Emphasize high-contrast accessibility and dark mode rules.' 
    };
    const activePrompt = payload.systemPrompt?.trim() || defaultPromptSnippet;
    
    expect(activePrompt).toBe('Emphasize high-contrast accessibility and dark mode rules.');
    expect(activePrompt).not.toContain(defaultPromptSnippet);
  });

  it('should fall back to default prompt if systemPrompt is empty string', () => {
    const payload: GenerationIntent = { 
      type: 'clone-website',
      targetUrl: 'https://example.com',
      systemPrompt: ''
    };
    const activePrompt = payload.systemPrompt?.trim() || defaultPromptSnippet;
    
    expect(activePrompt).toContain(defaultPromptSnippet);
  });

  it('should fall back to default prompt if systemPrompt is whitespace only', () => {
    const payload: GenerationIntent = { 
      type: 'clone-website',
      targetUrl: 'https://example.com',
      systemPrompt: '   '
    };
    const activePrompt = payload.systemPrompt?.trim() || defaultPromptSnippet;
    
    expect(activePrompt).toContain(defaultPromptSnippet);
  });

  it('should preserve custom prompt with leading/trailing whitespace', () => {
    const payload: GenerationIntent = { 
      type: 'clone-website',
      targetUrl: 'https://example.com',
      systemPrompt: '  Custom prompt with spaces.  '
    };
    const activePrompt = payload.systemPrompt?.trim() || defaultPromptSnippet;
    
    expect(activePrompt).toBe('Custom prompt with spaces.');
    expect(activePrompt).not.toContain(defaultPromptSnippet);
  });
});
