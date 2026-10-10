import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { SettingsPage } from '@/modules/settings/SettingsPage';
import { usePasswordChangeStore } from '@/modules/settings/stores/usePasswordChangeStore';
import { useSettingsSearchStore } from '@/modules/settings/stores/useSettingsSearchStore';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { API_ROUTE, mockApiError } from '@/test/api';
import {
  holdSession,
  mockChangePassword,
  mockDeleteUser,
  mockGetSession,
  mockListAccounts,
  mockRevokeSessions,
  mockSignOut,
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
const { changePassword, profile, account } = resources.settings;

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
  useSettingsSearchStore.setState({ query: '' });
});

const searchField = () => screen.getByRole('searchbox', { name: resources.settings.search.label });

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

    it('ends the page with an Account section', async () => {
      await holdSession({ isAnonymous: false });

      renderPage();

      expect(screen.getByRole('heading', { level: 2, name: account.title })).toBeInTheDocument();
    });

    it('lists its sections in a Settings navigation, marking the open one', async () => {
      await holdSession({ isAnonymous: false });

      renderPage();

      const nav = screen.getByRole('navigation', { name: resources.settings.title });
      expect(
        within(nav).getByRole('link', { name: resources.settings.sections.account }),
      ).toHaveAttribute('aria-current', 'page');
    });

    it('goes back to the chat through the navbar, not a close button', async () => {
      await holdSession({ isAnonymous: false });
      renderPage();

      expect(screen.queryByRole('link', { name: /close/i })).not.toBeInTheDocument();
      await userEvent.click(screen.getByText(resources.chat.appName));

      expect(screen.getByText(CHAT_PAGE)).toBeInTheDocument();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await holdSession({ isAnonymous: false });
    });

    it('narrows the page to the settings that match, hiding empty sections', async () => {
      renderPage();

      await userEvent.type(searchField(), 'password');

      expect(screen.getByRole('button', { name: changePassword.open })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 2, name: resources.settings.security.title }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: profile.name.label })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { level: 2, name: profile.title }),
      ).not.toBeInTheDocument();
    });

    it('matches regardless of case, on every word, including related terms', async () => {
      renderPage();

      await userEvent.type(searchField(), 'FULL  Name');
      expect(nameField()).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: changePassword.open })).not.toBeInTheDocument();

      await userEvent.clear(searchField());
      await userEvent.type(searchField(), 'login');
      expect(screen.getByRole('button', { name: changePassword.open })).toBeInTheDocument();

      await userEvent.clear(searchField());
      await userEvent.type(searchField(), 'delete');
      expect(
        screen.getByRole('button', { name: account.deleteAccount.action }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: account.signOutEverywhere.action }),
      ).not.toBeInTheDocument();
    });

    it('says so when nothing matches, and shows everything again once cleared', async () => {
      renderPage();

      await userEvent.type(searchField(), 'zebra');

      expect(screen.getByRole('status')).toHaveTextContent(resources.settings.search.empty);
      expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: resources.settings.search.clear }));

      expect(searchField()).toHaveValue('');
      expect(searchField()).toHaveFocus();
      expect(nameField()).toBeInTheDocument();
      expect(screen.getByRole('button', { name: changePassword.open })).toBeInTheDocument();
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

  describe('search keeps hidden settings as they were', () => {
    beforeEach(async () => {
      await holdSession({ isAnonymous: false });
    });

    it('keeps an unsaved name and an open password form through a search', async () => {
      renderPage();
      await userEvent.type(nameField(), ' Lovelace');
      await openPasswordForm();
      await userEvent.type(currentPasswordField(), 'half-typed');

      await userEvent.type(searchField(), 'account id');
      await userEvent.clear(searchField());

      expect(nameField()).toHaveValue('Ada Lovelace');
      expect(currentPasswordField()).toHaveValue('half-typed');
    });
  });

  describe('Account', () => {
    beforeEach(async () => {
      await holdSession({ isAnonymous: false });
    });

    it("shows the user's account ID and copies it", async () => {
      const user = userEvent.setup();
      renderPage();

      expect(screen.getByText('user-1')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: account.accountId.copy }));

      expect(await navigator.clipboard.readText()).toBe('user-1');
    });

    it('logs out of every device, this one included, and returns to the chat', async () => {
      const calls: string[] = [];
      server.use(
        mockRevokeSessions(() => {
          calls.push('revoke-sessions');
        }),
        mockSignOut(() => {
          calls.push('sign-out');
        }),
      );
      renderPage();

      await userEvent.click(screen.getByRole('button', { name: account.signOutEverywhere.action }));

      expect(await screen.findByText(CHAT_PAGE)).toBeInTheDocument();
      expect(calls).toEqual(['revoke-sessions', 'sign-out']);
    });

    it('finishes signing out when the sessions were already revoked by an earlier try', async () => {
      server.use(mockApiError('post', API_ROUTE.authRevokeSessions, 401), mockSignOut());
      renderPage();

      await userEvent.click(screen.getByRole('button', { name: account.signOutEverywhere.action }));

      expect(await screen.findByText(CHAT_PAGE)).toBeInTheDocument();
    });

    it('stays put, signed in, when revoking fails for another reason', async () => {
      let signOuts = 0;
      server.use(
        mockApiError('post', API_ROUTE.authRevokeSessions, 500),
        mockSignOut(() => {
          signOuts += 1;
        }),
      );
      renderPage();

      await userEvent.click(screen.getByRole('button', { name: account.signOutEverywhere.action }));

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: account.signOutEverywhere.action }),
        ).toBeEnabled(),
      );
      expect(signOuts).toBe(0);
      expect(screen.queryByText(CHAT_PAGE)).not.toBeInTheDocument();
    });

    describe('deleting it', () => {
      const openDeleteDialog = async () => {
        await userEvent.click(screen.getByRole('button', { name: account.deleteAccount.action }));
        return screen.findByRole('alertdialog', { name: account.deleteAccount.dialogTitle });
      };
      const confirmDelete = (dialog: HTMLElement) =>
        userEvent.click(
          within(dialog).getByRole('button', { name: account.deleteAccount.confirm }),
        );

      it('asks for the password, deletes the account and returns to the chat', async () => {
        const toast = vi.spyOn(toaster, 'create');
        let body: unknown;
        server.use(
          mockListAccounts(['credential']),
          mockDeleteUser(async (request) => {
            body = await request.clone().json();
          }),
        );
        renderPage();

        const dialog = await openDeleteDialog();
        expect(within(dialog).getByText(account.deleteAccount.warning)).toBeInTheDocument();
        await userEvent.type(
          await within(dialog).findByLabelText(fields.password),
          'my-passphrase',
        );
        await confirmDelete(dialog);

        expect(await screen.findByText(CHAT_PAGE)).toBeInTheDocument();
        expect(body).toEqual({ password: 'my-passphrase' });
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success', title: account.deleteAccount.done }),
        );
      });

      it('shows no error once the deleted account has no session left', async () => {
        const toast = vi.spyOn(toaster, 'create');
        const state = { deleted: false };
        server.use(
          // As the server does: once the user is gone, every authenticated call is a 401.
          http.get(API_ROUTE.authListAccounts, () =>
            state.deleted
              ? HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })
              : HttpResponse.json([]),
          ),
          mockDeleteUser(() => {
            state.deleted = true;
          }),
        );
        renderPage();

        await confirmDelete(await openDeleteDialog());

        expect(await screen.findByText(CHAT_PAGE)).toBeInTheDocument();
        // Give a stray refetch the time to land.
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
      });

      it('requires the password before sending anything', async () => {
        let requests = 0;
        server.use(
          mockListAccounts(['credential']),
          mockDeleteUser(() => {
            requests += 1;
          }),
        );
        renderPage();

        const dialog = await openDeleteDialog();
        await within(dialog).findByLabelText(fields.password);
        await confirmDelete(dialog);

        await waitFor(() =>
          expect(within(dialog).getByLabelText(fields.password)).toHaveAccessibleErrorMessage(
            resources.auth.validation.passwordRequired,
          ),
        );
        expect(requests).toBe(0);
      });

      it('shows a wrong password under the field and keeps the account', async () => {
        server.use(
          mockListAccounts(['credential']),
          mockApiError('post', API_ROUTE.authDeleteUser, 400, { code: 'INVALID_PASSWORD' }),
        );
        renderPage();

        const dialog = await openDeleteDialog();
        await userEvent.type(await within(dialog).findByLabelText(fields.password), 'wrong-one');
        await confirmDelete(dialog);

        await waitFor(() =>
          expect(within(dialog).getByLabelText(fields.password)).toHaveAccessibleErrorMessage(
            resources.auth.errors.currentPasswordInvalid,
          ),
        );
        expect(screen.queryByText(CHAT_PAGE)).not.toBeInTheDocument();
      });

      it('lets a user without a password confirm with their recent sign-in', async () => {
        let body: unknown;
        server.use(
          mockListAccounts(['google']),
          mockDeleteUser(async (request) => {
            body = await request.clone().json();
          }),
        );
        renderPage();

        const dialog = await openDeleteDialog();
        await within(dialog).findByText(account.deleteAccount.noPasswordHint);
        expect(within(dialog).queryByLabelText(fields.password)).not.toBeInTheDocument();
        await confirmDelete(dialog);

        expect(await screen.findByText(CHAT_PAGE)).toBeInTheDocument();
        expect(body).toEqual({});
      });

      it('asks a user without a password to sign in again once that sign-in is old', async () => {
        server.use(
          mockListAccounts(['github']),
          mockApiError('post', API_ROUTE.authDeleteUser, 400, { code: 'SESSION_EXPIRED' }),
        );
        renderPage();

        const dialog = await openDeleteDialog();
        await within(dialog).findByText(account.deleteAccount.noPasswordHint);
        await confirmDelete(dialog);

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
          resources.auth.errors.sessionExpired,
        );
      });

      it('explains a password sent for an account that has none', async () => {
        server.use(
          mockApiError('get', API_ROUTE.authListAccounts, 500),
          mockApiError('post', API_ROUTE.authDeleteUser, 400, {
            code: 'CREDENTIAL_ACCOUNT_NOT_FOUND',
          }),
        );
        renderPage();

        const dialog = await openDeleteDialog();
        await userEvent.type(await within(dialog).findByLabelText(fields.password), 'anything');
        await confirmDelete(dialog);

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
          resources.auth.errors.noPassword,
        );
      });

      it('keeps the account when the user cancels', async () => {
        server.use(mockListAccounts(['credential']));
        renderPage();

        const dialog = await openDeleteDialog();
        await userEvent.click(
          within(dialog).getByRole('button', { name: account.deleteAccount.cancel }),
        );

        await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      });

      it('closes without deleting when the user clicks outside it', async () => {
        const deletions = { requests: 0 };
        server.use(
          mockListAccounts(['credential']),
          mockDeleteUser(() => {
            deletions.requests += 1;
          }),
        );
        renderPage();

        await openDeleteDialog();
        // The open dialog makes the page behind it inert, the way a backdrop click reaches it.
        const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

        // The dialog listens for outside clicks only a frame after it opens, so click until it does.
        await waitFor(async () => {
          await user.click(document.body);
          expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        });
        expect(deletions.requests).toBe(0);
      });
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
      // The only status region is the search's, and it has nothing to say: no in-place success panel.
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
      expect(screen.queryByText(AUTH_PAGE)).not.toBeInTheDocument();

      // Opened again, the form doesn't bring back the passwords it sent.
      await openPasswordForm();
      expect(currentPasswordField()).toHaveValue('');
      expect(newPasswordField()).toHaveValue('');
      expect(confirmPasswordField()).toHaveValue('');
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

    it('refuses a new password longer than 128 characters without sending it', async () => {
      const counter = countRequests();
      renderPage();
      await openPasswordForm();

      await fillForm({ next: 'a'.repeat(129) });
      await submit();

      await waitFor(() =>
        expect(newPasswordField()).toHaveAccessibleErrorMessage(
          resources.auth.validation.passwordTooLong,
        ),
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
