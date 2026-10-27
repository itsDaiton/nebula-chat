import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadPrompts } from '@worker/llm/prompts';

describe('loadPrompts', () => {
  it('reads each system prompt from its Markdown file', () => {
    const prompts = loadPrompts();

    expect(prompts.directReply).toContain('You are Nebula Chat');
    expect(prompts.language).toContain('language agent');
    expect(prompts.session).toContain('session agent');
    expect(prompts.orchestrator).toContain('orchestrator of Nebula Chat');
    expect(prompts.analyst).toContain('analyst agent');
    expect(prompts.critic).toContain('critic agent');
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
