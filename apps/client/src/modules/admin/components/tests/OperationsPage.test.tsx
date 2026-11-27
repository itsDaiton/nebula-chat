import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getChangeAdminLogLevelMockHandler,
  getGetAdminLogLevelsMockHandler,
  getGetAdminOperationsMockHandler,
  getListAuditEntriesMockHandler,
} from '@/libs/api/generated/admin/admin.msw';
import type { LogLevelReports } from '@/libs/api/generated/model/logLevelReports';
import type { LogLevelState } from '@/libs/api/generated/model/logLevelState';
import type { Operations } from '@/libs/api/generated/model/operations';
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

const RUN_ID = '55555555-5555-4555-8555-555555555555';

const operations: Operations = {
  worker: { status: 'answering', instances: 1 },
  queues: [
    { name: 'direct-replies', waiting: 2, active: 1, delayed: 0, failed: 3 },
    { name: 'runs', waiting: 1, active: 1, delayed: 0, failed: 4 },
    { name: 'clarifying-question-timeout', waiting: 0, active: 0, delayed: 1, failed: 0 },
  ],
  failedJobs: [
    {
      id: '12',
      queue: 'runs',
      failedAt: '2026-10-27T19:04:00Z',
      attemptsMade: 3,
      error: 'ModelTimeout: the Orchestrator did not answer',
      runId: RUN_ID,
    },
    {
      id: '40',
      queue: 'direct-replies',
      failedAt: '2026-10-27T16:22:00Z',
      attemptsMade: 3,
      error: 'ProviderRateLimited: 429 from openai',
      runId: null,
    },
  ],
};

/** Serves the operations readout and counts the reads. */
const serveOperations = (body: Operations = operations) => {
  const reads = { count: 0 };
  server.use(
    getGetAdminOperationsMockHandler(() => {
      reads.count += 1;
      return body;
    }),
  );
  return reads;
};

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

  it('reverts a temporary change, busy while it runs, and refreshes once it has landed', async () => {
    const reads = serveLevels();
    const bodies: unknown[] = [];
    let release: () => void = () => undefined;
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
    expect(revert).toHaveTextContent(text.logLevels.reverting);
    expect(bodies).toEqual([{ service: 'server', component: 'auth', revert: true }]);
    release();
    // The revert expires a second after it is sent; a refresh before then would still show it.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(reads.server).toBe(1);
    await waitFor(() => expect(reads.server).toBe(2), { timeout: 3000 });
    expect(await screen.findByText(text.logLevels.reverted('Server', 'auth'))).toBeInTheDocument();
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

  it('reads the levels again once a temporary change expires, so the row goes away', async () => {
    const expiring = reportsOf({
      target: 'redis',
      level: 'trace',
      expiresAt: '2026-10-27T21:42:06Z',
      operator: 'Jana K.',
    });
    const reads = serveLevels({ server: expiring, worker });
    await renderRoute('/admin/operations');
    expect(await within(await table()).findByText('redis')).toBeInTheDocument();

    serveLevels({ server: reportsOf(), worker });

    await waitFor(() => expect(screen.queryByText('redis')).not.toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(reads.worker).toBe(1);
  });

  it('reverts a temporary root level without naming a component', async () => {
    serveLevels({
      server: server_,
      worker: {
        receivers: 1,
        reports: [
          {
            instance: 'wrk-1',
            levels: [
              {
                target: 'root',
                level: 'trace',
                expiresAt: '2026-10-27T21:46:05Z',
                operator: 'Ada L.',
              },
            ],
          },
        ],
      },
    });
    const bodies: unknown[] = [];
    server.use(
      getChangeAdminLogLevelMockHandler(async ({ request }) => {
        bodies.push(await request.json());
        return { receivers: 1, expiresAt: '2026-10-27T21:42:06Z' };
      }),
    );
    await renderRoute('/admin/operations');

    const workerRoot = within(await table()).getByRole('row', { name: /^Worker\s*root\s*trace/ });
    await userEvent.click(within(workerRoot).getByRole('button', { name: text.logLevels.revert }));

    await waitFor(() => expect(bodies).toEqual([{ service: 'worker', revert: true }]));
  });

  it('says so when a service has no instance answering', async () => {
    serveLevels({ server: server_, worker: { receivers: 0, reports: [] } });
    await renderRoute('/admin/operations');

    expect(await screen.findByText(text.logLevels.noInstance)).toBeInTheDocument();
  });

  it('starts the panel from the defaults again after leaving the page', async () => {
    serveLevels();
    server.use(
      getListAuditEntriesMockHandler({ entries: [], nextCursor: null, hasMore: false, total: 0 }),
    );
    const { router } = await renderRoute('/admin/operations');
    await userEvent.click(
      within(await panel()).getByRole('button', { name: text.services.worker }),
    );

    await router.navigate({ to: '/admin/audit' });
    await router.navigate({ to: '/admin/operations' });

    expect(
      within(await panel()).getByRole('button', { name: text.panel.apply('Server') }),
    ).toBeInTheDocument();
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

describe('Operations page, worker and queues', () => {
  const tile = (label: string) => screen.findByRole('group', { name: label });

  it('shows the worker, waiting and failed tiles from the queue counts', async () => {
    serveLevels();
    serveOperations();
    await renderRoute('/admin/operations');

    const workerTile = await tile(text.tiles.worker);
    expect(within(workerTile).getByText(text.worker.answering)).toBeInTheDocument();
    expect(within(workerTile).getByText(text.worker.instances(1))).toBeInTheDocument();
    expect(within(await tile(text.tiles.waiting)).getByText('3')).toBeInTheDocument();
    expect(within(await tile(text.tiles.failed)).getByText('7')).toBeInTheDocument();
  });

  it('lists each queue’s counts, with the note that they are what Redis holds now', async () => {
    serveLevels();
    serveOperations();
    await renderRoute('/admin/operations');

    const queues = await screen.findByRole('table', { name: text.queues.title });
    expect(
      within(queues)
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.textContent),
    ).toEqual(['direct-replies2103', 'runs1104', 'clarifying-question-timeout0010']);
    expect(screen.getByText(text.queues.note)).toBeInTheDocument();
  });

  it('shows a worker that is not answering as a state', async () => {
    serveLevels();
    serveOperations({ ...operations, worker: { status: 'not_answering', instances: 0 } });
    await renderRoute('/admin/operations');

    const workerTile = await tile(text.tiles.worker);
    expect(within(workerTile).getByText(text.worker.notAnswering)).toBeInTheDocument();
    expect(within(workerTile).getByText(text.worker.instances(0))).toBeInTheDocument();
  });

  it('links a failed job to its Run, and gives a job without one a dash', async () => {
    serveLevels();
    serveOperations();
    await renderRoute('/admin/operations');

    const failed = await screen.findByRole('table', { name: text.failedJobs.title });
    const [runJob, replyJob] = within(failed).getAllByRole('row').slice(1);
    expect(runJob).toHaveTextContent(/runs.*3.*ModelTimeout: the Orchestrator did not answer/);
    expect(within(runJob!).getByRole('link', { name: text.failedJobs.openRun })).toHaveAttribute(
      'href',
      `/admin/runs?selected=${RUN_ID}`,
    );
    expect(replyJob).toHaveTextContent(/direct-replies.*3.*ProviderRateLimited.*—/);
    expect(within(replyJob!).queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows tile skeletons while the readout loads', async () => {
    serveLevels();
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      getGetAdminOperationsMockHandler(async () => {
        await held;
        return operations;
      }),
    );
    await renderRoute('/admin/operations');

    expect(await screen.findByRole('status', { name: text.loading })).toBeInTheDocument();
    release();
    await tile(text.tiles.worker);
    expect(screen.queryByRole('status', { name: text.loading })).not.toBeInTheDocument();
  });

  it('says when there are no failed jobs', async () => {
    serveLevels();
    serveOperations({ ...operations, failedJobs: [] });
    await renderRoute('/admin/operations');

    expect(await screen.findByText(text.failedJobs.empty)).toBeInTheDocument();
  });

  it('reads the readout again on Refresh, and never on its own', async () => {
    serveLevels();
    const reads = serveOperations();
    await renderRoute('/admin/operations');
    await tile(text.tiles.worker);
    expect(reads.count).toBe(1);

    await userEvent.click(screen.getByRole('button', { name: text.refresh }));

    await waitFor(() => expect(reads.count).toBe(2));
    expect(screen.getByText(text.updated('21:42:05'))).toBeInTheDocument();
  });

  it('shows the readout as unavailable when Redis does not answer', async () => {
    serveLevels();
    server.use(
      mockApiError('get', API_ROUTE.adminOperations, 503, {
        success: false,
        error: 'Unavailable',
        message: 'Redis did not answer, so the queues cannot be read.',
      }),
    );
    await renderRoute('/admin/operations');

    expect(await screen.findByText(text.unavailable)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: text.queues.title })).not.toBeInTheDocument();
    expect(await table()).toBeInTheDocument();
  });
});
