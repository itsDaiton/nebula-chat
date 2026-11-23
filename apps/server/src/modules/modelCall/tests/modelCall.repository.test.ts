import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ where: undefined as unknown }));

vi.mock('@server/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async (condition: unknown) => {
          state.where = condition;
          return [{ total: 0.5 }];
        },
      }),
    }),
  },
}));

import { modelCallRepository } from '@server/modules/modelCall/modelCall.repository';

describe('modelCallRepository.sumCostUsd', () => {
  it('leaves Own-key calls out of the sum', async () => {
    const total = await modelCallRepository.sumCostUsd(
      'user-1',
      new Date('2026-11-01T00:00:00Z'),
      new Date('2026-12-01T00:00:00Z'),
    );

    const { sql, params } = new PgDialect().sqlToQuery(state.where as never);
    expect(total).toBe(0.5);
    expect(sql).toContain('"own_key" = $');
    expect(params).toContain(false);
  });
});
