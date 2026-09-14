import { afterEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted above the imports, so its factory runs before a plain
// `const` would be initialised — vi.hoisted lifts the object with it.
const mockEnv = vi.hoisted(() => ({}) as { TRUST_PROXY?: string });

vi.mock('@backend/env', () => ({ env: mockEnv }));

import { resolveTrustProxy } from '@backend/utils/trustProxy';

/** Applies the resolved predicate the way @fastify/proxy-addr walks the XFF chain. */
const trustsHop = (trust: ReturnType<typeof resolveTrustProxy>, hop: number) =>
  typeof trust === 'function' ? trust('10.0.0.1', hop) : trust;

describe('resolveTrustProxy', () => {
  afterEach(() => {
    delete mockEnv.TRUST_PROXY;
  });

  it('trusts nothing when TRUST_PROXY is unset', () => {
    expect(resolveTrustProxy()).toBe(false);
  });

  it.each(['0', 'false', 'FALSE', '  ', ''])('treats %o as untrusted', (value) => {
    mockEnv.TRUST_PROXY = value;

    expect(resolveTrustProxy()).toBe(false);
  });

  it("trusts exactly one hop for 'true'", () => {
    mockEnv.TRUST_PROXY = 'true';
    const trust = resolveTrustProxy();

    expect(trustsHop(trust, 0)).toBe(true);
    expect(trustsHop(trust, 1)).toBe(false);
  });

  it('is case-insensitive for true', () => {
    mockEnv.TRUST_PROXY = 'TRUE';

    expect(trustsHop(resolveTrustProxy(), 0)).toBe(true);
  });

  it('trusts the first N hops for a positive integer', () => {
    mockEnv.TRUST_PROXY = '3';
    const trust = resolveTrustProxy();

    expect(trustsHop(trust, 0)).toBe(true);
    expect(trustsHop(trust, 2)).toBe(true);
    expect(trustsHop(trust, 3)).toBe(false);
  });

  it('ignores surrounding whitespace', () => {
    mockEnv.TRUST_PROXY = '  2  ';

    expect(trustsHop(resolveTrustProxy(), 1)).toBe(true);
  });

  it('passes a value with no leading digits through as a proxy-addr address expression', () => {
    mockEnv.TRUST_PROXY = 'loopback';

    expect(resolveTrustProxy()).toBe('loopback');
  });

  // KNOWN QUIRK, pinned rather than endorsed: Number.parseInt stops at the first
  // non-digit, so a CIDR beginning with digits is read as a hop count and never
  // reaches the address-expression branch the doc comment describes.
  // `TRUST_PROXY=10.0.0.0/8` therefore trusts 10 hops instead of one subnet,
  // which is strictly more permissive than the operator asked for.
  it('reads a leading integer out of a CIDR value instead of treating it as an address', () => {
    mockEnv.TRUST_PROXY = '10.0.0.0/8';
    const trust = resolveTrustProxy();

    expect(typeof trust).toBe('function');
    expect(trustsHop(trust, 9)).toBe(true);
    expect(trustsHop(trust, 10)).toBe(false);
  });

  it('passes a negative hop count through as an address expression rather than trusting it', () => {
    mockEnv.TRUST_PROXY = '-1';

    expect(resolveTrustProxy()).toBe('-1');
  });
});
