import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHeader } from '@/shared/components/layout/AppHeader';
import { resources } from '@/resources';
import {
  getGetSessionResponseMock,
  getRenameSessionResponseMock,
} from '@/libs/api/generated/sessions/sessions.msw';
import { aSession, mockGetSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderInRouter } from '@/test/renderRoute';

const toggleThemeMode = vi.hoisted(() => vi.fn());
vi.mock('@/shared/hooks/useThemeMode', () => ({
  useThemeMode: () => ({ themeMode: 'dark', toggleThemeMode }),
}));

const renderHeader = (path = '/') =>
  renderInRouter(
    <AppHeader
      isDesktop
      leftOpen
      rightOpen
      onToggleLeft={vi.fn()}
      onToggleRight={vi.fn()}
      onOpenSearch={vi.fn()}
    />,
    { path },
  );

beforeEach(() => {
  vi.clearAllMocks();
  server.use(mockGetSession(aSession()));
});

describe('AppHeader colour mode', () => {
  it('shows the shortcut in the toggle tooltip', async () => {
    await renderHeader();

    await userEvent.hover(screen.getByRole('button', { name: resources.shell.toggleThemeMode }));

    const tooltip = await screen.findByText(resources.shell.toggleThemeMode, {
      selector: '[data-slot="tooltip-content"]',
    });
    expect(tooltip).toHaveTextContent('Y');
    expect(tooltip.querySelector('[data-slot="kbd"]')).toBeInTheDocument();
  });

  it('toggles on Ctrl+Shift+Y', async () => {
    await renderHeader();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Y', ctrlKey: true, shiftKey: true, bubbles: true }),
      );
    });

    expect(toggleThemeMode).toHaveBeenCalledTimes(1);
  });
});

describe('AppHeader Session title', () => {
  it('shows the new title after a rename, without a reload', async () => {
    let title = 'Old title';
    server.use(
      http.get('*/api/sessions/:sessionId', () =>
        HttpResponse.json(getGetSessionResponseMock({ id: 'abc', title })),
      ),
      http.patch('*/api/sessions/:sessionId', async ({ request }) => {
        title = ((await request.json()) as { title: string }).title;
        return HttpResponse.json(getRenameSessionResponseMock({ id: 'abc', title }));
      }),
    );
    await renderHeader('/s/abc');

    await userEvent.click(await screen.findByRole('button', { name: 'Old title' }));
    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.type(screen.getByRole('textbox'), 'New title{Enter}');

    expect(await screen.findByRole('button', { name: 'New title' })).toBeInTheDocument();
  });
});
