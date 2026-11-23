import { describe, expect, it } from 'vitest';
import { agentHash } from '@worker/runs/agentHash';

const anAgentFile = () => ({
  name: 'analyst',
  kind: 'delegate',
  label: 'Analysing',
  description: 'Works through a question.',
  model: 'gpt-4.1-mini',
  prompt: 'analyst',
  tools: ['web_search'],
  parameters: { temperature: 0.3 },
});

describe('agentHash', () => {
  it('ignores the version, the hash and the order of the keys', () => {
    const file = anAgentFile();
    const reordered = Object.fromEntries(Object.entries(file).reverse());

    expect(agentHash({ ...reordered, version: 'x', hash: 'y' }, 'prompt')).toBe(
      agentHash(file, 'prompt'),
    );
  });

  it('changes when the prompt text changes', () => {
    expect(agentHash(anAgentFile(), 'A prompt.')).not.toBe(agentHash(anAgentFile(), 'A prompt!'));
  });

  it.each([
    ['model', (file: ReturnType<typeof anAgentFile>) => (file.model = 'gpt-4.1')],
    ['temperature', (file: ReturnType<typeof anAgentFile>) => (file.parameters.temperature = 0.9)],
    ['label', (file: ReturnType<typeof anAgentFile>) => (file.label = 'Something else')],
    ['tools', (file: ReturnType<typeof anAgentFile>) => file.tools.push('web_fetch')],
  ])('changes when the %s changes', (_field, edit) => {
    const edited = anAgentFile();
    edit(edited);

    expect(agentHash(edited, 'prompt')).not.toBe(agentHash(anAgentFile(), 'prompt'));
  });
});
