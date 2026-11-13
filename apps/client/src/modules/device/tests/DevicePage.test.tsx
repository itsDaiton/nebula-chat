import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@/resources';
import { API_ROUTE, mockApiError } from '@/test/api';
import {
  aDeviceRequest,
  aSession,
  holdSession,
  mockDeviceApprove,
  mockDeviceDeny,
  mockDeviceRequest,
  mockEmailSignIn,
  mockGetSession,
} from '@/test/auth';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

vi.mock('@/shared/hooks/useThemeMode', () => ({
  useThemeMode: () => ({ themeMode: 'light', toggleThemeMode: vi.fn() }),
}));

const { device } = resources;
const DEVICE_URL = '/device?user_code=WDJB-MJHT';

const ADMIN = { isAnonymous: false, emailVerified: true, role: 'admin' };
const ACTING_ADMIN = { ...ADMIN, twoFactorEnabled: true, twoFactorVerified: true };

const visitAs = async (session: Parameters<typeof aSession>[0], path = DEVICE_URL) => {
  await holdSession(session);
  return renderRoute(path);
};

const approveButton = () => screen.findByRole('button', { name: device.approve });

beforeEach(() => {
  server.use(mockDeviceRequest());
});

describe('DevicePage', () => {
  it('shows an acting Admin the code, the client, who they are and the time left', async () => {
    let asked: string | null = null;
    server.use(
      mockDeviceRequest(aDeviceRequest(), (request) => {
        asked = new URL(request.url).searchParams.get('user_code');
      }),
    );

    await visitAs(ACTING_ADMIN);

    expect(await screen.findByRole('heading', { name: device.title })).toBeInTheDocument();
    expect(screen.getByText('WDJB-MJHT')).toBeInTheDocument();
    expect(screen.getByText('nebula-cli')).toBeInTheDocument();
    expect(screen.getByText(`Ada · ${device.admin}`)).toBeInTheDocument();
    expect(screen.getByText(/^in (10:00|9:5\d)$/)).toBeInTheDocument();
    expect(screen.getByText(device.notice)).toBeInTheDocument();
    expect(asked).toBe('WDJB-MJHT');
  });

  it('approves the code and tells the Admin to return to the terminal', async () => {
    let body: unknown;
    server.use(
      mockDeviceApprove(async (request) => {
        body = await request.json();
      }),
    );
    await visitAs(ACTING_ADMIN);

    await userEvent.click(await approveButton());

    expect(await screen.findByRole('heading', { name: device.approvedTitle })).toBeInTheDocument();
    expect(screen.getByText(device.approved)).toBeInTheDocument();
    expect(body).toEqual({ userCode: 'WDJB-MJHT' });
  });

  it('denies the code', async () => {
    let body: unknown;
    server.use(
      mockDeviceDeny(async (request) => {
        body = await request.json();
      }),
    );
    await visitAs(ACTING_ADMIN);

    await userEvent.click(await screen.findByRole('button', { name: device.deny }));

    expect(await screen.findByRole('heading', { name: device.deniedTitle })).toBeInTheDocument();
    expect(body).toEqual({ userCode: 'WDJB-MJHT' });
  });

  it('keeps the request on screen when the decision cannot be recorded', async () => {
    server.use(mockApiError('post', API_ROUTE.authDeviceApprove, 500));
    await visitAs(ACTING_ADMIN);

    await userEvent.click(await approveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(device.failed);
    expect(await approveButton()).toBeEnabled();
  });

  it('tells a Registered user who is not an Admin why they cannot approve, without reading the code', async () => {
    let reads = 0;
    server.use(mockDeviceRequest(aDeviceRequest(), () => void (reads += 1)));

    await visitAs({ isAnonymous: false, emailVerified: true });

    expect(await screen.findByRole('alert')).toHaveTextContent(device.adminRequired);
    expect(screen.queryByRole('button', { name: device.approve })).not.toBeInTheDocument();
    expect(reads).toBe(0);
  });

  it('treats an Admin with an unverified email as not an Admin', async () => {
    await visitAs({ ...ACTING_ADMIN, emailVerified: false });

    expect(await screen.findByRole('alert')).toHaveTextContent(device.adminRequired);
  });

  it.each([
    ['has no two-factor authentication', ADMIN],
    ['signed in without a code', { ...ADMIN, twoFactorEnabled: true, twoFactorVerified: false }],
  ])('tells an Admin who %s to sign in with two-factor', async (_why, session) => {
    await visitAs(session);

    expect(await screen.findByRole('alert')).toHaveTextContent(device.twoFactorRequired);
  });

  it.each([
    ['ADMIN_REQUIRED', device.adminRequired],
    ['TWO_FACTOR_REQUIRED', device.twoFactorRequired],
  ])('explains a %s the server answers when the session here was stale', async (code, message) => {
    server.use(mockApiError('get', API_ROUTE.authDevice, 403, { code, message: 'refused' }));

    await visitAs(ACTING_ADMIN);

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('says so when the code is unknown or has expired', async () => {
    server.use(
      mockApiError('get', API_ROUTE.authDevice, 400, {
        error: 'invalid_request',
        error_description: 'Invalid user code',
      }),
    );

    await visitAs(ACTING_ADMIN);

    expect(await screen.findByRole('alert')).toHaveTextContent(device.invalid);
  });

  it('says so when the code ran out of time', async () => {
    server.use(
      mockDeviceRequest(aDeviceRequest({ expires_at: new Date(Date.now() - 1000).toISOString() })),
    );

    await visitAs(ACTING_ADMIN);

    expect(await screen.findByRole('alert')).toHaveTextContent(device.invalid);
  });

  it('says so when another Admin is already reviewing the code', async () => {
    server.use(mockDeviceRequest({ user_code: 'WDJB-MJHT', status: 'pending' }));

    await visitAs(ACTING_ADMIN);

    expect(await screen.findByRole('alert')).toHaveTextContent(device.invalid);
  });

  it('says so when the code was already approved or denied', async () => {
    server.use(mockDeviceRequest(aDeviceRequest({ status: 'approved' })));

    await visitAs(ACTING_ADMIN);

    expect(await screen.findByRole('alert')).toHaveTextContent(device.handled);
  });

  it('asks for the link from the terminal when the URL has no code', async () => {
    await visitAs(ACTING_ADMIN, '/device');

    expect(await screen.findByRole('alert')).toHaveTextContent(device.missingCode);
  });

  it('sends a Guest to sign in, keeping the code', async () => {
    server.use(mockGetSession(aSession()));

    const { router } = await renderRoute(DEVICE_URL);

    expect(router.state.location.pathname).toBe('/auth');
    expect(router.state.location.search).toEqual({ device: 'WDJB-MJHT' });
  });

  it('returns to the code once the Guest has signed in', async () => {
    let session = aSession();
    server.use(
      mockGetSession(() => session),
      mockEmailSignIn(() => {
        session = aSession(ACTING_ADMIN);
      }),
    );
    const { router } = await renderRoute(DEVICE_URL);

    await userEvent.type(
      await screen.findByRole('textbox', { name: resources.auth.fields.email }),
      'ada@example.com',
    );
    await userEvent.type(screen.getByLabelText(resources.auth.fields.password), 'hunter22hunter');
    await userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signIn }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/device'), { timeout: 3000 });
    expect(router.state.location.search).toEqual({ user_code: 'WDJB-MJHT' });
    expect(await approveButton()).toBeInTheDocument();
  });
});
