import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getListAuditEntriesMockHandler } from '@/libs/api/generated/admin/admin.msw';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { resources } from '@/resources';
import { aSession, mockGetSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const admin = { isAnonymous: false, emailVerified: true, role: 'admin' } as const;

beforeEach(() => {
  serveChatPage();
  server.use(getListAuditEntriesMockHandler({ entries: [], nextCursor: null, hasMore: false }));
  useSettingsDialogStore.setState({ isOpen: false, section: 'profile' });
});

const visit = (path: string) => renderRoute(path, { seedSession: false });

describe('admin guard', () => {
  it('admits an Admin whose session passed 2FA, sending /admin to the Audit log', async () => {
    server.use(
      mockGetSession(aSession({ ...admin, twoFactorEnabled: true, twoFactorVerified: true })),
    );

    const { router } = await visit('/admin');

    expect(
      await screen.findByRole('heading', { name: resources.admin.audit.title }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/audit');
  });

  it('sends an Admin without 2FA home with Settings open on Security', async () => {
    server.use(mockGetSession(aSession({ ...admin, twoFactorEnabled: false })));

    const { router } = await visit('/admin/audit');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(useSettingsDialogStore.getState()).toMatchObject({ isOpen: true, section: 'security' });
  });

  it('sends an Admin whose session never passed 2FA home too', async () => {
    server.use(
      mockGetSession(aSession({ ...admin, twoFactorEnabled: true, twoFactorVerified: false })),
    );

    const { router } = await visit('/admin/audit');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(useSettingsDialogStore.getState().section).toBe('security');
  });

  it.each([
    ['a Registered user', aSession({ isAnonymous: false, emailVerified: true })],
    ['a Guest', aSession()],
  ])('shows %s the not-found page', async (_who, session) => {
    server.use(mockGetSession(session));

    await visit('/admin/audit');

    expect(await screen.findByText(resources.notFound.title)).toBeInTheDocument();
    expect(useSettingsDialogStore.getState().isOpen).toBe(false);
  });
});
