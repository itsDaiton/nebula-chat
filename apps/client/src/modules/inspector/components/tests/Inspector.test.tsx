import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import {
  getGetSessionMockHandler,
  getListSessionsMockHandler,
} from '@/libs/api/generated/sessions/sessions.msw';
import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { useModelStore } from '@/modules/chat/stores/useModelStore';
import { useInspectorStore } from '@/modules/inspector/stores/useInspectorStore';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { aSession, mockGetSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const layout = vi.hoisted(() => ({ isMobile: false, showSidePanels: true, showRightPanel: true }));
vi.mock('@/shared/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => layout }));

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const MODEL_ID = 'gpt-4.1-mini';
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const message = (id: string, createdAt: string) => ({
  id,
  sessionId: SESSION_ID,
  content: 'hi',
  role: 'user',
  tokenCount: null,
  cached: false,
  createdAt,
});

const inspector = () => screen.findByRole('complementary', { name: resources.shell.inspector });
const runTab = () => screen.findByRole('tab', { name: resources.inspector.tabs.run });

beforeEach(() => {
  localStorage.clear();
  layout.isMobile = false;
  layout.showSidePanels = true;
  usePanelStore.setState({ leftOpen: true, rightOpen: true, sheetOpen: false });
  useInspectorStore.setState({ activeTab: 'session', selectedRunId: null });
  useModelStore.setState({ selectedModel: MODEL_ID });
  server.use(
    mockGetSession(aSession()),
    getListSessionsMockHandler({ sessions: [], nextCursor: null, hasMore: false }),
    getGetMessageAllowanceMockHandler({ metered: false }),
    getGetSessionMockHandler({
      id: SESSION_ID,
      title: 'Run events in the SSE parser',
      createdAt: '2026-10-27T18:02:00.000Z',
      archived: false,
      activeStreamId: null,
    }),
    getListMessagesMockHandler([message('m1', minutesAgo(30)), message('m2', minutesAgo(2))]),
  );
});

describe('Inspector Session tab', () => {
  it("shows the open Session's Model, limits, Message count and dates", async () => {
    await renderRoute(`/s/${SESSION_ID}`);
    const panel = within(await inspector());

    expect(await panel.findByText('GPT-4.1 mini')).toBeInTheDocument();
    expect(panel.getByText(MODEL_ID)).toBeInTheDocument();
    expect(panel.getByText('1,047,576 tokens')).toBeInTheDocument();
    expect(panel.getByText('32,768 tokens')).toBeInTheDocument();
    expect(await panel.findByText('2')).toBeInTheDocument();
    expect(panel.getByText('2m')).toBeInTheDocument();
    expect(panel.getByText(/^27 Oct, \d\d:\d\d$/)).toBeInTheDocument();
    expect(panel.queryByText(/system prompt/i)).not.toBeInTheDocument();
  });

  it('shows the Model a new chat will use when no Session is open', async () => {
    await renderRoute('/');
    const panel = within(await inspector());

    expect(await panel.findByText('GPT-4.1 mini')).toBeInTheDocument();
    expect(panel.getByText(resources.inspector.session.newChatNotice)).toBeInTheDocument();
    expect(panel.queryByText(resources.inspector.session.messages)).not.toBeInTheDocument();
  });
});

describe('Inspector Run tab', () => {
  it('explains the empty state and switches tabs with the keyboard', async () => {
    await renderRoute('/');
    const session = await screen.findByRole('tab', { name: resources.inspector.tabs.session });
    session.focus();

    await userEvent.keyboard('{ArrowRight}{Enter}');

    expect(await runTab()).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText(resources.inspector.run.emptyTitle)).toBeInTheDocument();
  });

  it('widens while the Run tab is active', async () => {
    await renderRoute('/');
    const panel = await inspector();
    expect(panel).toHaveClass('w-[300px]');

    await userEvent.click(await runTab());

    expect(panel).toHaveClass('w-[360px]');
  });

  it('opens on the Run tab when another component asks the store', async () => {
    usePanelStore.setState({ rightOpen: false });
    await renderRoute('/');
    expect(screen.queryByRole('complementary', { name: resources.shell.inspector })).toBeNull();

    act(() => useInspectorStore.getState().openInspector('run', 'run-1'));

    expect(await runTab()).toHaveAttribute('aria-selected', 'true');
  });

  it('closes from its own button', async () => {
    await renderRoute('/');
    await inspector();

    await userEvent.click(screen.getByRole('button', { name: resources.inspector.close }));

    await waitFor(() =>
      expect(
        screen.queryByRole('complementary', { name: resources.shell.inspector }),
      ).not.toBeInTheDocument(),
    );
  });
});

describe('Inspector on a small screen', () => {
  it('shows the same tabs in the bottom sheet', async () => {
    layout.isMobile = true;
    layout.showSidePanels = false;
    await renderRoute(`/s/${SESSION_ID}`);

    await userEvent.click(screen.getByRole('button', { name: resources.shell.togglePanel.right }));
    const sheet = within(await screen.findByRole('dialog', { name: resources.shell.inspector }));

    expect(await sheet.findByText('GPT-4.1 mini')).toBeInTheDocument();
    await userEvent.click(sheet.getByRole('button', { name: resources.inspector.close }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
