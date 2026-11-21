import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterAll, beforeAll, beforeEach, vi } from 'vitest';
import {
  getListUserSessionsMockHandler,
  getListUsersMockHandler,
} from '@/libs/api/generated/admin/admin.msw';
import type { AdminUserDetail } from '@/libs/api/generated/model/adminUserDetail';
import type { AdminUserSummary } from '@/libs/api/generated/model/adminUserSummary';
import { useUserActionStore } from '@/modules/admin/stores/useUserActionStore';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { aSession, mockGetSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const USER_ID = '0190a1b2-0000-7000-8000-00000000000a';

export const summary = (overrides: Partial<AdminUserSummary> = {}): AdminUserSummary => ({
  id: USER_ID,
  email: 'anna@example.com',
  name: 'Anna Nováková',
  status: 'registered',
  role: 'user',
  twoFactorEnabled: false,
  messagesSent: 1,
  sessionsCount: 1,
  createdAt: '2026-03-12T10:00:00Z',
  updatedAt: '2026-10-27T10:00:00Z',
  ...overrides,
});

export const detailOf = (overrides: Partial<AdminUserDetail> = {}): AdminUserDetail => ({
  ...summary(),
  ban: null,
  pendingDeletionAt: null,
  ...overrides,
});

/** Serves one User's detail and the Admin list the last-Admin rule reads; counts detail fetches. */
export const serve = (detail: AdminUserDetail, admins: AdminUserSummary[] = []) => {
  const fetches = { detail: 0 };
  server.use(
    getListUsersMockHandler({ users: admins, nextCursor: null, hasMore: false }),
    http.get('*/api/admin/users/:id', () => {
      fetches.detail += 1;
      return HttpResponse.json(detail);
    }),
    getListUserSessionsMockHandler({ sessions: [], nextCursor: null, hasMore: false }),
  );
  return fetches;
};

export const openPanel = async () => {
  await renderRoute(`/admin/users?selected=${USER_ID}`);
  const panel = await screen.findByRole('complementary', { name: resources.shell.inspector });
  await within(panel).findByText(resources.admin.users.actions.title);
  return panel;
};

export const button = (panel: HTMLElement, name: string) =>
  within(panel).getByRole('button', { name: new RegExp(`^${name}`) });

/** Registers the hooks every User-actions test needs: an Admin session, desktop layout, jsdom sizes. */
export const setUpAdminActionsTests = () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 900 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 40 });
  });

  afterAll(() => {
    // @ts-expect-error restores jsdom's own layout properties
    delete HTMLElement.prototype.clientHeight;
    // @ts-expect-error restores jsdom's own layout properties
    delete HTMLElement.prototype.clientWidth;
    // @ts-expect-error restores jsdom's own layout properties
    delete HTMLElement.prototype.offsetHeight;
  });

  beforeEach(() => {
    serveChatPage();
    server.use(
      mockGetSession(
        aSession({
          isAnonymous: false,
          emailVerified: true,
          role: 'admin',
          twoFactorEnabled: true,
          twoFactorVerified: true,
        }),
      ),
    );
    usePanelStore.setState({ leftOpen: true, rightOpen: true, sheetOpen: false });
    useUserActionStore.setState({ open: null });
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });
};
