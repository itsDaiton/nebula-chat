import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeStorage } from '@/shared/utils/safeStorage';

describe('safeStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('reads back what it wrote and forgets what it removed', () => {
    safeStorage.setItem('key', 'value');
    expect(safeStorage.getItem('key')).toBe('value');

    safeStorage.removeItem('key');

    expect(safeStorage.getItem('key')).toBeNull();
  });

  it('does not throw when localStorage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(safeStorage.getItem('key')).toBeNull();
    expect(() => safeStorage.setItem('key', 'value')).not.toThrow();
    expect(() => safeStorage.removeItem('key')).not.toThrow();
  });
});
