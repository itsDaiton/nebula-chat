import { describe, expect, it } from 'vitest';
import { llmConfigFor, stepInput } from '@worker/runs/agentDefinition';
import type { AgentDefinition } from '@worker/runs/agentDefinition';

const anAgent = (overrides: Partial<AgentDefinition> = {}): AgentDefinition => ({
  name: 'analyst',
  label: 'Analyst',
  model: 'gpt-4o-mini',
  prompt: 'analyst',
  tools: [],
  parameters: { temperature: 0.3, maxTokens: 512 },
  ...overrides,
});

const apiKeys = { openai: 'sk-test', anthropic: 'sk-ant-test' };

describe('llmConfigFor', () => {
  it("passes the Agent's temperature to a Model that accepts it", () => {
    expect(llmConfigFor(anAgent(), apiKeys)).toMatchObject({ temperature: 0.3, maxTokens: 512 });
  });

  it('keeps an explicit temperature of 0', () => {
    const agent = anAgent({ parameters: { temperature: 0 } });

    expect(llmConfigFor(agent, apiKeys)).toHaveProperty('temperature', 0);
  });

  it('drops the temperature for a Model that fixes it, keeping the other parameters', () => {
    const config = llmConfigFor(anAgent({ model: 'gpt-5-mini' }), apiKeys);

    expect(config).not.toHaveProperty('temperature');
    expect(config).toMatchObject({ model: 'gpt-5-mini', maxTokens: 512 });
  });
});

describe('stepInput', () => {
  it("records the Agent's parameters when the Model honours them", () => {
    expect(stepInput(anAgent(), 'system', 'human').parameters).toEqual({
      temperature: 0.3,
      maxTokens: 512,
    });
  });

  it('records the parameters actually sent, without the temperature the Model cannot take', () => {
    const input = stepInput(anAgent({ model: 'gpt-5-mini' }), 'system', 'human');

    expect(input.parameters).toEqual({ maxTokens: 512 });
  });
});
