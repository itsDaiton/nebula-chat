import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { getRestoreSessionMockHandler } from '@/libs/api/generated/sessions/sessions.msw';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { resources } from '@/resources';
import { API_ROUTE } from '@/test/api';
import { holdSession } from '@/test/auth';
import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const { archived } = resources.settings;

const aSession = (id: string, title: string, isArchived: boolean) => ({
  id,
  title,
  createdAt: '2026-06-15T11:00:00.000Z',
  archived: isArchived,
});

/** Serves the active list and the archived one, the way the server filters on `archived=true`. */
const serveLists = (
  active: ReturnType<typeof aSession>[],
  archivedOnes: ReturnType<typeof aSession>[],
) => {
  const state = { active, archived: archivedOnes };
  server.use(
    http.get(API_ROUTE.sessions, ({ request }) => {
      const wantsArchived = new URL(request.url).searchParams.get('archived') === 'true';
      return HttpResponse.json({
        sessions: wantsArchived ? state.archived : state.active,
        nextCursor: null,
        hasMore: false,
      });
    }),
    getGetMessageAllowanceMockHandler({ metered: false }),
  );
  return state;
};

beforeEach(() => {
  useSettingsDialogStore.setState({ isOpen: true, section: 'archived' });
});

describe('ArchivedSessionsSetting', () => {
  it('lists the archived Sessions with Open and Restore', async () => {
    await holdSession({ isAnonymous: false });
    serveLists([], [aSession('s1', 'Old pricing notes', true)]);

    await renderRoute('/');

    expect(await screen.findByText('Old pricing notes')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `${archived.open} Old pricing notes` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `${archived.restore} Old pricing notes` }),
    ).toBeInTheDocument();
  });

  it('says so when nothing is archived', async () => {
    await holdSession({ isAnonymous: false });
    serveLists([], []);

    await renderRoute('/');

    expect(await screen.findByText(archived.empty)).toBeInTheDocument();
  });

  it('restores a Session back into the left panel list', async () => {
    await holdSession({ isAnonymous: false });
    const state = serveLists([], [aSession('s1', 'Old pricing notes', true)]);
    let restored = '';
    server.use(
      getRestoreSessionMockHandler(({ params }) => {
        restored = String(params.sessionId);
        state.archived = [];
        state.active = [aSession('s1', 'Old pricing notes', false)];
        return aSession('s1', 'Old pricing notes', false);
      }),
    );
    await renderRoute('/');

    await userEvent.click(
      await screen.findByRole('button', { name: `${archived.restore} Old pricing notes` }),
    );

    await waitFor(() => expect(restored).toBe('s1'));
    expect(await screen.findByText(archived.empty)).toBeInTheDocument();
  });

  it('opens the Session read-only in the chat and closes the dialog', async () => {
    await holdSession({ isAnonymous: false });
    serveLists([], [aSession('s1', 'Old pricing notes', true)]);

    const { router } = await renderRoute('/');
    await userEvent.click(
      await screen.findByRole('button', { name: `${archived.open} Old pricing notes` }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/s/s1'));
    expect(useSettingsDialogStore.getState().isOpen).toBe(false);
  });
});
