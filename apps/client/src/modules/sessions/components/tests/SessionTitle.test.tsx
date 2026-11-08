import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRenameSessionResponseMock } from '@/libs/api/generated/sessions/sessions.msw';
import { SessionTitle } from '@/modules/sessions/components/SessionTitle';
import { useSessionTitleEditStore } from '@/modules/sessions/stores/useSessionTitleEditStore';
import { resources } from '@/resources';
import { aSession, mockGetSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderInRouter } from '@/test/renderRoute';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: toastError }) }));

const renames: unknown[] = [];

const answerRename = (status = 200) =>
  server.use(
    http.patch('*/api/sessions/:sessionId', async ({ request }) => {
      const body = await request.json();
      renames.push(body);
      if (status !== 200) {
        return HttpResponse.json(
          { success: false, error: 'Internal', message: 'boom' },
          { status },
        );
      }
      return HttpResponse.json(getRenameSessionResponseMock(body as { title: string }));
    }),
  );

const openEditor = async () => {
  await renderInRouter(<SessionTitle sessionId="abc" title="Old title" />);
  await userEvent.click(screen.getByRole('button', { name: 'Old title' }));
  return screen.getByRole('textbox', { name: resources.sessions.rename.label });
};

beforeEach(() => {
  renames.length = 0;
  vi.clearAllMocks();
  useSessionTitleEditStore.setState({ editing: false });
  server.use(mockGetSession(aSession()));
});

describe('SessionTitle', () => {
  it('shows a Rename tooltip on hover', async () => {
    await renderInRouter(<SessionTitle sessionId="abc" title="Old title" />);

    await userEvent.hover(screen.getByRole('button', { name: 'Old title' }));

    expect(await screen.findByText(resources.sessions.rename.tooltip)).toBeInTheDocument();
  });

  it('turns into a focused field with its text selected on click', async () => {
    const input = await openEditor();

    expect(input).toHaveFocus();
    expect((input as HTMLInputElement).selectionStart).toBe(0);
    expect((input as HTMLInputElement).selectionEnd).toBe('Old title'.length);
  });

  it('saves the trimmed title on Enter', async () => {
    answerRename();
    const input = await openEditor();

    await userEvent.clear(input);
    await userEvent.type(input, '  New title  {Enter}');

    await waitFor(() => expect(renames).toEqual([{ title: 'New title' }]));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('saves on blur', async () => {
    answerRename();
    const input = await openEditor();

    await userEvent.clear(input);
    await userEvent.type(input, 'Blurred');
    await userEvent.tab();

    await waitFor(() => expect(renames).toEqual([{ title: 'Blurred' }]));
  });

  it('cancels on Escape without a request', async () => {
    answerRename();
    const input = await openEditor();

    await userEvent.type(input, ' changed{Escape}');

    expect(screen.getByRole('button', { name: 'Old title' })).toBeInTheDocument();
    expect(renames).toEqual([]);
  });

  it.each(['', '   '])('keeps the old title for %j', async (value) => {
    answerRename();
    const input = await openEditor();

    await userEvent.clear(input);
    if (value) await userEvent.type(input, value);
    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Old title' })).toBeInTheDocument();
    expect(renames).toEqual([]);
  });

  it('toasts and keeps the old title when the save fails', async () => {
    answerRename(500);
    const input = await openEditor();

    await userEvent.clear(input);
    await userEvent.type(input, 'Doomed{Enter}');

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(resources.sessions.rename.failed));
    expect(screen.getByRole('button', { name: 'Old title' })).toBeInTheDocument();
  });
});
