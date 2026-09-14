import { describe } from 'vitest';
import { useDrawerStore } from '@/shared/stores/useDrawerStore';
import { describeOpenCloseStore } from '@/shared/stores/tests/openCloseStore.contract';

describe('useDrawerStore', () => {
  describeOpenCloseStore(useDrawerStore, {
    flag: 'isDrawerOpen',
    open: 'openDrawer',
    close: 'closeDrawer',
    toggle: 'toggleDrawer',
  });
});
