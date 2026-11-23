import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { resources } from '@/resources';
import { holdSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const copy = resources.settings.ownKeys;
const OWN_KEYS = '*/api/own-keys';

type Stored = { provider: string; lastFour: string; status: string; updatedAt: string };
const stored = (provider: string, status: string): Stored => ({
  provider,
  lastFour: '1234',
  status,
  updatedAt: '2026-11-23T10:00:00.000Z',
});

const serveKeys = (keys: Stored[], enabled = true) =>
  server.use(http.get(OWN_KEYS, () => HttpResponse.json({ enabled, keys })));

const open = async () => {
  useSettingsDialogStore.setState({ isOpen: true, section: 'keys' });
  return renderRoute('/');
};

describe('API keys settings', () => {
  beforeEach(async () => {
    await holdSession({ isAnonymous: false, emailVerified: true });
  });

  it('offers a write-only input for a provider with no key', async () => {
    serveKeys([]);
    await open();

    const input = await screen.findByLabelText(copy.inputLabel('OpenAI'));
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getAllByText(copy.none)).toHaveLength(2);
  });

  it('shows only the last four characters and the checking status of a stored key', async () => {
    serveKeys([stored('openai', 'pending')]);
    await open();

    expect(await screen.findByText(copy.stored('1234'))).toBeInTheDocument();
    expect(screen.getByText(copy.status.pending)).toBeInTheDocument();
    expect(screen.queryByLabelText(copy.inputLabel('OpenAI'))).not.toBeInTheDocument();
  });

  it('tells the user an invalid key was rejected', async () => {
    serveKeys([stored('anthropic', 'invalid')]);
    await open();

    expect(await screen.findByText(copy.status.invalid)).toBeInTheDocument();
    expect(screen.getByText(copy.invalidHint)).toBeInTheDocument();
  });

  it('sends the key typed and clears the field once saved', async () => {
    let body: unknown;
    serveKeys([]);
    server.use(
      http.put('*/api/own-keys/openai', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(stored('openai', 'pending'));
      }),
    );
    await open();

    const input = await screen.findByLabelText(copy.inputLabel('OpenAI'));
    await userEvent.type(input, 'sk-proj-secret-0000');
    await userEvent.click(screen.getAllByRole('button', { name: copy.save })[0]!);

    await waitFor(() => expect(body).toEqual({ key: 'sk-proj-secret-0000' }));
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('removes a stored key', async () => {
    let removed = false;
    serveKeys([stored('openai', 'valid')]);
    server.use(
      http.delete('*/api/own-keys/openai', () => {
        removed = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await open();

    await userEvent.click(await screen.findByRole('button', { name: copy.remove }));

    await waitFor(() => expect(removed).toBe(true));
  });

  it('shows the rate-limit message when saving is refused', async () => {
    serveKeys([]);
    server.use(
      http.put('*/api/own-keys/openai', () =>
        HttpResponse.json(
          { success: false, error: 'TooManyRequests', message: 'slow' },
          { status: 429 },
        ),
      ),
    );
    await open();

    await userEvent.type(await screen.findByLabelText(copy.inputLabel('OpenAI')), 'sk-12345678');
    await userEvent.click(screen.getAllByRole('button', { name: copy.save })[0]!);

    expect(await screen.findByText(copy.errors.rateLimited)).toBeInTheDocument();
  });
});

describe('API keys settings for an unverified user', () => {
  it('asks them to verify instead of listing keys', async () => {
    await holdSession({ isAnonymous: false, emailVerified: false });
    await open();

    expect(await screen.findByText(copy.unverified)).toBeInTheDocument();
    expect(screen.queryByLabelText(copy.inputLabel('OpenAI'))).not.toBeInTheDocument();
  });
});
