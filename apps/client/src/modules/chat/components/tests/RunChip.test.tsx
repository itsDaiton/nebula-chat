import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGetRunMockHandler } from '@/libs/api/generated/runs/runs.msw';
import { ChatAssistantMessage } from '@/modules/chat/components/ChatAssistantMessage';
import type { ChatMessage } from '@/modules/chat/types/types';
import { useInspectorStore } from '@/modules/inspector/stores/useInspectorStore';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { renderWithProviders } from '@/test/render';
import { aRun, RUN_ID } from '@/test/runs';

const answer = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm1',
  role: 'assistant',
  content: 'Keep BullMQ.',
  runId: RUN_ID,
  ...overrides,
});

const chip = () => screen.findByRole('button', { name: /^Run/ });

beforeEach(() => {
  usePanelStore.setState({ rightOpen: false, sheetOpen: false });
  useInspectorStore.setState({ activeTab: 'session', selectedRunId: null });
  server.use(getGetRunMockHandler(aRun()));
});

describe('RunChip', () => {
  it("shows the Run's status, Step count and duration under the answer it produced", async () => {
    renderWithProviders(<ChatAssistantMessage message={answer()} />);

    expect(
      await screen.findByRole('button', { name: /^Run\s*partial\s*9 Steps · 41\.2s$/ }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('opens the Inspector on the Run tab with that Run selected', async () => {
    renderWithProviders(<ChatAssistantMessage message={answer()} />);

    await userEvent.click(await chip());

    expect(useInspectorStore.getState()).toMatchObject({ activeTab: 'run', selectedRunId: RUN_ID });
    expect(usePanelStore.getState().rightOpen).toBe(true);
    expect(await chip()).toHaveAttribute('aria-pressed', 'true');
  });

  it('is absent from a Direct reply and from a reply still streaming', () => {
    const { rerender } = renderWithProviders(
      <ChatAssistantMessage message={answer({ runId: null })} />,
    );
    expect(screen.queryByRole('button', { name: /^Run/ })).not.toBeInTheDocument();

    rerender(<ChatAssistantMessage message={answer()} isStreaming />);
    expect(screen.queryByRole('button', { name: /^Run/ })).not.toBeInTheDocument();
  });

  it('still opens the Inspector when the Run could not be loaded', async () => {
    server.use(mockApiError('get', API_ROUTE.run, 500));
    renderWithProviders(<ChatAssistantMessage message={answer()} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Run' }));

    expect(useInspectorStore.getState().selectedRunId).toBe(RUN_ID);
  });
});
