import { describe, expect, it } from 'vitest';
import { paginationConfig } from '@backend/config/pagination.config';

describe('paginationConfig', () => {
  it('keeps the default page size within the maximum', () => {
    expect(paginationConfig.defaultLimit).toBeLessThanOrEqual(paginationConfig.maxLimit);
  });

  it('requests at least one row per page', () => {
    expect(paginationConfig.defaultLimit).toBeGreaterThan(0);
  });

  it('caps the page size, so a client cannot request an unbounded result set', () => {
    expect(paginationConfig.maxLimit).toBeGreaterThan(0);
    expect(Number.isFinite(paginationConfig.maxLimit)).toBe(true);
  });
});
