import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { SettingsPage } from '@/modules/settings/SettingsPage';
import { usePasswordChangeStore } from '@/modules/settings/stores/usePasswordChangeStore';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { API_ROUTE, mockApiError } from '@/test/api';
import {
  holdSession,
  mockChangePassword,
  mockGetSession,
  mockUpdateUser,
  refreshSession,
} from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithChakra } from '@/test/render';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

const AUTH_PAGE = 'auth page';
const CHAT_PAGE = 'chat page';
const { fields } = resources.auth;
const { changePassword, profile } = resources.settings;

const renderPage = () =>
  renderWithChakra(
    <Routes>
      <Route path={route.settings.root()} element={<SettingsPage />} />
      <Route path={route.auth.root()} element={AUTH_PAGE} />
      <Route path={route.chat.root()} element={CHAT_PAGE} />
    </Routes>,
    { route: route.settings.root() },
  );

// A masked password input has no ARIA role, so it is found by its label.
const currentPasswordField = () => screen.getByLabelText(fields.currentPassword);
const newPasswordField = () => screen.getByLabelText(fields.newPassword);
const confirmPasswordField = () => screen.getByLabelText(fields.confirmNewPassword);

const fillForm = async ({
  current = 'old-passphrase',
  next = 'a-new-long-passphrase',
  confirmation = next,
}: { current?: string; next?: string; confirmation?: string } = {}) => {
  await userEvent.type(currentPasswordField(), current);
  await userEvent.type(newPasswordField(), next);
  await userEvent.type(confirmPasswordField(), confirmation);
};

const openPasswordForm = () =>
  userEvent.click(screen.getByRole('button', { name: changePassword.open }));
const submit = () => userEvent.click(screen.getByRole('button', { name: changePassword.submit }));

const nameField = () => screen.getByRole('textbox', { name: profile.name.label });
const saveName = () => userEvent.click(screen.getByRole('button', { name: profile.name.save }));

/** Counts the change-password requests that reach the server. */
const countRequests = () => {
  const counter = { requests: 0 };
  server.use(
    mockChangePassword(() => {
      counter.requests += 1;
    }),
  );
  return counter;
};

beforeEach(() => {
  vi.restoreAllMocks();
  usePasswordVisibilityStore.setState({ visibleFields: {} });
  usePasswordChangeStore.setState({ isPasswordFormOpen: false });
});

describe('SettingsPage', () => {
  describe('layout', () => {
    it("keeps the app's navbar but replaces the chat, conversations included", async () => {
      await holdSession({ isAnonymous: false });

      renderPage();

      expect(
        screen.getByRole('heading', { level: 1, name: resources.settings.sections.account }),
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole('banner')).getByRole('button', { name: resources.userMenu.label }),
      ).toBeInTheDocument();
      expect(screen.queryByText(resources.conversations.title)).not.toBeInTheDocument();
    });

    it('groups the Account page into Profile and Security sections', async () => {
      await holdSession({ isAnonymous: false });

      renderPage();

      expect(screen.getByRole('heading', { level: 2, name: profile.title })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 2, name: resources.settings.security.title }),
      ).toBeInTheDocument();
    });

    it('lists its sections in a Settings navigation, marking the open one', async () => {
      await holdSession({ isAnonymous: false });

      renderPage();

      const nav = screen.getByRole('navigation', { name: resources.settings.title });
      expect(
        within(nav).getByRole('link', { name: resources.settings.sections.account }),
      ).toHaveAttribute('aria-current', 'page');
    });

    it('closes back to the chat', async () => {
      await holdSession({ isAnonymous: false });
      renderPage();

      await userEvent.click(screen.getByRole('link', { name: resources.settings.close }));

      expect(screen.getByText(CHAT_PAGE)).toBeInTheDocument();
    });
  });

  describe('access', () => {
    it('sends a Guest to the auth page', async () => {
      await holdSession({ isAnonymous: true });

      renderPage();

      expect(screen.getByText(AUTH_PAGE)).toBeInTheDocument();
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('sends a signed-out visitor to the auth page', async () => {
      server.use(mockGetSession(null));

      renderPage();
      refreshSession();

      expect(await screen.findByText(AUTH_PAGE)).toBeInTheDocument();
    });
  });

  describe('Profile name', () => {
    beforeEach(async () => {
      await holdSession({ isAnonymous: false });
    });

    it("shows the user's name, with Save idle until it changes", async () => {
      renderPage();

      expect(nameField()).toHaveValue('Ada');
      expect(screen.getByRole('button', { name: profile.name.save })).toBeDisabled();

      await userEvent.type(nameField(), ' Lovelace');

      expect(screen.getByRole('button', { name: profile.name.save })).toBeEnabled();
    });

    it('saves the new name and confirms it', async () => {
      const toast = vi.spyOn(toaster, 'create');
      let body: unknown;
      server.use(
        mockUpdateUser(async (request) => {
          body = await request.clone().json();
        }),
      );
      renderPage();

      await userEvent.clear(nameField());
      await userEvent.type(nameField(), '  Ada Lovelace ');
      await saveName();

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success', title: profile.name.saved }),
        ),
      );
      expect(body).toEqual({ name: 'Ada Lovelace' });
      expect(nameField()).toHaveValue('Ada Lovelace');
      expect(screen.getByRole('button', { name: profile.name.save })).toBeDisabled();
    });

    it('refuses an empty name without sending it', async () => {
      let requests = 0;
      server.use(
        mockUpdateUser(() => {
          requests += 1;
        }),
      );
      renderPage();

      await userEvent.clear(nameField());
      await userEvent.type(nameField(), '   ');
      await saveName();

      await waitFor(() =>
        expect(nameField()).toHaveAccessibleErrorMessage(resources.auth.validation.nameRequired),
      );
      expect(requests).toBe(0);
    });

    it('shows a failed save under the name field', async () => {
      server.use(mockApiError('post', API_ROUTE.authUpdateUser, 500));
      renderPage();

      await userEvent.type(nameField(), ' Lovelace');
      await saveName();

      await waitFor(() =>
        expect(nameField()).toHaveAccessibleErrorMessage(resources.auth.errors.unknown),
      );
    });
  });

  describe('Password change', () => {
    beforeEach(async () => {
      await holdSession({ isAnonymous: false });
    });

    it('keeps the form folded away until the user asks to change their password', async () => {
      renderPage();

      expect(screen.queryByLabelText(fields.currentPassword)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: changePassword.open })).toHaveAttribute(
        'aria-expanded',
        'false',
      );

      await openPasswordForm();

      expect(screen.getByRole('form', { name: changePassword.open })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: changePassword.cancel }));
      expect(screen.queryByLabelText(fields.currentPassword)).not.toBeInTheDocument();
    });

    it('asks for the current password and the new one twice', async () => {
      renderPage();
      await openPasswordForm();

      expect(currentPasswordField()).toHaveAttribute('autocomplete', 'current-password');
      expect(newPasswordField()).toHaveAttribute('autocomplete', 'new-password');
      expect(confirmPasswordField()).toHaveAttribute('autocomplete', 'new-password');
    });

    it('changes the password, signing out other devices, and folds the form away', async () => {
      const toast = vi.spyOn(toaster, 'create');
      let body: unknown;
      server.use(
        mockChangePassword(async (request) => {
          body = await request.clone().json();
        }),
      );
      renderPage();
      await openPasswordForm();

      await fillForm();
      await submit();

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success', title: changePassword.done }),
        ),
      );
      expect(body).toEqual({
        currentPassword: 'old-passphrase',
        newPassword: 'a-new-long-passphrase',
        revokeOtherSessions: true,
      });
      await waitFor(() =>
        expect(screen.queryByLabelText(fields.currentPassword)).not.toBeInTheDocument(),
      );
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText(AUTH_PAGE)).not.toBeInTheDocument();
    });

    it('shows a wrong current password under its field', async () => {
      server.use(
        mockApiError('post', API_ROUTE.authChangePassword, 400, {
          code: 'INVALID_PASSWORD',
          message: 'Invalid password',
        }),
      );
      renderPage();
      await openPasswordForm();

      await fillForm();
      await submit();

      await waitFor(() =>
        expect(currentPasswordField()).toHaveAccessibleErrorMessage(
          resources.auth.errors.currentPasswordInvalid,
        ),
      );
      expect(newPasswordField()).not.toBeInvalid();
    });

    it.each([
      ['PASSWORD_REUSED', resources.auth.errors.passwordReused],
      ['PASSWORD_COMPROMISED', resources.auth.errors.passwordCompromised],
      ['PASSWORD_TOO_SHORT', resources.auth.validation.passwordTooShort],
      ['PASSWORD_TOO_LONG', resources.auth.validation.passwordTooLong],
    ])('shows %s under the new-password field', async (code, message) => {
      server.use(mockApiError('post', API_ROUTE.authChangePassword, 400, { code }));
      renderPage();
      await openPasswordForm();

      await fillForm();
      await submit();

      await waitFor(() => expect(newPasswordField()).toHaveAccessibleErrorMessage(message));
    });

    it('says when there have been too many attempts', async () => {
      server.use(mockApiError('post', API_ROUTE.authChangePassword, 429));
      renderPage();
      await openPasswordForm();

      await fillForm();
      await submit();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        resources.auth.errors.tooManyRequests,
      );
    });

    it('falls back to a generic alert for an unrecognised error', async () => {
      server.use(
        mockApiError('post', API_ROUTE.authChangePassword, 500, { code: 'SOMETHING_NEW' }),
      );
      renderPage();
      await openPasswordForm();

      await fillForm();
      await submit();

      expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.errors.unknown);
    });

    it('sends nothing while the confirmation does not match', async () => {
      const counter = countRequests();
      renderPage();
      await openPasswordForm();

      await fillForm({ confirmation: 'a-new-long-passphrasE' });
      await submit();

      await waitFor(() =>
        expect(confirmPasswordField()).toHaveAccessibleErrorMessage(
          resources.auth.validation.passwordMismatch,
        ),
      );
      expect(counter.requests).toBe(0);
    });

    it('sends nothing when the new password is the current one', async () => {
      const counter = countRequests();
      renderPage();
      await openPasswordForm();

      await fillForm({ current: 'old-passphrase', next: 'old-passphrase' });
      await submit();

      await waitFor(() =>
        expect(newPasswordField()).toHaveAccessibleErrorMessage(
          resources.auth.errors.passwordReused,
        ),
      );
      expect(counter.requests).toBe(0);
    });

    it('requires the current password and a long enough new one', async () => {
      const counter = countRequests();
      renderPage();
      await openPasswordForm();

      await userEvent.type(newPasswordField(), 'short');
      await submit();

      await waitFor(() =>
        expect(currentPasswordField()).toHaveAccessibleErrorMessage(
          resources.auth.validation.passwordRequired,
        ),
      );
      expect(newPasswordField()).toHaveAccessibleErrorMessage(
        resources.auth.validation.passwordTooShort,
      );
      expect(counter.requests).toBe(0);
    });

    it('reveals only the password field whose toggle is clicked', async () => {
      renderPage();
      await openPasswordForm();

      const [, newPasswordToggle] = screen.getAllByRole('button', {
        name: resources.passwordInput.showPassword,
      });
      await userEvent.click(newPasswordToggle!);

      expect(newPasswordField()).toHaveAttribute('type', 'text');
      expect(currentPasswordField()).toHaveAttribute('type', 'password');
      expect(confirmPasswordField()).toHaveAttribute('type', 'password');
    });
  });
});
