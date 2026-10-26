import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadPrompts } from '@worker/llm/prompts';

describe('loadPrompts', () => {
  it('reads each system prompt from its Markdown file', () => {
    const prompts = loadPrompts();

    expect(prompts.directReply).toContain('You are Nebula Chat');
    expect(prompts.languageDetection).toContain('language detection');
    expect(prompts.sessionSummary).toContain('Session summary');
    expect(prompts.output).toContain('final answer');
  });

  it('returns a frozen map', () => {
    expect(Object.isFrozen(loadPrompts())).toBe(true);
  });

  it('refuses to load when a prompt file is missing', () => {
    const empty = mkdtempSync(join(tmpdir(), 'prompts-'));

    expect(() => loadPrompts(empty)).toThrow(/Missing system prompt: .*directReply\.md/);
  });
});
