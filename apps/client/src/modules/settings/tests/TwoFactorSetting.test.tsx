import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { resources } from '@/resources';
import { API_ROUTE } from '@/test/api';
import {
  BACKUP_CODES,
  holdSession,
  mockBackupCodes,
  mockGetSession,
  mockListAccounts,
  mockTwoFactorDisable,
  mockTwoFactorEnable,
  mockTwoFactorVerify,
  aSession,
  TOTP_SECRET,
} from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const { twoFactor } = resources.settings.security;

const renderSecurity = async () => {
  useSettingsDialogStore.setState({ isOpen: true, section: 'security' });
  return renderRoute('/');
};

const turnOn = async () => {
  await userEvent.click(await screen.findByRole('button', { name: twoFactor.turnOn }));
  await userEvent.type(screen.getByLabelText(twoFactor.passwordStep), 'a-long-passphrase');
  await userEvent.click(screen.getByRole('button', { name: twoFactor.continue }));
};

beforeEach(() => {
  vi.restoreAllMocks();
  serveChatPage();
  server.use(mockListAccounts(['credential']));
  useSettingsDialogStore.setState({ isOpen: false, section: 'profile' });
});

describe('TwoFactorSetting', () => {
  it('walks through password, QR code and confirmation to the backup codes', async () => {
    await holdSession({ isAnonymous: false });
    const bodies: unknown[] = [];
    server.use(
      mockTwoFactorEnable(async (request) => {
        bodies.push(await request.clone().json());
      }),
      mockTwoFactorVerify(async (request) => {
        bodies.push(await request.clone().json());
      }),
    );
    await renderSecurity();

    await turnOn();

    expect(await screen.findByRole('img', { name: twoFactor.qr })).toBeInTheDocument();
    expect(screen.getByTestId('manual-key')).toHaveTextContent('JBSW Y3DP EHPK 3PXP');
    await userEvent.type(screen.getByLabelText(twoFactor.code), '482100');
    await userEvent.click(screen.getByRole('button', { name: twoFactor.verify }));

    const list = await screen.findByRole('list', { name: twoFactor.backupCodes });
    expect(list).toHaveTextContent(BACKUP_CODES[0]!);
    expect(list).toHaveTextContent(BACKUP_CODES[1]!);
    expect(screen.getByRole('button', { name: twoFactor.copyCodes })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: twoFactor.downloadCodes })).toBeInTheDocument();
    expect(bodies).toEqual([{ password: 'a-long-passphrase' }, { code: '482100' }]);
    expect(TOTP_SECRET).toBeTruthy();
  });

  it('accepts a code pasted the way authenticator apps show it', async () => {
    await holdSession({ isAnonymous: false });
    server.use(mockTwoFactorEnable());
    await renderSecurity();
    await turnOn();
    const field = await screen.findByLabelText(twoFactor.code);

    await userEvent.click(field);
    await userEvent.paste('482 100');

    expect(field).toHaveValue('482100');
    expect(screen.getByRole('button', { name: twoFactor.verify })).toBeEnabled();
  });

  it('takes the number row as digits on a layout that types symbols there', async () => {
    await holdSession({ isAnonymous: false });
    server.use(mockTwoFactorEnable());
    await renderSecurity();
    await turnOn();
    const field = await screen.findByLabelText(twoFactor.code);

    // Czech: the unshifted number row types ě š č ř ž ý.
    const row = [
      ['ě', 'Digit2'],
      ['š', 'Digit3'],
      ['č', 'Digit4'],
      ['ř', 'Digit5'],
      ['ž', 'Digit6'],
      ['ý', 'Digit7'],
    ];
    for (const [key, code] of row) fireEvent.keyDown(field, { key, code });

    expect(field).toHaveValue('234567');
    expect(screen.getByRole('button', { name: twoFactor.verify })).toBeEnabled();
  });

  it('downloads the backup codes as a text file', async () => {
    await holdSession({ isAnonymous: false });
    server.use(mockTwoFactorEnable(), mockTwoFactorVerify());
    const createUrl = vi.fn(() => 'blob:codes');
    URL.createObjectURL = createUrl;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await renderSecurity();
    await turnOn();
    await userEvent.type(await screen.findByLabelText(twoFactor.code), '482100');
    await userEvent.click(screen.getByRole('button', { name: twoFactor.verify }));

    await userEvent.click(await screen.findByRole('button', { name: twoFactor.downloadCodes }));

    expect(createUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });

  it('shows a wrong password inline and stays on the password step', async () => {
    await holdSession({ isAnonymous: false });
    server.use(
      http.post(API_ROUTE.authTwoFactorEnable, () =>
        HttpResponse.json(
          { code: 'INVALID_PASSWORD', message: 'Invalid password' },
          { status: 400 },
        ),
      ),
    );
    await renderSecurity();

    await turnOn();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      resources.auth.errors.currentPasswordInvalid,
    );
    expect(screen.queryByRole('img', { name: twoFactor.qr })).not.toBeInTheDocument();
  });

  it('shows a wrong confirmation code inline', async () => {
    await holdSession({ isAnonymous: false });
    server.use(
      mockTwoFactorEnable(),
      http.post(API_ROUTE.authTwoFactorVerifyTotp, () =>
        HttpResponse.json({ code: 'INVALID_CODE', message: 'Invalid code' }, { status: 400 }),
      ),
    );
    await renderSecurity();
    await turnOn();

    await userEvent.type(await screen.findByLabelText(twoFactor.code), '000000');
    await userEvent.click(screen.getByRole('button', { name: twoFactor.verify }));

    expect(await screen.findByRole('alert')).toHaveTextContent(twoFactor.invalidCode);
    expect(screen.queryByRole('list', { name: twoFactor.backupCodes })).not.toBeInTheDocument();
  });

  it('turns two-factor off with the password', async () => {
    server.use(mockGetSession(aSession({ isAnonymous: false, twoFactorEnabled: true })));
    await holdSession({ isAnonymous: false, twoFactorEnabled: true });
    let body: unknown;
    server.use(
      mockTwoFactorDisable(async (request) => {
        body = await request.clone().json();
      }),
    );
    await renderSecurity();

    await userEvent.click(await screen.findByRole('button', { name: twoFactor.turnOff }));
    await userEvent.type(screen.getByLabelText(twoFactor.disablePrompt), 'a-long-passphrase');
    await userEvent.click(screen.getByRole('button', { name: twoFactor.turnOff }));

    await waitFor(() => expect(body).toEqual({ password: 'a-long-passphrase' }));
    expect(await screen.findByRole('button', { name: twoFactor.turnOff })).toBeInTheDocument();
  });

  it('regenerates the backup codes with the password', async () => {
    await holdSession({ isAnonymous: false, twoFactorEnabled: true });
    server.use(mockBackupCodes());
    await renderSecurity();

    await userEvent.click(await screen.findByRole('button', { name: twoFactor.regenerate }));
    await userEvent.type(screen.getByLabelText(twoFactor.regeneratePrompt), 'a-long-passphrase');
    await userEvent.click(screen.getByRole('button', { name: twoFactor.regenerate }));

    const list = await screen.findByRole('list', { name: twoFactor.backupCodes });
    expect(list).toHaveTextContent('cccc-3333');
  });

  it('explains instead of offering setup to a user without a password', async () => {
    await holdSession({ isAnonymous: false });
    server.use(mockListAccounts(['google']));
    await renderSecurity();

    expect(await screen.findByText(twoFactor.needsPassword)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: twoFactor.turnOn })).not.toBeInTheDocument();
  });

  it('warns an Admin without two-factor that the dashboard needs it', async () => {
    await holdSession({ isAnonymous: false, role: 'admin', twoFactorEnabled: false });
    await renderSecurity();

    expect(
      await screen.findByText(resources.settings.security.adminNotice.title),
    ).toBeInTheDocument();
  });
});
