import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOS } from '@/shared/hooks/useOS';

describe('useOS', () => {
  it.each([
    ['MacIntel', 'mac'],
    ['iPhone', 'mac'],
    ['Win32', 'windows'],
    ['Linux x86_64', 'windows'],
  ])('maps platform %s to %s', (platform, expected) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(platform);

    const { result } = renderHook(() => useOS());

    expect(result.current).toBe(expected);
  });
});
