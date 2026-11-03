import { http, HttpResponse, type JsonBodyType } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Admin } from '@cli/api/generated/model/admin';
import {
  getGrantAdminUrl,
  getListAdminsUrl,
  getRevokeAdminUrl,
} from '@cli/api/generated/operator/operator';
import { createHarness, SERVER_URL } from '@cli/test/harness';
import { server } from '@cli/test/msw';

const TOKEN = 'operator-secret';
const EMAIL = 'dana@example.com';

const admin = (email = EMAIL, name = 'Dana', createdAt = '2026-09-01T08:30:00.000Z'): Admin => ({
  id: '3f0f6f0e-3c53-4c4e-9a64-0f4f3a9c9d11',
  email,
  name,
  twoFactorEnabled: false,
  createdAt,
});

const envelope = (error: string, message: string) => ({ success: false, error, message });

const cliWith = async (options: Parameters<typeof createHarness>[0] = {}) => {
  const cli = await createHarness({
    ...options,
    env: { NEBULA_OPERATOR_TOKEN: TOKEN, ...options.env },
  });
  await cli.writeConfig({ defaultProfile: 'local', profiles: { local: { url: SERVER_URL } } });
  return cli;
};

const grantAnswers = (status: number, body: JsonBodyType) => {
  const captured: { authorization: string | null; body: unknown }[] = [];
  server.use(
    http.post(`${SERVER_URL}${getGrantAdminUrl()}`, async ({ request }) => {
      captured.push({
        authorization: request.headers.get('authorization'),
        body: await request.json(),
      });
      return HttpResponse.json(body, { status });
    }),
  );
  return captured;
};

const revokeAnswers = (status: number, body?: JsonBodyType) => {
  const captured: { authorization: string | null }[] = [];
  server.use(
    http.delete(`${SERVER_URL}${getRevokeAdminUrl(encodeURIComponent(EMAIL))}`, ({ request }) => {
      captured.push({ authorization: request.headers.get('authorization') });
      return body === undefined
        ? new HttpResponse(null, { status })
        : HttpResponse.json(body, { status });
    }),
  );
  return captured;
};

describe('nebula admins grant', () => {
  it('grants with the operator token and prints the Admin', async () => {
    const cli = await cliWith();
    const captured = grantAnswers(201, admin());

    const code = await cli.run('admins', 'grant', EMAIL);

    expect(code).toBe(0);
    expect(captured).toEqual([{ authorization: `Bearer ${TOKEN}`, body: { email: EMAIL } }]);
    expect(cli.stdout()).toBe(
      [
        'Email:       dana@example.com',
        'Name:        Dana',
        'Granted at:  2026-09-01T08:30:00.000Z',
        '',
      ].join('\n'),
    );
  });

  it('prints the Admin as one JSON document with --json', async () => {
    const cli = await cliWith();
    grantAnswers(201, admin());

    expect(await cli.run('--json', 'admins', 'grant', EMAIL)).toBe(0);
    expect(JSON.parse(cli.stdout())).toEqual(admin());
  });

  it.each([
    [400, 'Validation', 'A Guest cannot be an Admin.'],
    [400, 'Validation', 'Only a user with a verified email can be an Admin.'],
    [400, 'Validation', 'A banned user cannot be an Admin.'],
    [409, 'Conflict', 'This user is already an Admin.'],
    [404, 'NotFound', 'User not found'],
  ])('prints the server message and exits 1 on a %i (%s: %s)', async (status, error, message) => {
    const cli = await cliWith();
    grantAnswers(status, envelope(error, message));

    expect(await cli.run('admins', 'grant', EMAIL)).toBe(1);
    expect(cli.stderr()).toBe(`error: ${message}\n`);
    expect(cli.stdout()).toBe('');
  });

  it('exits 3 when the operator token is wrong', async () => {
    const cli = await cliWith();
    grantAnswers(403, envelope('Forbidden', 'This action requires the operator token.'));

    expect(await cli.run('admins', 'grant', EMAIL)).toBe(3);
    expect(cli.stderr()).toContain('rejected NEBULA_OPERATOR_TOKEN');
  });

  it('exits 3 when the server has no operator token configured', async () => {
    const cli = await cliWith();
    grantAnswers(404, envelope('NotFound', 'Route not found'));

    expect(await cli.run('admins', 'grant', EMAIL)).toBe(3);
    expect(cli.stderr()).toContain('has no operator token configured');
  });

  it('exits 3 without calling the server when NEBULA_OPERATOR_TOKEN is unset', async () => {
    const cli = await cliWith({ env: { NEBULA_OPERATOR_TOKEN: '' } });

    expect(await cli.run('admins', 'grant', EMAIL)).toBe(3);
    expect(cli.stderr()).toContain('NEBULA_OPERATOR_TOKEN is not set');
  });

  it('exits 1 on an unexpected server error', async () => {
    const cli = await cliWith();
    grantAnswers(500, envelope('Internal', 'boom'));

    expect(await cli.run('admins', 'grant', EMAIL)).toBe(1);
    expect(cli.stderr()).toBe('error: The server answered 500: boom\n');
  });
});

describe('nebula admins revoke', () => {
  it('revokes without asking when --yes is passed', async () => {
    const cli = await cliWith();
    const captured = revokeAnswers(204);

    const code = await cli.run('admins', 'revoke', EMAIL, '--yes');

    expect(code).toBe(0);
    expect(captured).toEqual([{ authorization: `Bearer ${TOKEN}` }]);
    expect(cli.asked).toEqual([]);
    expect(cli.stdout()).toBe(`${EMAIL} is no longer an Admin.\n`);
  });

  it('prints a JSON document with --json', async () => {
    const cli = await cliWith();
    revokeAnswers(204);

    expect(await cli.run('--json', 'admins', 'revoke', EMAIL, '--yes')).toBe(0);
    expect(JSON.parse(cli.stdout())).toEqual({ email: EMAIL, revoked: true });
  });

  it('asks on a TTY and revokes on a yes', async () => {
    const cli = await cliWith({ isTTY: true, answer: true });
    const captured = revokeAnswers(204);

    expect(await cli.run('admins', 'revoke', EMAIL)).toBe(0);
    expect(cli.asked).toEqual([`Take the Admin role from ${EMAIL}?`]);
    expect(captured).toHaveLength(1);
  });

  it('asks on a TTY and stops on a no, without calling the server', async () => {
    const cli = await cliWith({ isTTY: true, answer: false });
    const captured = revokeAnswers(204);

    expect(await cli.run('admins', 'revoke', EMAIL)).toBe(1);
    expect(captured).toEqual([]);
    expect(cli.stderr()).toBe('error: Cancelled; no Admin was revoked.\n');
  });

  it('exits 2 with a hint in a non-TTY without --yes, and never asks', async () => {
    const cli = await cliWith({ isTTY: false, answer: true });
    const captured = revokeAnswers(204);

    expect(await cli.run('admins', 'revoke', EMAIL)).toBe(2);
    expect(captured).toEqual([]);
    expect(cli.asked).toEqual([]);
    expect(cli.stderr()).toBe(
      'error: Refusing to revoke without confirmation in a non-interactive shell. Pass --yes to confirm.\n',
    );
  });

  it.each([
    [409, 'Conflict', 'This user is not an Admin.'],
    [404, 'NotFound', 'User not found'],
  ])('prints the server message and exits 1 on a %i', async (status, error, message) => {
    const cli = await cliWith();
    revokeAnswers(status, envelope(error, message));

    expect(await cli.run('admins', 'revoke', EMAIL, '--yes')).toBe(1);
    expect(cli.stderr()).toBe(`error: ${message}\n`);
  });

  it('exits 1 with the server message when the user is the last Admin', async () => {
    const cli = await cliWith();
    revokeAnswers(409, envelope('LastAdmin', 'The last Admin cannot be revoked.'));

    expect(await cli.run('admins', 'revoke', EMAIL, '--yes')).toBe(1);
    expect(cli.stderr()).toBe('error: The last Admin cannot be revoked.\n');
  });

  it('exits 3 when the operator token is wrong', async () => {
    const cli = await cliWith();
    revokeAnswers(403, envelope('Forbidden', 'This action requires the operator token.'));

    expect(await cli.run('admins', 'revoke', EMAIL, '--yes')).toBe(3);
  });

  it('exits 3 when the server has no operator token configured', async () => {
    const cli = await cliWith();
    revokeAnswers(404, envelope('NotFound', 'Route not found'));

    expect(await cli.run('admins', 'revoke', EMAIL, '--yes')).toBe(3);
  });
});

describe('nebula admins list', () => {
  it('prints a table of email, name and granted at', async () => {
    const cli = await cliWith();
    server.use(
      http.get(`${SERVER_URL}${getListAdminsUrl()}`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe(`Bearer ${TOKEN}`);
        return HttpResponse.json([
          admin(),
          admin('lee@example.com', 'Lee', '2026-09-02T10:00:00.000Z'),
        ]);
      }),
    );

    expect(await cli.run('admins', 'list')).toBe(0);
    expect(cli.stdout()).toBe(
      [
        'EMAIL             NAME  GRANTED AT',
        'dana@example.com  Dana  2026-09-01T08:30:00.000Z',
        'lee@example.com   Lee   2026-09-02T10:00:00.000Z',
        '',
      ].join('\n'),
    );
  });

  it('prints the Admins as one JSON array with --json', async () => {
    const cli = await cliWith();
    server.use(http.get(`${SERVER_URL}${getListAdminsUrl()}`, () => HttpResponse.json([admin()])));

    expect(await cli.run('--json', 'admins', 'list')).toBe(0);
    expect(JSON.parse(cli.stdout())).toEqual([admin()]);
  });

  it('says so when there are no Admins yet', async () => {
    const cli = await cliWith();
    server.use(http.get(`${SERVER_URL}${getListAdminsUrl()}`, () => HttpResponse.json([])));

    expect(await cli.run('admins', 'list')).toBe(0);
    expect(cli.stdout()).toBe('No Admins yet. Make one with: nebula admins grant <email>\n');
  });

  it('exits 3 when the operator token is wrong', async () => {
    const cli = await cliWith();
    server.use(
      http.get(`${SERVER_URL}${getListAdminsUrl()}`, () =>
        HttpResponse.json(envelope('Forbidden', 'nope'), { status: 403 }),
      ),
    );

    expect(await cli.run('admins', 'list')).toBe(3);
  });
});
