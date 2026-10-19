import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { getChangeLogLevelUrl } from '@cli/api/generated/operator/operator';
import { createHarness, SERVER_URL } from '@cli/test/harness';
import { server } from '@cli/test/msw';

const TOKEN = 'operator-secret';
const PROD_URL = 'https://prod.nebula.test';
const EXPIRES_AT = '2026-10-19T12:10:00.000Z';

type Captured = { authorization: string | null; body: unknown };

const acceptChange = (baseUrl = SERVER_URL, receivers = 2) => {
  const captured: Captured[] = [];
  server.use(
    http.post(`${baseUrl}${getChangeLogLevelUrl()}`, async ({ request }) => {
      captured.push({
        authorization: request.headers.get('authorization'),
        body: await request.json(),
      });
      return HttpResponse.json({ receivers, expiresAt: EXPIRES_AT }, { status: 202 });
    }),
  );
  return captured;
};

const answerWith = (status: number, body: JsonBodyType) =>
  server.use(
    http.post(`${SERVER_URL}${getChangeLogLevelUrl()}`, () => HttpResponse.json(body, { status })),
  );

const envelope = (error: string, message: string) => ({ success: false, error, message });

const operatorCli = (env: Record<string, string | undefined> = {}) =>
  createHarness({ env: { NEBULA_OPERATOR_TOKEN: TOKEN, USER: 'dana', ...env } });

const withProfiles = async (cli: Awaited<ReturnType<typeof createHarness>>) => {
  await cli.writeConfig({
    defaultProfile: 'local',
    profiles: { local: { url: SERVER_URL }, prod: { url: PROD_URL } },
  });
  return cli;
};

describe('nebula log-level set', () => {
  let cli: Awaited<ReturnType<typeof createHarness>>;

  beforeEach(async () => {
    cli = await withProfiles(await operatorCli());
  });

  it("changes a component's level with the operator token and prints the result", async () => {
    const captured = acceptChange();

    const code = await cli.run('log-level', 'set', 'redis', 'debug', '--ttl', '600');

    expect(code).toBe(0);
    expect(captured).toEqual([
      {
        authorization: `Bearer ${TOKEN}`,
        body: { component: 'redis', level: 'debug', ttlSeconds: 600, operator: 'dana' },
      },
    ]);
    expect(cli.stdout()).toBe(
      [
        'Target:      redis',
        'Level:       debug',
        `Expires at:  ${EXPIRES_AT} (in 10m)`,
        'Receivers:   2',
        '',
      ].join('\n'),
    );
    expect(cli.stderr()).toBe('');
  });

  it('changes the root level for the component `root`, leaving the TTL to the server', async () => {
    const captured = acceptChange();

    const code = await cli.run('log-level', 'set', 'root', 'warn');

    expect(code).toBe(0);
    expect(captured[0]?.body).toEqual({ level: 'warn', operator: 'dana' });
    expect(cli.stdout()).toContain('Target:      root');
  });

  it('prints exactly one JSON document with --json', async () => {
    acceptChange();

    await cli.run('log-level', 'set', 'http', 'trace', '--json');

    expect(JSON.parse(cli.stdout())).toEqual({
      target: 'http',
      level: 'trace',
      receivers: 2,
      expiresAt: EXPIRES_AT,
    });
  });

  it('calls the server of the profile named by --profile', async () => {
    const captured = acceptChange(PROD_URL);

    const code = await cli.run('--profile', 'prod', 'log-level', 'set', 'chat', 'info');

    expect(code).toBe(0);
    expect(captured).toHaveLength(1);
  });

  it('records the --operator name over $USER', async () => {
    const captured = acceptChange();

    await cli.run('log-level', 'set', 'llm', 'debug', '--operator', 'on-call');

    expect(captured[0]?.body).toMatchObject({ operator: 'on-call' });
  });

  it('records $NEBULA_OPERATOR over $USER', async () => {
    cli = await withProfiles(await operatorCli({ NEBULA_OPERATOR: 'ops-bot' }));
    const captured = acceptChange();

    await cli.run('log-level', 'set', 'llm', 'debug');

    expect(captured[0]?.body).toMatchObject({ operator: 'ops-bot' });
  });

  it('exits 2 when there is no name to record as the operator', async () => {
    cli = await withProfiles(await operatorCli({ USER: undefined }));

    const code = await cli.run('log-level', 'set', 'llm', 'debug');

    expect(code).toBe(2);
    expect(cli.stderr()).toContain('--operator');
  });

  it('warns on stderr when no server instance received the change', async () => {
    acceptChange(SERVER_URL, 0);

    const code = await cli.run('log-level', 'set', 'redis', 'debug');

    expect(code).toBe(0);
    expect(cli.stderr()).toContain('No server instance received the change');
  });

  it('never writes the operator token to disk', async () => {
    acceptChange();

    await cli.run('log-level', 'set', 'redis', 'debug');

    const files = await readdir(cli.home, { recursive: true, withFileTypes: true });
    const contents = await Promise.all(
      files
        .filter((entry) => entry.isFile())
        .map((entry) => readFile(join(entry.parentPath, entry.name), 'utf8')),
    );
    expect(contents.length).toBeGreaterThan(0);
    expect(contents.join('\n')).not.toContain(TOKEN);
  });

  describe('auth failures exit 3 with a message on stderr', () => {
    it('when NEBULA_OPERATOR_TOKEN is not set, without calling the server', async () => {
      cli = await withProfiles(await operatorCli({ NEBULA_OPERATOR_TOKEN: undefined }));

      const code = await cli.run('log-level', 'set', 'redis', 'debug');

      expect(code).toBe(3);
      expect(cli.stderr()).toContain('NEBULA_OPERATOR_TOKEN is not set');
      expect(cli.stdout()).toBe('');
    });

    it('when NEBULA_OPERATOR_TOKEN is not set and no profile has been added either', async () => {
      cli = await operatorCli({ NEBULA_OPERATOR_TOKEN: undefined });

      const code = await cli.run('log-level', 'set', 'redis', 'debug');

      expect(code).toBe(3);
      expect(cli.stderr()).toContain('NEBULA_OPERATOR_TOKEN is not set');
    });

    it('when the server rejects the token (403)', async () => {
      answerWith(403, envelope('Forbidden', 'This action requires the operator token.'));

      const code = await cli.run('log-level', 'set', 'redis', 'debug');

      expect(code).toBe(3);
      expect(cli.stderr()).toContain(`${SERVER_URL} rejected NEBULA_OPERATOR_TOKEN`);
      expect(cli.stdout()).toBe('');
    });

    it('when the server has no operator token configured (404)', async () => {
      answerWith(404, envelope('NotFound', 'Route POST:/api/internal/log-level not found'));

      const code = await cli.run('log-level', 'set', 'redis', 'debug');

      expect(code).toBe(3);
      expect(cli.stderr()).toContain(`${SERVER_URL} has no operator token configured`);
    });
  });

  it('exits 1 with the server message on a server error', async () => {
    answerWith(500, envelope('Internal', 'Redis is down'));

    const code = await cli.run('log-level', 'set', 'redis', 'debug');

    expect(code).toBe(1);
    expect(cli.stderr()).toContain('500');
    expect(cli.stderr()).toContain('Redis is down');
  });

  it('exits 1 when the server sends something other than the error envelope', async () => {
    server.use(
      http.post(
        `${SERVER_URL}${getChangeLogLevelUrl()}`,
        () => new HttpResponse('<html>Bad gateway</html>', { status: 502 }),
      ),
    );

    const code = await cli.run('log-level', 'set', 'redis', 'debug');

    expect(code).toBe(1);
    expect(cli.stderr()).toContain('502');
  });

  it('exits 2 with the server message when the server rejects the request (400)', async () => {
    answerWith(400, envelope('Validation', 'ttlSeconds: Too big: expected number to be <=14400'));

    const code = await cli.run('log-level', 'set', 'redis', 'debug', '--ttl', '99999');

    expect(code).toBe(2);
    expect(cli.stderr()).toContain('expected number to be <=14400');
  });

  it('exits 1 when the server cannot be reached', async () => {
    server.use(http.post(`${SERVER_URL}${getChangeLogLevelUrl()}`, () => HttpResponse.error()));

    const code = await cli.run('log-level', 'set', 'redis', 'debug');

    expect(code).toBe(1);
    expect(cli.stderr()).toContain(`Could not reach ${SERVER_URL}`);
  });

  describe('usage errors exit 2 without calling the server', () => {
    it.each([
      [['log-level', 'set', 'kafka', 'debug'], "value 'kafka' is invalid for argument 'component'"],
      [['log-level', 'set', 'redis', 'loud'], "value 'loud' is invalid for argument 'level'"],
      [['log-level', 'set', 'redis'], "missing required argument 'level'"],
      [['log-level', 'set', 'redis', 'debug', '--ttl', '0'], 'a whole number of seconds'],
      [['log-level', 'set', 'redis', 'debug', '--ttl', '1.5'], 'a whole number of seconds'],
      [['log-level', 'set', 'redis', 'debug', '--ttl', 'soon'], 'a whole number of seconds'],
      [['--profile', 'staging', 'log-level', 'set', 'redis', 'debug'], "Unknown profile 'staging'"],
    ])('%j', async (argv, message) => {
      const code = await cli.run(...argv);

      expect(code).toBe(2);
      expect(cli.stderr()).toContain(message);
    });

    it('when no profile has been added', async () => {
      cli = await operatorCli();

      const code = await cli.run('log-level', 'set', 'redis', 'debug');

      expect(code).toBe(2);
      expect(cli.stderr()).toContain('No profile selected');
    });
  });
});
