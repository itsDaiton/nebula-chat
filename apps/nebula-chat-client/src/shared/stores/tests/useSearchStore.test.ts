import { describe } from 'vitest';
import { useSearchStore } from '@/shared/stores/useSearchStore';
import { describeOpenCloseStore } from '@/shared/stores/tests/openCloseStore.contract';

describe('useSearchStore', () => {
  describeOpenCloseStore(useSearchStore, {
    flag: 'isSearchOpen',
    open: 'openSearch',
    close: 'closeSearch',
    toggle: 'toggleSearch',
  });
});
