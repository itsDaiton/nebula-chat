import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGetProfileImageSettingsMockHandler,
  getRemoveProfileImageMockHandler,
  getUploadProfileImageMockHandler,
} from '@/libs/api/generated/profile-image/profile-image.msw';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { usePasswordChangeStore } from '@/modules/settings/stores/usePasswordChangeStore';
import { useSettingsSearchStore } from '@/modules/settings/stores/useSettingsSearchStore';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';
import { API_ROUTE, mockApiError } from '@/test/api';
import {
  aSession,
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
import { serveChatPage } from '@/test/chat';
import { aSendableFile } from '@/test/files';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

// The real pages these flows land on, through the router's bridge.
const AUTH_PAGE = resources.auth.signIn.title;
const CHAT_PAGE = resources.chat.welcomeMessage;
const { fields } = resources.auth;
const { changePassword, profile, account } = resources.settings;

const renderPage = () => renderRoute('/settings');

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
  server.use(getGetProfileImageSettingsMockHandler({ uploadsEnabled: true }));
  serveChatPage();
  usePasswordVisibilityStore.setState({ visibleFields: {} });
  usePasswordChangeStore.setState({ isPasswordFormOpen: false });
  useSettingsSearchStore.setState({ query: '' });
});

const searchField = () => screen.getByRole('searchbox', { name: resources.settings.search.label });

describe('SettingsPage', () => {
  describe('layout', () => {
    it("keeps the app's navbar but replaces the chat, sessions included", async () => {
      await holdSession({ isAnonymous: false });

      await renderPage();

      expect(
        screen.getByRole('heading', { level: 1, name: resources.settings.sections.account }),
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole('banner')).getByRole('button', { name: resources.userMenu.label }),
      ).toBeInTheDocument();
      expect(screen.queryByText(resources.sessions.title)).not.toBeInTheDocument();
    });

    it('groups the Account page into Profile and Security sections', async () => {
      await holdSession({ isAnonymous: false });

      await renderPage();

      expect(screen.getByRole('heading', { level: 2, name: profile.title })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 2, name: resources.settings.security.title }),
      ).toBeInTheDocument();
    });

    it('ends the page with an Account section', async () => {
      await holdSession({ isAnonymous: false });

      await renderPage();

      expect(screen.getByRole('heading', { level: 2, name: account.title })).toBeInTheDocument();
    });

    it('lists its sections in a Settings navigation, marking the open one', async () => {
      await holdSession({ isAnonymous: false });

      await renderPage();

      const nav = screen.getByRole('navigation', { name: resources.settings.title });
      expect(
        within(nav).getByRole('link', { name: resources.settings.sections.account }),
      ).toHaveAttribute('aria-current', 'page');
    });

    it('goes back to the chat through the navbar, not a close button', async () => {
      await holdSession({ isAnonymous: false });
      await renderPage();

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
      await renderPage();

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
      await renderPage();

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
      await renderPage();

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

      await renderPage();

      expect(await screen.findByText(AUTH_PAGE)).toBeInTheDocument();
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('sends a signed-out visitor to the auth page', async () => {
      server.use(mockGetSession(null));

      await renderPage();
      refreshSession();

      expect(await screen.findByText(AUTH_PAGE)).toBeInTheDocument();
    });
  });

  describe('Profile name', () => {
    beforeEach(async () => {
      await holdSession({ isAnonymous: false });
    });

    it("shows the user's name, with Save idle until it changes", async () => {
      await renderPage();

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
      await renderPage();

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
      await renderPage();

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
      await renderPage();

      await userEvent.type(nameField(), ' Lovelace');
      await saveName();

      await waitFor(() =>
        expect(nameField()).toHaveAccessibleErrorMessage(resources.auth.errors.unknown),
      );
    });
  });

  describe('Profile image', () => {
    const IMAGE_URL = 'https://storage.test/profile-images/user-1/new.webp';
    const { image: copy } = profile;

    // Rendered once the server says uploads are on.
    const imageInput = () => screen.findByLabelText<HTMLInputElement>(copy.label);
    const uploadButton = () => screen.queryByRole('button', { name: copy.upload });
    const removeButton = () => screen.queryByRole('button', { name: copy.remove });
    // jsdom loads no image, so Chakra keeps it hidden; the element still says which one it is.
    const avatarImages = () => screen.queryAllByAltText('Ada');

    const pick = async (file: File) =>
      userEvent.setup({ applyAccept: false }).upload(await imageInput(), file);

    const aFile = (type = 'image/png', size = 1024) =>
      aSendableFile(`me.${type.split('/')[1]}`, type, size);

    /** Serves the session with `image` once the server has it, recording each read past the cache. */
    const serveSession = (initialImage: string | null) => {
      const state = { image: initialImage, uncachedReads: 0 };
      server.use(
        mockGetSession((request) => {
          if (new URL(request.url).searchParams.get('disableCookieCache') === 'true') {
            state.uncachedReads += 1;
          }
          return aSession({ isAnonymous: false, image: state.image });
        }),
      );
      return state;
    };

    it('shows initials, Upload image and no Remove for a user without one', async () => {
      await holdSession({ isAnonymous: false });
      await renderPage();

      expect(await screen.findByRole('button', { name: copy.upload })).toBeInTheDocument();
      expect(removeButton()).not.toBeInTheDocument();
      expect(avatarImages()).toEqual([]);
    });

    it('sits above the name in the Profile section', async () => {
      await holdSession({ isAnonymous: false });
      await renderPage();

      const label = screen.getByText(copy.label);
      expect(label.compareDocumentPosition(nameField())).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('uploads the picked file as it is, then shows it in Settings and the header', async () => {
      await holdSession({ isAnonymous: false });
      const session = serveSession(null);
      const toast = vi.spyOn(toaster, 'create');
      const sent: { type: string | null; size: number }[] = [];
      server.use(
        getUploadProfileImageMockHandler(async ({ request }) => {
          sent.push({
            type: request.headers.get('content-type'),
            size: (await request.arrayBuffer()).byteLength,
          });
          session.image = IMAGE_URL;
          return { image: IMAGE_URL };
        }),
      );
      await renderPage();

      await pick(aFile('image/webp', 2048));

      await waitFor(() => expect(avatarImages()).toHaveLength(2));
      for (const img of avatarImages()) expect(img).toHaveAttribute('src', IMAGE_URL);
      expect(sent).toEqual([{ type: 'image/webp', size: 2048 }]);
      expect(session.uncachedReads).toBe(1);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', title: copy.uploaded }),
      );
    });

    it('shows the upload as pending on the Avatar', async () => {
      await holdSession({ isAnonymous: false });
      let finish: () => void = () => {};
      server.use(
        getUploadProfileImageMockHandler(
          () =>
            new Promise((resolve) => {
              finish = () => resolve({ image: IMAGE_URL });
            }),
        ),
      );
      await renderPage();

      await pick(aFile());

      expect(await screen.findByLabelText(copy.uploading)).toBeInTheDocument();
      finish();
      await waitFor(() => expect(screen.queryByLabelText(copy.uploading)).not.toBeInTheDocument());
    });

    it.each([
      ['a file of another type', aFile('image/gif'), copy.errors.wrongType],
      ['a file over 5 MB', aFile('image/png', 5 * 1024 * 1024 + 1), copy.errors.tooLarge],
    ])('refuses %s without sending it', async (_case, file, message) => {
      await holdSession({ isAnonymous: false });
      let requests = 0;
      server.use(
        getUploadProfileImageMockHandler(() => {
          requests += 1;
          return { image: IMAGE_URL };
        }),
      );
      await renderPage();

      await pick(file);

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(requests).toBe(0);
    });

    it.each([
      [400, 'BadRequest', copy.errors.wrongType],
      [413, 'PayloadTooLarge', copy.errors.tooLarge],
      [429, 'TooManyRequests', copy.errors.rateLimited],
      [500, 'Internal', copy.errors.failed],
    ])('explains a %i from the server', async (status, error, message) => {
      await holdSession({ isAnonymous: false });
      server.use(
        mockApiError('put', API_ROUTE.profileImage, status, {
          success: false,
          error,
          message: 'from the server',
        }),
      );
      await renderPage();

      await pick(aFile());

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
    });

    it('hides Upload image while uploads are switched off', async () => {
      server.use(getGetProfileImageSettingsMockHandler({ uploadsEnabled: false }));
      await holdSession({ isAnonymous: false });
      await renderPage();

      expect(await screen.findByText(copy.label)).toBeInTheDocument();
      await waitFor(() => expect(uploadButton()).not.toBeInTheDocument());
    });

    it('removes the image, going back to initials in Settings and the header', async () => {
      await holdSession({ isAnonymous: false, image: IMAGE_URL });
      const session = serveSession(IMAGE_URL);
      const toast = vi.spyOn(toaster, 'create');
      let removals = 0;
      server.use(
        getRemoveProfileImageMockHandler(() => {
          removals += 1;
          session.image = null;
        }),
      );
      await renderPage();
      expect(avatarImages()).toHaveLength(2);

      await userEvent.click(removeButton()!);

      await waitFor(() => expect(avatarImages()).toEqual([]));
      expect(removals).toBe(1);
      expect(session.uncachedReads).toBe(1);
      expect(removeButton()).not.toBeInTheDocument();
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', title: copy.removed }),
      );
    });

    it('keeps a provider picture removable while uploads are switched off', async () => {
      server.use(getGetProfileImageSettingsMockHandler({ uploadsEnabled: false }));
      await holdSession({ isAnonymous: false, image: 'https://avatars.githubusercontent.com/u/1' });
      await renderPage();

      expect(removeButton()).toBeInTheDocument();
      for (const img of avatarImages()) {
        expect(img).toHaveAttribute('src', 'https://avatars.githubusercontent.com/u/1');
      }
    });

    it('shows a failed removal', async () => {
      await holdSession({ isAnonymous: false, image: IMAGE_URL });
      server.use(mockApiError('delete', API_ROUTE.profileImage, 500));
      await renderPage();

      await userEvent.click(removeButton()!);

      expect(await screen.findByRole('alert')).toHaveTextContent(copy.errors.failed);
      expect(avatarImages()).toHaveLength(2);
    });
  });

  describe('search keeps hidden settings as they were', () => {
    beforeEach(async () => {
      await holdSession({ isAnonymous: false });
    });

    it('keeps an unsaved name and an open password form through a search', async () => {
      await renderPage();
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
      await renderPage();

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
      await renderPage();

      await userEvent.click(screen.getByRole('button', { name: account.signOutEverywhere.action }));

      expect(await screen.findByText(CHAT_PAGE)).toBeInTheDocument();
      expect(calls).toEqual(['revoke-sessions', 'sign-out']);
    });

    it('finishes signing out when the sessions were already revoked by an earlier try', async () => {
      server.use(mockApiError('post', API_ROUTE.authRevokeSessions, 401), mockSignOut());
      await renderPage();

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
      await renderPage();

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
        await renderPage();

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
        await renderPage();

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
        await renderPage();

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
        await renderPage();

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
        await renderPage();

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
        await renderPage();

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
        await renderPage();

        const dialog = await openDeleteDialog();
        await userEvent.type(await within(dialog).findByLabelText(fields.password), 'anything');
        await confirmDelete(dialog);

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
          resources.auth.errors.noPassword,
        );
      });

      it('keeps the account when the user cancels', async () => {
        server.use(mockListAccounts(['credential']));
        await renderPage();

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
        await renderPage();

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
      await renderPage();

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
      await renderPage();
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
      await renderPage();
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
      // The page's only status region is the search's, and it has nothing to say: no in-place
      // success panel (the toast is the app's toaster, outside the page).
      expect(within(screen.getByRole('main')).getByRole('status')).toBeEmptyDOMElement();
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
      await renderPage();
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
      await renderPage();
      await openPasswordForm();

      await fillForm();
      await submit();

      await waitFor(() => expect(newPasswordField()).toHaveAccessibleErrorMessage(message));
    });

    it('says when there have been too many attempts', async () => {
      server.use(mockApiError('post', API_ROUTE.authChangePassword, 429));
      await renderPage();
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
      await renderPage();
      await openPasswordForm();

      await fillForm();
      await submit();

      expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.errors.unknown);
    });

    it('sends nothing while the confirmation does not match', async () => {
      const counter = countRequests();
      await renderPage();
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
      await renderPage();
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
      await renderPage();
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
      await renderPage();
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
      await renderPage();
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
