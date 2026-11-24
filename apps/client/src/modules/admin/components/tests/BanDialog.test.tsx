import { addMonths, format } from 'date-fns';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { resources } from '@/resources';
import { button, detailOf, openPanel, serve, setUpAdminActionsTests } from '@/test/adminActions';
import { server } from '@/test/msw';

const text = resources.admin.users;
const actions = text.actions;

setUpAdminActionsTests();

describe('Ban dialog', () => {
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

  it('sends the internal note beside the reason, each labelled for who sees it', async () => {
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
    expect(within(dialog).getByText(text.ban.reasonHint)).toBeInTheDocument();
    expect(within(dialog).getByText(text.ban.noteHint)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Reason/ }), 'Spam');
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: /Internal note/ }),
      'Ticket 7',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: text.ban.confirm }));

    await waitFor(() => expect(bodies).toEqual([{ reason: 'Spam', note: 'Ticket 7' }]));
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
    await userEvent.click(within(dialog).getByRole('button', { name: text.ban.untilDate }));

    await userEvent.click(within(dialog).getByRole('button', { name: text.ban.confirm }));
    expect(await within(dialog).findByText(text.ban.dateRequired)).toBeInTheDocument();
    expect(bodies).toEqual([]);

    await userEvent.click(within(dialog).getByRole('button', { name: text.ban.date }));
    await userEvent.click(await screen.findByRole('button', { name: /next month/i }));
    const next = addMonths(new Date(), 1);
    const day = await screen.findByRole('button', {
      name: new RegExp(`${format(next, 'MMMM')} 15(st|nd|rd|th), ${format(next, 'yyyy')}`),
    });
    await userEvent.click(day);
    await userEvent.click(within(dialog).getByRole('button', { name: text.ban.confirm }));

    await waitFor(() =>
      expect(bodies).toEqual([
        { reason: 'Spam', expiresAt: `${format(next, 'yyyy-MM')}-15T23:59:59.000Z` },
      ]),
    );
  });

  it('shows the confirm button busy while the ban is pending', async () => {
    serve(detailOf());
    server.use(
      http.post('*/api/admin/users/:id/ban', () => new Promise<Response>(() => undefined)),
    );
    const panel = await openPanel();

    await userEvent.click(button(panel, actions.ban));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Reason/ }), 'Spam');
    await userEvent.click(within(dialog).getByRole('button', { name: text.ban.confirm }));

    const pending = await within(dialog).findByRole('button', { name: text.ban.confirming });
    expect(pending).toHaveAttribute('aria-busy', 'true');
    expect(pending).toBeDisabled();
  });
});
