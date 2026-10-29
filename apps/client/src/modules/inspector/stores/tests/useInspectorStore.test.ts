import { beforeEach, describe, expect, it } from 'vitest';
import {
  INSPECTOR_STORAGE_KEY,
  useInspectorStore,
} from '@/modules/inspector/stores/useInspectorStore';
import { usePanelStore } from '@/shared/stores/usePanelStore';

beforeEach(() => {
  localStorage.clear();
  useInspectorStore.setState({ activeTab: 'session', selectedRunId: null });
  usePanelStore.setState({ leftOpen: true, rightOpen: false, sheetOpen: false });
});

const state = () => useInspectorStore.getState();

describe('useInspectorStore', () => {
  it('opens the Inspector on a tab, and on a Run when it is the Run tab', () => {
    state().openInspector('run', 'run-1');

    expect(state()).toMatchObject({ activeTab: 'run', selectedRunId: 'run-1' });
    expect(usePanelStore.getState()).toMatchObject({ rightOpen: true, sheetOpen: true });
  });

  it('keeps the selected Run when it opens the Session tab', () => {
    state().openInspector('run', 'run-1');
    state().openInspector('session');

    expect(state()).toMatchObject({ activeTab: 'session', selectedRunId: 'run-1' });
  });

  it('remembers the tab but not the Run', () => {
    state().openInspector('run', 'run-1');

    expect(JSON.parse(localStorage.getItem(INSPECTOR_STORAGE_KEY) ?? '{}').state).toEqual({
      activeTab: 'run',
    });
  });
});
