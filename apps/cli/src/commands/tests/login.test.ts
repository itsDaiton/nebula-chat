import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { createHarness, SERVER_URL } from '@cli/test/harness';
import { server } from '@cli/test/msw';

const PROFILE = { defaultProfile: 'local', profiles: { local: { url: SERVER_URL } } };
const TOKEN = 'auth-session-token';
const ADMIN = { email: 'dana@example.com', name: 'Dana', role: 'admin' };

const DEVICE_CODE = {
  device_code: 'device-code-1',
  user_code: 'WDJBMJHT',
  verification_uri: 'http://client.test/device',
  verification_uri_complete: 'http://client.test/device?user_code=WDJBMJHT',
  expires_in: 600,
  interval: 5,
};

const pending = { error: 'authorization_pending', error_description: 'Authorization pending' };
const approved = { access_token: TOKEN, token_type: 'Bearer', expires_in: 604800, scope: '' };

type Poll = { status: number; body: unknown };

/** Scripts the device flow: one device code, then each poll answers with the next entry (the last one repeats). */
const scriptDeviceFlow = (polls: Poll[], code = DEVICE_CODE) => {
  const requests: { code: unknown[]; token: unknown[] } = { code: [], token: [] };
  server.use(
    http.post(`${SERVER_URL}/api/auth/device/code`, async ({ request }) => {
      requests.code.push(await request.json());
      return HttpResponse.json(code);
    }),
    http.post(`${SERVER_URL}/api/auth/device/token`, async ({ request }) => {
      requests.token.push(await request.json());
      const poll = polls[Math.min(requests.token.length, polls.length) - 1];
      return HttpResponse.json(poll?.body as object, { status: poll?.status ?? 500 });
    }),
  );
  return requests;
};

/** The server's session lookup: knows only the one token, as a bearer token. */
const serveAuthSession = (user: object | null = ADMIN) => {
  const seen: (string | null)[] = [];
  server.use(
    http.get(`${SERVER_URL}/api/auth/get-session`, ({ request }) => {
      const authorization = request.headers.get('authorization');
      seen.push(authorization);
      return HttpResponse.json(
        authorization === `Bearer ${TOKEN}` && user ? { user, session: {} } : null,
      );
    }),
  );
  return seen;
};

const loggedInHarness = async (options: Parameters<typeof createHarness>[0] = {}) => {
  const cli = await createHarness(options);
  await cli.writeConfig(PROFILE);
  cli.secrets.set(SERVER_URL, TOKEN);
  return cli;
};

describe('nebula login', () => {
  it('prints the code and URL, opens the browser, polls and stores the token in the keychain', async () => {
    const cli = await createHarness();
    await cli.writeConfig(PROFILE);
    const requests = scriptDeviceFlow([
      { status: 400, body: pending },
      { status: 200, body: approved },
    ]);
    serveAuthSession();

    const code = await cli.run('login');

    expect(code).toBe(0);
    expect(cli.stderr()).toContain('Your one-time code: WDJB-MJHT');
    expect(cli.stderr()).toContain(
      'Approve it as an Admin at: http://client.test/device?user_code=WDJBMJHT',
    );
    expect(cli.opened).toEqual(['http://client.test/device?user_code=WDJBMJHT']);
    expect(requests.code).toEqual([{ client_id: 'nebula-cli' }]);
    expect(requests.token).toEqual([
      {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: 'device-code-1',
        client_id: 'nebula-cli',
      },
      expect.anything(),
    ]);
    expect(cli.secrets.get(SERVER_URL)).toBe(TOKEN);
    expect(cli.stdout()).toContain(
      "Logged in to 'local' as dana@example.com (Admin). The token is stored in the OS keychain.",
    );
  });

  it("polls at the server's interval and slows down by 5 seconds when told to", async () => {
    const cli = await createHarness();
    await cli.writeConfig(PROFILE);
    scriptDeviceFlow([
      { status: 400, body: pending },
      { status: 400, body: { error: 'slow_down', error_description: 'Polling too frequently' } },
      { status: 400, body: pending },
      { status: 200, body: approved },
    ]);
    serveAuthSession();

    const code = await cli.run('login');

    expect(code).toBe(0);
    expect(cli.slept).toEqual([5000, 5000, 10_000, 10_000]);
  });

  it('exits 3 when the sign-in is denied, storing nothing', async () => {
    const cli = await createHarness();
    await cli.writeConfig(PROFILE);
    scriptDeviceFlow([
      { status: 400, body: { error: 'access_denied', error_description: 'Access denied' } },
    ]);

    const code = await cli.run('login');

    expect(code).toBe(3);
    expect(cli.stderr()).toContain('error: The sign-in was denied in the browser.');
    expect(cli.secrets.size).toBe(0);
  });

  it('exits 3 when the server says the code expired', async () => {
    const cli = await createHarness();
    await cli.writeConfig(PROFILE);
    scriptDeviceFlow([
      { status: 400, body: { error: 'expired_token', error_description: 'Device code expired' } },
    ]);

    const code = await cli.run('login');

    expect(code).toBe(3);
    expect(cli.stderr()).toContain('error: The code expired before it was approved.');
  });

  it('stops polling once the code has outlived its expiry', async () => {
    const cli = await createHarness();
    await cli.writeConfig(PROFILE);
    const requests = scriptDeviceFlow([{ status: 400, body: pending }], {
      ...DEVICE_CODE,
      expires_in: 12,
    });

    const code = await cli.run('login');

    expect(code).toBe(3);
    expect(requests.token).toHaveLength(2);
    expect(cli.stderr()).toContain('error: The code expired before it was approved.');
  });

  it('stores the token in a 0600 file when there is no keychain', async () => {
    const cli = await createHarness({ keychain: false });
    await cli.writeConfig(PROFILE);
    scriptDeviceFlow([{ status: 200, body: approved }]);
    serveAuthSession();

    const code = await cli.run('login');

    expect(code).toBe(0);
    expect(JSON.parse(await readFile(cli.credentialsFile, 'utf8'))).toEqual({
      [SERVER_URL]: TOKEN,
    });
    expect((await stat(cli.credentialsFile)).mode & 0o777).toBe(0o600);
    expect(cli.stdout()).toContain('credentials.json (no keychain available)');
  });

  it('drops an older file token once the keychain holds the new one', async () => {
    const cli = await createHarness();
    await cli.writeConfig(PROFILE);
    await writeFile(
      cli.credentialsFile,
      JSON.stringify({ [SERVER_URL]: 'old-token', 'http://other.test': 'kept' }),
    );
    scriptDeviceFlow([{ status: 200, body: approved }]);
    serveAuthSession();

    await cli.run('login');

    expect(JSON.parse(await readFile(cli.credentialsFile, 'utf8'))).toEqual({
      'http://other.test': 'kept',
    });
  });

  it('carries on when no browser can be opened', async () => {
    const cli = await createHarness({ browser: false });
    await cli.writeConfig(PROFILE);
    scriptDeviceFlow([{ status: 200, body: approved }]);
    serveAuthSession();

    const code = await cli.run('login');

    expect(code).toBe(0);
    expect(cli.stderr()).toContain('Could not open a browser; open the URL yourself.');
  });

  it('opens no browser with --no-browser', async () => {
    const cli = await createHarness();
    await cli.writeConfig(PROFILE);
    scriptDeviceFlow([{ status: 200, body: approved }]);
    serveAuthSession();

    await cli.run('login', '--no-browser');

    expect(cli.opened).toEqual([]);
  });

  it('prints one JSON document with --json, keeping the instructions on stderr', async () => {
    const cli = await createHarness();
    await cli.writeConfig(PROFILE);
    scriptDeviceFlow([{ status: 200, body: approved }]);
    serveAuthSession();

    await cli.run('--json', 'login');

    expect(JSON.parse(cli.stdout())).toEqual({
      profile: 'local',
      url: SERVER_URL,
      user: ADMIN,
      storage: 'keychain',
    });
  });

  it('exits 1 with the server status when no device code is issued', async () => {
    const cli = await createHarness();
    await cli.writeConfig(PROFILE);
    server.use(
      http.post(`${SERVER_URL}/api/auth/device/code`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );

    const code = await cli.run('login');

    expect(code).toBe(1);
    expect(cli.stderr()).toContain('error: The server answered 500: boom');
  });

  it('exits 1 when a poll fails for a reason the flow does not name', async () => {
    const cli = await createHarness();
    await cli.writeConfig(PROFILE);
    scriptDeviceFlow([{ status: 500, body: { message: 'boom' } }]);

    expect(await cli.run('login')).toBe(1);
  });

  it('exits 2 without a profile', async () => {
    const cli = await createHarness();

    expect(await cli.run('login')).toBe(2);
  });
});

describe('nebula whoami', () => {
  it('shows the User, role and profile, sending the stored token as a bearer token', async () => {
    const cli = await loggedInHarness();
    const seen = serveAuthSession();

    const code = await cli.run('whoami');

    expect(code).toBe(0);
    expect(seen).toEqual([`Bearer ${TOKEN}`]);
    expect(cli.stdout()).toContain('User:     Dana <dana@example.com>');
    expect(cli.stdout()).toContain('Role:     Admin');
    expect(cli.stdout()).toContain(`Profile:  local (${SERVER_URL})`);
  });

  it('reads the token from the file when there is no keychain', async () => {
    const cli = await createHarness({ keychain: false });
    await cli.writeConfig(PROFILE);
    await mkdir(dirname(cli.credentialsFile), { recursive: true });
    await writeFile(cli.credentialsFile, JSON.stringify({ [SERVER_URL]: TOKEN }));
    serveAuthSession();

    expect(await cli.run('whoami')).toBe(0);
  });

  it('prints the same as JSON with --json', async () => {
    const cli = await loggedInHarness();
    serveAuthSession();

    await cli.run('--json', 'whoami');

    expect(JSON.parse(cli.stdout())).toEqual({ profile: 'local', url: SERVER_URL, user: ADMIN });
  });

  it('labels someone who is no longer an Admin as a User', async () => {
    const cli = await loggedInHarness();
    serveAuthSession({ ...ADMIN, role: 'user' });

    await cli.run('whoami');

    expect(cli.stdout()).toContain('Role:     User');
  });

  it('exits 3 and says to log in again when the token has expired or was revoked', async () => {
    const cli = await loggedInHarness();
    serveAuthSession(null);

    const code = await cli.run('whoami');

    expect(code).toBe(3);
    expect(cli.stderr()).toContain(
      "error: The login for profile 'local' has expired or was revoked. Run `nebula login` again.",
    );
  });

  it('exits 3 when nobody has logged in', async () => {
    const cli = await createHarness();
    await cli.writeConfig(PROFILE);

    const code = await cli.run('whoami');

    expect(code).toBe(3);
    expect(cli.stderr()).toContain("error: Not logged in to profile 'local'. Run `nebula login`.");
  });

  it('exits 1 on a server error', async () => {
    const cli = await loggedInHarness();
    server.use(
      http.get(`${SERVER_URL}/api/auth/get-session`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );

    expect(await cli.run('whoami')).toBe(1);
  });

  it('exits 1 on a credentials file that is not valid', async () => {
    const cli = await createHarness({ keychain: false });
    await cli.writeConfig(PROFILE);
    await writeFile(cli.credentialsFile, 'not json');

    const code = await cli.run('whoami');

    expect(code).toBe(1);
    expect(cli.stderr()).toContain('is not a valid credentials file');
  });
});

describe('nebula logout', () => {
  const serveSignOut = (status = 200) => {
    const seen: (string | null)[] = [];
    server.use(
      http.post(`${SERVER_URL}/api/auth/sign-out`, ({ request }) => {
        seen.push(request.headers.get('authorization'));
        return HttpResponse.json(status === 200 ? { success: true } : { message: 'boom' }, {
          status,
        });
      }),
    );
    return seen;
  };

  it('ends the auth session on the server and deletes the stored token', async () => {
    const cli = await loggedInHarness();
    const seen = serveSignOut();

    const code = await cli.run('logout');

    expect(code).toBe(0);
    expect(seen).toEqual([`Bearer ${TOKEN}`]);
    expect(cli.secrets.size).toBe(0);
    expect(cli.stdout()).toContain("Logged out of profile 'local'.");
  });

  it('deletes a token kept in the file', async () => {
    const cli = await createHarness({ keychain: false });
    await cli.writeConfig(PROFILE);
    await writeFile(cli.credentialsFile, JSON.stringify({ [SERVER_URL]: TOKEN }));
    serveSignOut();

    await cli.run('logout');

    expect(JSON.parse(await readFile(cli.credentialsFile, 'utf8'))).toEqual({});
  });

  it('counts an auth session that is already gone as logged out', async () => {
    const cli = await loggedInHarness();
    serveSignOut(401);

    expect(await cli.run('logout')).toBe(0);
    expect(cli.secrets.size).toBe(0);
  });

  it('still deletes the token when the server fails, and exits 1', async () => {
    const cli = await loggedInHarness();
    serveSignOut(500);

    const code = await cli.run('logout');

    expect(code).toBe(1);
    expect(cli.secrets.size).toBe(0);
  });

  it('says so when nobody is logged in', async () => {
    const cli = await createHarness();
    await cli.writeConfig(PROFILE);

    const code = await cli.run('--json', 'logout');

    expect(code).toBe(0);
    expect(JSON.parse(cli.stdout())).toEqual({ profile: 'local', loggedOut: false });
  });
});
