import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getChangeAdminLogLevelMockHandler,
  getGetAdminLogLevelsMockHandler,
} from '@/libs/api/generated/admin/admin.msw';
import type { LogLevelReports } from '@/libs/api/generated/model/logLevelReports';
import type { LogLevelState } from '@/libs/api/generated/model/logLevelState';
import { useLogLevelFormStore } from '@/modules/admin/stores/useLogLevelFormStore';
import { resources } from '@/resources';
import { setUpAdminActionsTests } from '@/test/adminActions';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const text = resources.admin.operations;
const NOW = new Date('2026-10-27T21:42:05Z');

const atBoot = (target: LogLevelState['target'], level: LogLevelState['level'] = 'info') => ({
  target,
  level,
  expiresAt: null,
  operator: null,
});

const reportsOf = (...levels: LogLevelState[]): LogLevelReports => ({
  receivers: 1,
  reports: [{ instance: 'web-1', levels: [atBoot('root'), ...levels] }],
});

const server_ = reportsOf({
  target: 'auth',
  level: 'debug',
  expiresAt: '2026-10-27T21:53:05Z',
  operator: 'Jana K.',
});
const worker = reportsOf(atBoot('llm'));

/** Serves each service its reports and counts the reads, per service. */
const serveLevels = (reports = { server: server_, worker }) => {
  const reads = { server: 0, worker: 0 };
  server.use(
    getGetAdminLogLevelsMockHandler(({ request }) => {
      const service =
        new URL(request.url).searchParams.get('service') === 'worker' ? 'worker' : 'server';
      reads[service] += 1;
      return reports[service];
    }),
  );
  return reads;
};

const table = () => screen.findByRole('table', { name: text.logLevels.title });
const panel = () => screen.findByRole('complementary', { name: resources.shell.inspector });

setUpAdminActionsTests();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  useLogLevelFormStore.setState(useLogLevelFormStore.getInitialState());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Operations page', () => {
  it('lists each service’s root and its temporary changes, with who set them and when they revert', async () => {
    serveLevels();
    await renderRoute('/admin/operations');

    const rows = within(await table())
      .getAllByRole('row')
      .slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Server.*root.*info.*boot level/),
      expect.stringMatching(/^Server.*auth.*debug.*in 11m.*Jana K\..*Revert/),
      expect.stringMatching(/^Worker.*root.*info.*boot level/),
    ]);
    expect(screen.getByText(text.logLevels.instances('Server', 1, 1))).toBeInTheDocument();
    expect(screen.getByText(text.logLevels.instances('Worker', 1, 1))).toBeInTheDocument();
  });

  it('shows a skeleton while the levels load', async () => {
    server.use(
      getGetAdminLogLevelsMockHandler(async () => {
        await delay('infinite');
        return worker;
      }),
    );
    await renderRoute('/admin/operations');

    expect(await screen.findByRole('status', { name: text.logLevels.loading })).toBeInTheDocument();
  });

  it('applies a change from the panel, says how many instances got it, and refreshes the table', async () => {
    const reads = serveLevels();
    const bodies: unknown[] = [];
    server.use(
      getChangeAdminLogLevelMockHandler(async ({ request }) => {
        bodies.push(await request.json());
        return { receivers: 2, expiresAt: '2026-10-27T22:42:05Z' };
      }),
    );
    await renderRoute('/admin/operations');
    await table();
    const side = await panel();

    await userEvent.click(within(side).getByRole('button', { name: text.services.worker }));
    await userEvent.click(within(side).getByRole('button', { name: 'trace' }));
    await userEvent.click(within(side).getByRole('button', { name: text.panel.ttls[3600] }));
    await userEvent.click(within(side).getByRole('combobox', { name: text.panel.target }));
    await userEvent.click(await screen.findByRole('option', { name: 'llm' }));
    expect(
      within(side).getByText(text.panel.notice('worker', text.panel.ttlWords[3600])),
    ).toBeInTheDocument();
    await userEvent.click(within(side).getByRole('button', { name: text.panel.apply('Worker') }));

    await waitFor(() =>
      expect(bodies).toEqual([
        { service: 'worker', component: 'llm', level: 'trace', ttlSeconds: 3600 },
      ]),
    );
    expect(await within(side).findByText(text.panel.sent(2))).toBeInTheDocument();
    await waitFor(() => expect(reads.worker).toBe(2));
  });

  it('changes the root level when the target is root', async () => {
    serveLevels();
    const bodies: unknown[] = [];
    server.use(
      getChangeAdminLogLevelMockHandler(async ({ request }) => {
        bodies.push(await request.json());
        return { receivers: 1, expiresAt: '2026-10-27T21:57:05Z' };
      }),
    );
    await renderRoute('/admin/operations');
    const side = await panel();

    await userEvent.click(within(side).getByRole('button', { name: text.panel.apply('Server') }));

    await waitFor(() =>
      expect(bodies).toEqual([{ service: 'server', level: 'debug', ttlSeconds: 900 }]),
    );
  });

  it('reverts a temporary change, busy while it runs, then refreshes', async () => {
    const reads = serveLevels();
    const bodies: unknown[] = [];
    let release = () => undefined as void;
    server.use(
      getChangeAdminLogLevelMockHandler(async ({ request }) => {
        bodies.push(await request.json());
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return { receivers: 1, expiresAt: '2026-10-27T21:42:06Z' };
      }),
    );
    await renderRoute('/admin/operations');

    const revert = within(await table()).getByRole('button', { name: text.logLevels.revert });
    await userEvent.click(revert);

    await waitFor(() => expect(revert).toHaveAttribute('aria-busy', 'true'));
    expect(bodies).toEqual([{ service: 'server', component: 'auth', revert: true }]);
    release();
    await waitFor(() => expect(reads.server).toBe(2));
  });

  it('shows why a change was refused', async () => {
    serveLevels();
    server.use(
      mockApiError('post', API_ROUTE.adminLogLevels, 409, {
        success: false,
        error: 'Conflict',
        message: 'Nothing to revert.',
      }),
    );
    await renderRoute('/admin/operations');

    await userEvent.click(
      within(await table()).getByRole('button', { name: text.logLevels.revert }),
    );

    expect(await screen.findByText('Nothing to revert.')).toBeInTheDocument();
  });

  it('says so when a service has no instance answering', async () => {
    serveLevels({ server: server_, worker: { receivers: 0, reports: [] } });
    await renderRoute('/admin/operations');

    expect(await screen.findByText(text.logLevels.noInstance)).toBeInTheDocument();
  });

  it('is a live link in the admin nav', async () => {
    serveLevels();
    await renderRoute('/admin/operations');

    const nav = await screen.findByRole('navigation', { name: resources.admin.nav.label });
    expect(within(nav).getByRole('link', { name: resources.admin.nav.operations })).toHaveAttribute(
      'href',
      '/admin/operations',
    );
  });
});
