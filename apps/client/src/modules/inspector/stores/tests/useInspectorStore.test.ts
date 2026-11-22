import { beforeEach, describe, expect, it } from 'vitest';
import { useInspectorStore } from '@/modules/inspector/stores/useInspectorStore';
import { usePanelStore } from '@/shared/stores/usePanelStore';

beforeEach(() => {
  useInspectorStore.setState({ selectedRunId: null });
  usePanelStore.setState({ leftOpen: true, rightOpen: false, sheetOpen: false });
});

const state = () => useInspectorStore.getState();

describe('useInspectorStore', () => {
  it('selects a picked Run and opens the Inspector', () => {
    state().selectRun('run-1');

    expect(state().selectedRunId).toBe('run-1');
    expect(usePanelStore.getState()).toMatchObject({ rightOpen: true, sheetOpen: true });
  });

  it('shows a Run that just started, without raising the mobile sheet over the chat', () => {
    state().showRun('run-2');

    expect(state().selectedRunId).toBe('run-2');
    expect(usePanelStore.getState()).toMatchObject({ rightOpen: true, sheetOpen: false });
  });

  it('restores a selection without touching the panels, and can clear it', () => {
    state().restoreRun('run-3');
    expect(state().selectedRunId).toBe('run-3');
    expect(usePanelStore.getState()).toMatchObject({ rightOpen: false, sheetOpen: false });

    state().restoreRun(null);
    expect(state().selectedRunId).toBeNull();
  });
});
