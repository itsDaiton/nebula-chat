import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getListUserSessionsMockHandler,
  getListUsersMockHandler,
} from '@/libs/api/generated/admin/admin.msw';
import type { AdminUserDetail } from '@/libs/api/generated/model/adminUserDetail';
import type { AdminUserSummary } from '@/libs/api/generated/model/adminUserSummary';
import { resources } from '@/resources';
import { useUserActionStore } from '@/modules/admin/stores/useUserActionStore';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { aSession, mockGetSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const text = resources.admin.users;
const actions = text.actions;

const USER_ID = '0190a1b2-0000-7000-8000-00000000000a';

const summary = (overrides: Partial<AdminUserSummary> = {}): AdminUserSummary => ({
  id: USER_ID,
  email: 'anna@example.com',
  name: 'Anna Nováková',
  status: 'registered',
  twoFactorEnabled: false,
  messagesSent: 1,
  sessionsCount: 1,
  createdAt: '2026-03-12T10:00:00Z',
  updatedAt: '2026-10-27T10:00:00Z',
  ...overrides,
});

const detailOf = (overrides: Partial<AdminUserDetail> = {}): AdminUserDetail => ({
  ...summary(),
  ban: null,
  pendingDeletionAt: null,
  ...overrides,
});

const serve = (detail: AdminUserDetail, admins: AdminUserSummary[] = []) => {
  const fetches = { detail: 0 };
  server.use(
    getListUsersMockHandler({ users: admins, nextCursor: null, hasMore: false }),
    http.get('*/api/admin/users/:id', () => {
      fetches.detail += 1;
      return HttpResponse.json(detail);
    }),
    getListUserSessionsMockHandler({ sessions: [], nextCursor: null, hasMore: false }),
  );
  return fetches;
};

const openPanel = async () => {
  await renderRoute(`/admin/users?selected=${USER_ID}`);
  const panel = await screen.findByRole('complementary', { name: resources.shell.inspector });
  await within(panel).findByText(actions.title);
  return panel;
};

const button = (panel: HTMLElement, name: string) =>
  within(panel).getByRole('button', { name: new RegExp(`^${name}`) });

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 900 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 40 });
});

afterAll(() => {
  // @ts-expect-error restores jsdom's own layout properties
  delete HTMLElement.prototype.clientHeight;
  // @ts-expect-error restores jsdom's own layout properties
  delete HTMLElement.prototype.clientWidth;
  // @ts-expect-error restores jsdom's own layout properties
  delete HTMLElement.prototype.offsetHeight;
});

beforeEach(() => {
  serveChatPage();
  server.use(
    mockGetSession(
      aSession({
        isAnonymous: false,
        emailVerified: true,
        role: 'admin',
        twoFactorEnabled: true,
        twoFactorVerified: true,
      }),
    ),
  );
  usePanelStore.setState({ leftOpen: true, rightOpen: true, sheetOpen: false });
  useUserActionStore.setState({ open: null });
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

describe('User actions', () => {
  it('grants Admin after a confirmation, refreshes the detail and toasts', async () => {
    const bodies: unknown[] = [];
    const fetches = serve(detailOf());
    server.use(
      http.post('*/api/admin/users/:id/role', async ({ request }) => {
        bodies.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const panel = await openPanel();

    await userEvent.click(button(panel, actions.grantAdmin));
    expect(bodies).toEqual([]);
    const dialog = await screen.findByRole('dialog', {
      name: actions.grantTitle('anna@example.com'),
    });
    await userEvent.click(within(dialog).getByRole('button', { name: actions.grantAdmin }));

    await waitFor(() => expect(bodies).toEqual([{ role: 'admin' }]));
    expect(await screen.findByText(actions.granted('anna@example.com'))).toBeInTheDocument();
    await waitFor(() => expect(fetches.detail).toBe(2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('revokes Admin from an Admin who is not the last', async () => {
    const bodies: unknown[] = [];
    serve(detailOf({ status: 'admin' }), [summary({ status: 'admin' }), summary({ id: 'b' })]);
    server.use(
      http.post('*/api/admin/users/:id/role', async ({ request }) => {
        bodies.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const panel = await openPanel();

    await userEvent.click(button(panel, actions.revokeAdmin));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: actions.revokeAdmin }),
    );

    await waitFor(() => expect(bodies).toEqual([{ role: 'user' }]));
    expect(await screen.findByText(actions.revoked('anna@example.com'))).toBeInTheDocument();
  });

  it('disables Grant Admin for a Guest, an unverified and a banned User, with the reason', async () => {
    serve(detailOf({ status: 'guest' }));
    const panel = await openPanel();
    const grant = button(panel, actions.grantAdmin);
    expect(grant).toHaveAttribute('aria-disabled', 'true');
    expect(grant).toHaveAccessibleName(`${actions.grantAdmin}. ${actions.reasons.guest}`);
    await userEvent.click(grant);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('tells the Admin to unban a banned User before granting Admin', async () => {
    serve(detailOf({ status: 'banned', ban: { reason: 'Spam', expiresAt: null } }));
    const panel = await openPanel();

    const grant = button(panel, actions.grantAdmin);
    expect(grant).toHaveAttribute('aria-disabled', 'true');
    await userEvent.hover(grant);
    expect(await screen.findByText('Unban this User before granting Admin')).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: actions.ban })).not.toBeInTheDocument();
  });

  it('disables Revoke Admin and Ban for the last Admin', async () => {
    serve(detailOf({ status: 'admin' }), [summary({ status: 'admin' })]);
    const panel = await openPanel();

    await waitFor(() =>
      expect(button(panel, actions.revokeAdmin)).toHaveAttribute('aria-disabled', 'true'),
    );
    expect(button(panel, actions.ban)).toHaveAttribute('aria-disabled', 'true');
    expect(button(panel, actions.ban)).toHaveAccessibleName(
      `${actions.ban}. ${actions.reasons.lastAdmin}`,
    );
  });

  it('shows the typed refusal and keeps the dialog open when the server says no', async () => {
    serve(detailOf({ status: 'admin' }), [summary({ status: 'admin' }), summary({ id: 'b' })]);
    server.use(
      http.post('*/api/admin/users/:id/role', () =>
        HttpResponse.json(
          {
            success: false,
            error: 'LastAdmin',
            message: 'The last Admin cannot be demoted or banned.',
          },
          { status: 409 },
        ),
      ),
    );
    const panel = await openPanel();

    await userEvent.click(button(panel, actions.revokeAdmin));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: actions.revokeAdmin }),
    );

    expect(
      await screen.findByText('The last Admin cannot be demoted or banned.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('bans permanently with a required reason', async () => {
    const bodies: unknown[] = [];
    serve(detailOf());
    server.use(
      http.post('*/api/admin/users/:id/ban', async ({ request }) => {
        bodies.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const panel = await openPanel();

    await userEvent.click(button(panel, actions.ban));
    const dialog = await screen.findByRole('dialog', { name: text.ban.title('anna@example.com') });
    await userEvent.click(within(dialog).getByRole('button', { name: text.ban.confirm }));
    expect(await within(dialog).findByText(text.ban.reasonRequired)).toBeInTheDocument();
    expect(bodies).toEqual([]);

    await userEvent.type(within(dialog).getByRole('textbox', { name: /Reason/ }), 'Spam');
    await userEvent.click(within(dialog).getByRole('button', { name: text.ban.confirm }));

    await waitFor(() => expect(bodies).toEqual([{ reason: 'Spam' }]));
    expect(await screen.findByText(actions.banned('anna@example.com'))).toBeInTheDocument();
  });

  it('bans until a future date and rejects a past one', async () => {
    const bodies: unknown[] = [];
    serve(detailOf());
    server.use(
      http.post('*/api/admin/users/:id/ban', async ({ request }) => {
        bodies.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const panel = await openPanel();

    await userEvent.click(button(panel, actions.ban));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Reason/ }), 'Spam');
    await userEvent.click(within(dialog).getByRole('radio', { name: text.ban.untilDate }));
    const date = within(dialog).getByLabelText(text.ban.date);

    await userEvent.type(date, '2020-01-01');
    await userEvent.click(within(dialog).getByRole('button', { name: text.ban.confirm }));
    expect(await within(dialog).findByText(text.ban.dateFuture)).toBeInTheDocument();
    expect(bodies).toEqual([]);

    await userEvent.clear(date);
    await userEvent.type(date, '2999-01-31');
    await userEvent.click(within(dialog).getByRole('button', { name: text.ban.confirm }));

    await waitFor(() =>
      expect(bodies).toEqual([{ reason: 'Spam', expiresAt: '2999-01-31T23:59:59.000Z' }]),
    );
  });

  it('unbans a banned User after a confirmation', async () => {
    let unbanned = 0;
    serve(detailOf({ status: 'banned', ban: { reason: 'Spam', expiresAt: null } }));
    server.use(
      http.post('*/api/admin/users/:id/unban', () => {
        unbanned += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const panel = await openPanel();

    await userEvent.click(button(panel, actions.unban));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: actions.unban }),
    );

    await waitFor(() => expect(unbanned).toBe(1));
    expect(await screen.findByText(actions.unbanned('anna@example.com'))).toBeInTheDocument();
  });

  it('restores a User in Pending deletion and disables Restore otherwise', async () => {
    let restored = 0;
    serve(detailOf({ pendingDeletionAt: '2026-10-25T12:00:00Z' }));
    server.use(
      http.post('*/api/admin/users/:id/restore', () => {
        restored += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const panel = await openPanel();

    await userEvent.click(button(panel, actions.restore));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: actions.restore }),
    );

    await waitFor(() => expect(restored).toBe(1));
    expect(await screen.findByText(actions.restored('anna@example.com'))).toBeInTheDocument();
  });

  it('disables Restore for a User who is not pending deletion', async () => {
    serve(detailOf());
    const panel = await openPanel();

    expect(button(panel, actions.restore)).toHaveAttribute('aria-disabled', 'true');
    expect(button(panel, actions.restore)).toHaveAccessibleName(
      `${actions.restore}. ${actions.reasons.notPending}`,
    );
  });
});
