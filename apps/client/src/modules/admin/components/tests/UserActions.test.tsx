import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { resources } from '@/resources';
import {
  button,
  detailOf,
  openPanel,
  serve,
  summary,
  setUpAdminActionsTests,
} from '@/test/adminActions';
import { server } from '@/test/msw';

const text = resources.admin.users;
const actions = text.actions;

setUpAdminActionsTests();

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
    serve(detailOf({ status: 'admin', role: 'admin' }), [
      summary({ status: 'admin', role: 'admin' }),
      summary({ id: 'b' }),
    ]);
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
    serve(detailOf({ status: 'admin', role: 'admin' }), [
      summary({ status: 'admin', role: 'admin' }),
    ]);
    const panel = await openPanel();

    await waitFor(() =>
      expect(button(panel, actions.revokeAdmin)).toHaveAttribute('aria-disabled', 'true'),
    );
    expect(button(panel, actions.ban)).toHaveAttribute('aria-disabled', 'true');
    expect(button(panel, actions.ban)).toHaveAccessibleName(
      `${actions.ban}. ${actions.reasons.lastAdmin}`,
    );
  });

  it('offers Revoke Admin to a banned Admin, disabled only when no other Admin is active', async () => {
    const banned = detailOf({
      status: 'banned',
      role: 'admin',
      ban: { reason: 'Spam', expiresAt: null },
    });
    serve(banned, [summary({ id: 'b', role: 'admin', status: 'admin' })]);
    const panel = await openPanel();

    expect(button(panel, actions.revokeAdmin)).not.toHaveAttribute('aria-disabled', 'true');
    expect(
      within(panel).queryByRole('button', { name: actions.grantAdmin }),
    ).not.toBeInTheDocument();
  });

  it('disables Revoke Admin for a banned Admin who is the last active one', async () => {
    serve(
      detailOf({ status: 'banned', role: 'admin', ban: { reason: 'Spam', expiresAt: null } }),
      [],
    );
    const panel = await openPanel();

    await waitFor(() =>
      expect(button(panel, actions.revokeAdmin)).toHaveAttribute('aria-disabled', 'true'),
    );
    expect(button(panel, actions.revokeAdmin)).toHaveAccessibleName(
      `${actions.revokeAdmin}. ${actions.reasons.lastAdmin}`,
    );
  });

  it('offers Revoke Admin, not Grant, to a Pending-deletion Admin', async () => {
    const pending = detailOf({
      status: 'pendingDeletion',
      role: 'admin',
      pendingDeletionAt: '2026-10-25T12:00:00Z',
    });
    serve(pending, [summary({ id: 'b', role: 'admin', status: 'admin' })]);
    const panel = await openPanel();

    expect(button(panel, actions.revokeAdmin)).not.toHaveAttribute('aria-disabled', 'true');
    expect(
      within(panel).queryByRole('button', { name: actions.grantAdmin }),
    ).not.toBeInTheDocument();
  });

  it('disables Revoke Admin and Ban for a Pending-deletion Admin who is the last one', async () => {
    serve(
      detailOf({
        status: 'pendingDeletion',
        role: 'admin',
        pendingDeletionAt: '2026-10-25T12:00:00Z',
      }),
      [],
    );
    const panel = await openPanel();

    await waitFor(() =>
      expect(button(panel, actions.revokeAdmin)).toHaveAttribute('aria-disabled', 'true'),
    );
    expect(button(panel, actions.ban)).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows the typed refusal and keeps the dialog open when the server says no', async () => {
    serve(detailOf({ status: 'admin', role: 'admin' }), [
      summary({ status: 'admin', role: 'admin' }),
      summary({ id: 'b' }),
    ]);
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
