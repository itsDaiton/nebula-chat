import { beforeEach, describe, expect, it } from 'vitest';

type ToggleStore = {
  getState: () => Record<string, unknown>;
  setState: (partial: Record<string, unknown>) => void;
};

/**
 * useDrawerStore and useSearchStore are the same open/close store under two
 * names. The contract is asserted once here and invoked from each store's own
 * test file, so neither file tests the other's store.
 */
export const describeOpenCloseStore = (
  store: ToggleStore,
  keys: { flag: string; open: string; close: string; toggle: string },
): void => {
  const read = () => store.getState()[keys.flag] as boolean;
  const call = (action: string) => (store.getState()[action] as () => void)();

  beforeEach(() => {
    store.setState({ [keys.flag]: false });
  });

  describe('open/close contract', () => {
    it('starts closed', () => {
      expect(read()).toBe(false);
    });

    it('opens', () => {
      call(keys.open);

      expect(read()).toBe(true);
    });

    it('closes', () => {
      call(keys.open);
      call(keys.close);

      expect(read()).toBe(false);
    });

    it('is idempotent when opened twice', () => {
      call(keys.open);
      call(keys.open);

      expect(read()).toBe(true);
    });

    it('toggles from closed to open and back', () => {
      call(keys.toggle);
      expect(read()).toBe(true);

      call(keys.toggle);
      expect(read()).toBe(false);
    });
  });
};
