import { writeFile } from 'node:fs/promises';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getGetUserUrl } from '@cli/api/generated/admin/admin';
import type { AdminUserDetail } from '@cli/api/generated/model/adminUserDetail';
import type { AdminUserSummary } from '@cli/api/generated/model/adminUserSummary';
import { createHarness, SERVER_URL } from '@cli/test/harness';
import { server } from '@cli/test/msw';

const TOKEN = 'session-token';
const ID = '3f0f6f0e-3c53-4c4e-9a64-0f4f3a9c9d11';
const EMAIL = 'dana@example.com';

const summary = (overrides: Partial<AdminUserSummary> = {}): AdminUserSummary => ({
  id: ID,
  email: EMAIL,
  name: 'Dana',
  status: 'registered',
  role: 'user',
  twoFactorEnabled: false,
  messagesSent: 12,
  sessionsCount: 3,
  createdAt: '2026-09-01T08:30:00.000Z',
  updatedAt: '2026-09-02T08:30:00.000Z',
  ...overrides,
});

const detail = (overrides: Partial<AdminUserDetail> = {}): AdminUserDetail => ({
  ...summary(),
  ban: null,
  pendingDeletionAt: null,
  ...overrides,
});

const envelope = (error: string, message: string) => ({ success: false, error, message });

const loggedIn = async () => {
  const cli = await createHarness();
  await cli.writeConfig({ defaultProfile: 'local', profiles: { local: { url: SERVER_URL } } });
  await writeFile(cli.credentialsFile, JSON.stringify({ [SERVER_URL]: TOKEN }));
  return cli;
};

const listAnswers = (status: number, body: unknown) => {
  const captured: { url: URL; authorization: string | null }[] = [];
  server.use(
    http.get(`${SERVER_URL}/api/admin/users`, ({ request }) => {
      captured.push({
        url: new URL(request.url),
        authorization: request.headers.get('authorization'),
      });
      return HttpResponse.json(body as never, { status });
    }),
  );
  return captured;
};

const showAnswers = (status: number, body: unknown) =>
  server.use(
    http.get(`${SERVER_URL}${getGetUserUrl(ID)}`, () =>
      HttpResponse.json(body as never, { status }),
    ),
  );

describe('nebula users list', () => {
  it('passes the filters as query params and prints a table with the next cursor', async () => {
    const cli = await loggedIn();
    const cursor = '11111111-1111-4111-8111-111111111111';
    const captured = listAnswers(200, { users: [summary()], nextCursor: cursor, hasMore: true });

    const code = await cli.run(
      'users',
      'list',
      '--search',
      'dan',
      '--status',
      'banned',
      'admin',
      '--sort',
      'messagesSent',
      '--limit',
      '5',
      '--cursor',
      cursor,
    );

    expect(code).toBe(0);
    const { url, authorization } = captured[0]!;
    expect(authorization).toBe(`Bearer ${TOKEN}`);
    expect(url.searchParams.get('search')).toBe('dan');
    expect(url.searchParams.getAll('status')).toEqual(['banned', 'admin']);
    expect(url.searchParams.get('sortBy')).toBe('messagesSent');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('cursor')).toBe(cursor);
    expect(cli.stdout()).toContain(EMAIL);
    expect(cli.stdout()).toContain('registered');
    expect(cli.stderr()).toContain(`--cursor ${cursor}`);
  });

  it('prints the page, cursor included, as one JSON document with --json', async () => {
    const cli = await loggedIn();
    const page = { users: [summary()], nextCursor: ID, hasMore: true };
    listAnswers(200, page);

    const code = await cli.run('--json', 'users', 'list');

    expect(code).toBe(0);
    expect(JSON.parse(cli.stdout())).toEqual(page);
  });

  it('says so when nothing matches', async () => {
    const cli = await loggedIn();
    listAnswers(200, { users: [], nextCursor: null, hasMore: false });

    await cli.run('users', 'list');

    expect(cli.stdout()).toBe('No Users match.\n');
    expect(cli.stderr()).toBe('');
  });

  it('exits 2 for a bad --limit or --status', async () => {
    const cli = await loggedIn();

    expect(await cli.run('users', 'list', '--limit', '0')).toBe(2);
    expect(await cli.run('users', 'list', '--status', 'nope')).toBe(2);
  });

  it('tells a logged-out user to run nebula login (exit 3)', async () => {
    const cli = await createHarness();
    await cli.writeConfig({ defaultProfile: 'local', profiles: { local: { url: SERVER_URL } } });

    expect(await cli.run('users', 'list')).toBe(3);
    expect(cli.stderr()).toContain('nebula login');
  });

  it('exits 3 and says to log in again when the server answers 401', async () => {
    const cli = await loggedIn();
    listAnswers(401, envelope('Unauthorized', 'Not signed in'));

    expect(await cli.run('users', 'list')).toBe(3);
    expect(cli.stderr()).toContain('nebula login');
  });

  it('explains TwoFactorRequired (exit 3)', async () => {
    const cli = await loggedIn();
    listAnswers(403, envelope('TwoFactorRequired', 'Two-factor authentication is required'));

    expect(await cli.run('users', 'list')).toBe(3);
    expect(cli.stderr()).toContain('two-factor');
  });

  it('tells a non-Admin from the unknown-route 404', async () => {
    const cli = await loggedIn();
    listAnswers(404, envelope('NotFound', 'Route GET:/api/admin/users not found'));

    expect(await cli.run('users', 'list')).toBe(3);
    expect(cli.stderr()).toContain('not an Admin');
  });

  it('exits 1 on a server error', async () => {
    const cli = await loggedIn();
    listAnswers(500, envelope('InternalServerError', 'boom'));

    expect(await cli.run('users', 'list')).toBe(1);
    expect(cli.stderr()).toContain('500');
  });
});

describe('nebula users show', () => {
  it('shows a User by id as key-value fields, ban included', async () => {
    const cli = await loggedIn();
    showAnswers(
      200,
      detail({
        status: 'banned',
        ban: { reason: 'spam', note: 'ticket 7', expiresAt: null },
        pendingDeletionAt: '2026-10-01T00:00:00.000Z',
      }),
    );

    const code = await cli.run('users', 'show', ID);

    expect(code).toBe(0);
    expect(cli.stdout()).toContain(EMAIL);
    expect(cli.stdout()).toContain('banned');
    expect(cli.stdout()).toMatch(/Ban reason:\s+spam/);
    expect(cli.stdout()).toMatch(/Ban note:\s+ticket 7/);
    expect(cli.stdout()).toMatch(/Ban expires:\s+never/);
    expect(cli.stdout()).toContain('Deletion pending since');
  });

  it('prints the detail as JSON with --json', async () => {
    const cli = await loggedIn();
    showAnswers(200, detail());

    await cli.run('--json', 'users', 'show', ID);

    expect(JSON.parse(cli.stdout())).toEqual(detail());
  });

  it('resolves an email through the list search, then reads the detail', async () => {
    const cli = await loggedIn();
    const captured = listAnswers(200, {
      users: [summary({ id: 'other', email: 'dana@example.com.au' }), summary()],
      nextCursor: null,
      hasMore: false,
    });
    showAnswers(200, detail());

    const code = await cli.run('users', 'show', 'Dana@Example.com');

    expect(code).toBe(0);
    expect(captured[0]!.url.searchParams.get('search')).toBe('Dana@Example.com');
    expect(captured[0]!.url.searchParams.getAll('status')).toContain('guest');
    expect(cli.stdout()).toContain(ID);
  });

  it('follows the next cursor until it finds the email', async () => {
    const cli = await loggedIn();
    const cursor = '11111111-1111-4111-8111-111111111111';
    const pages: (string | null)[] = [];
    server.use(
      http.get(`${SERVER_URL}/api/admin/users`, ({ request }) => {
        const asked = new URL(request.url).searchParams.get('cursor');
        pages.push(asked);
        return HttpResponse.json(
          asked === null
            ? {
                users: [summary({ id: 'other', email: 'x@example.com' })],
                nextCursor: cursor,
                hasMore: true,
              }
            : { users: [summary()], nextCursor: null, hasMore: false },
        );
      }),
    );
    showAnswers(200, detail());

    expect(await cli.run('users', 'show', EMAIL)).toBe(0);
    expect(pages).toEqual([null, cursor]);
  });

  it('exits 2 when the server rejects the id with a 400', async () => {
    const cli = await loggedIn();
    showAnswers(400, envelope('ValidationError', 'Invalid id'));

    expect(await cli.run('users', 'show', ID)).toBe(2);
  });

  it('exits 1 with a message for an unknown email', async () => {
    const cli = await loggedIn();
    listAnswers(200, { users: [], nextCursor: null, hasMore: false });

    expect(await cli.run('users', 'show', 'ghost@example.com')).toBe(1);
    expect(cli.stderr()).toContain('ghost@example.com');
  });

  it('exits 1 with the server message for an unknown id', async () => {
    const cli = await loggedIn();
    showAnswers(404, envelope('NotFound', 'User not found'));

    expect(await cli.run('users', 'show', ID)).toBe(1);
    expect(cli.stderr()).toContain('User not found');
  });

  it('exits 3 when logged out, and for TwoFactorRequired', async () => {
    const out = await createHarness();
    await out.writeConfig({ defaultProfile: 'local', profiles: { local: { url: SERVER_URL } } });
    expect(await out.run('users', 'show', ID)).toBe(3);

    const cli = await loggedIn();
    showAnswers(403, envelope('TwoFactorRequired', 'nope'));
    expect(await cli.run('users', 'show', ID)).toBe(3);
    expect(cli.stderr()).toContain('two-factor');
  });
});
