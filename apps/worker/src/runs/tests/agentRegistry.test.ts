import { describe, expect, it } from 'vitest';
import { getModel, RUN_PROVIDERS } from '@nebula-chat/contracts';
import { AGENTS, DELEGATES } from '@worker/runs/agentRegistry';

describe('RUN_PROVIDERS', () => {
  it('lists exactly the providers the Run Agents call', () => {
    const used = [...Object.values(AGENTS), ...DELEGATES].map(
      ({ model }) => getModel(model).provider,
    );

    expect([...new Set(used)].sort()).toEqual([...RUN_PROVIDERS].sort());
  });
});
