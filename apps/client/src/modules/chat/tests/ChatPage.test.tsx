import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCreateSessionMockHandler,
  getGetSessionMockHandler,
  getListSessionsMockHandler,
  getRestoreSessionMockHandler,
} from '@/libs/api/generated/sessions/sessions.msw';
import {
  getGetMessageAllowanceMockHandler,
  getSendMessageMockHandler,
} from '@/libs/api/generated/chat/chat.msw';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { IDLE_REPLY, isReplyInFlight } from '@/modules/chat/utils/replyState';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useModelStore } from '@/modules/chat/stores/useModelStore';
import { toast as sonner } from 'sonner';
import { resources } from '@/resources';
import { renderRoute } from '@/test/renderRoute';
import { API_ROUTE, mockApiError } from '@/test/api';
import { aMeteredAllowance } from '@/test/allowance';
import { aSession, holdSession, mockGetSession } from '@/test/auth';
import { mockReplyStream, sseFrame } from '@/test/chat';
import { server } from '@/test/msw';

vi.mock('@/shared/hooks/useThemeMode', () => ({
  useThemeMode: () => ({ themeMode: 'light', toggleThemeMode: vi.fn() }),
}));

const layout = vi.hoisted(() => ({
  isMobile: false,
  showSidePanels: true,
  showRightPanel: false,
}));
vi.mock('@/shared/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => layout }));

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const aChatSession = (id: string, title: string) => ({
  id,
  title,
  createdAt: '2026-06-15T11:00:00.000Z',
  archived: false,
  archivedAt: null,
  messageCount: 0,
});

const aMessage = (id: string, role: string, content: string) => ({
  id,
  sessionId: SESSION_ID,
  role,
  content,
  tokenCount: null,
  cached: false,
  model: null,
  estimatedCostUsd: null,
  runId: null,
  contextTokens: null,
  contextMessages: null,
  createdAt: '2026-06-15T11:00:00.000Z',
});

const serveSessions = (...sessions: ReturnType<typeof aChatSession>[]) =>
  server.use(getListSessionsMockHandler({ sessions, nextCursor: null, hasMore: false }));

const renderPage = (path = '/') => renderRoute(path);

beforeEach(() => {
  vi.restoreAllMocks();
  useModelStore.setState({ selectedModel: 'gpt-4o-mini' });
  serveSessions();
  server.use(
    mockGetSession(aSession()),
    getGetSessionMockHandler({
      ...aChatSession(SESSION_ID, 'Chat'),
      activeStreamId: null,
      waitingRun: null,
    }),
    getListMessagesMockHandler([]),
    getGetMessageAllowanceMockHandler({ metered: false }),
  );
  useMessageStore.setState({ message: '', isRunMode: false });
  useChatStreamStore.setState({
    history: [],
    reply: IDLE_REPLY,
    usage: null,
    sessionId: undefined,
    streamId: null,
    cancelledRunId: null,
  });
});

describe('ChatPage', () => {
  it('welcomes the user on a brand new chat', async () => {
    await renderPage();

    expect(
      await screen.findByRole('textbox', { name: resources.chat.composer.label }),
    ).toBeInTheDocument();
  });

  it('renders the composer', async () => {
    await renderPage();

    expect(
      await screen.findByRole('textbox', { name: resources.chat.composer.label }),
    ).toBeInTheDocument();
  });

  it('lists the sessions the API returns on a desktop layout', async () => {
    serveSessions(aChatSession('a', 'Earlier chat'));

    await renderPage();

    expect(await screen.findByText('Earlier chat')).toBeInTheDocument();
  });

  it('shows the empty-list hint when there are no sessions', async () => {
    await renderPage();

    expect(await screen.findByText(resources.sessions.empty)).toBeInTheDocument();
  });

  it('shows loading skeletons while sessions load', async () => {
    server.use(
      getListSessionsMockHandler(async () => {
        await delay('infinite');
        return { sessions: [], nextCursor: null, hasMore: false };
      }),
    );

    const { container } = await renderPage();

    await waitFor(() =>
      expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0),
    );
  });

  it('shows the error in the sidebar when the sessions fail to load', async () => {
    server.use(
      mockApiError('get', API_ROUTE.sessions, 401, {
        success: false,
        error: 'Unauthorized',
        message: 'No authenticated session',
      }),
    );

    await renderPage();

    expect(await screen.findByText('No authenticated session')).toBeInTheDocument();
  });

  it('renders the messages of an open session', async () => {
    server.use(
      getListMessagesMockHandler([
        aMessage('m1', 'user', 'a question'),
        aMessage('m2', 'assistant', 'an answer'),
      ]),
    );

    await renderPage(`/s/${SESSION_ID}`);

    expect(await screen.findByText('a question', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('an answer')).toBeInTheDocument();
  });

  it("starts a chat on the catalog's default when the remembered Model is no longer listed", async () => {
    useModelStore.setState({ selectedModel: 'retired-model' });

    await renderPage();

    expect(await screen.findByRole('button', { name: /GPT-4o mini/ })).toBeInTheDocument();
  });

  it('shows how each loaded reply was made, and nothing for user and older Messages', async () => {
    const reply = (id: string, meta: object) => ({ ...aMessage(id, 'assistant', id), ...meta });
    server.use(
      getListMessagesMockHandler([
        aMessage('m1', 'user', 'a question'),
        reply('direct', { model: 'gpt-4.1', estimatedCostUsd: 0.0123 }),
        reply('replay', { model: 'gpt-4.1', estimatedCostUsd: 0, cached: true }),
        reply('run', { runId: 'run-1', estimatedCostUsd: 0.5 }),
        reply('legacy', {}),
      ]),
    );

    await renderPage(`/s/${SESSION_ID}`);

    await screen.findByText('direct');
    await screen.findAllByText('GPT-4.1');
    const rows = Object.fromEntries(
      ['m1', 'direct', 'replay', 'run', 'legacy'].map((id) => {
        const text = id === 'm1' ? 'a question' : id;
        const row = screen.getByText(text).closest('.group\\/message');
        return [id, row?.querySelector('[data-slot="message-meta-row"]')?.textContent ?? ''];
      }),
    );
    expect(rows.direct).toContain('GPT-4.1');
    expect(rows.direct).toContain(resources.chat.meta.cost(0.0123));
    expect(rows.replay).toContain(resources.chat.meta.cost(0));
    expect(rows.run).toContain(resources.chat.meta.run);
    expect(rows.run).not.toContain('GPT-4.1');
    expect(rows.legacy).not.toMatch(/~\$|GPT/);
    expect(rows.m1).not.toMatch(/~\$|GPT/);
  });

  it('re-attaches to a reply still streaming when the session is opened mid-reply', async () => {
    const STREAM_ID = '33333333-3333-4333-8333-333333333333';
    let opened: unknown;
    server.use(
      getGetSessionMockHandler({
        ...aChatSession(SESSION_ID, 'Chat'),
        activeStreamId: STREAM_ID,
        waitingRun: null,
      }),
      getListMessagesMockHandler([aMessage('m1', 'user', 'what is 2+2?')]),
      http.get(API_ROUTE.replyStream, ({ params }) => {
        opened = params['streamId'];
        return new HttpResponse(
          sseFrame('token', { token: 'Two plus two' }, '1-1') +
            sseFrame('token', { token: ' is four' }, '1-2') +
            sseFrame('end', {}, '1-3'),
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }),
    );

    await renderPage(`/s/${SESSION_ID}`);

    expect(
      await screen.findByText('Two plus two is four', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('what is 2+2?')).toBeInTheDocument();
    expect(opened).toBe(STREAM_ID);
  });

  it('surfaces a session load failure inline and through a toast', async () => {
    const toast = vi.spyOn(sonner, 'error');
    server.use(
      mockApiError('get', API_ROUTE.session, 404, {
        success: false,
        error: 'NotFound',
        message: 'Session not found',
      }),
    );

    await renderPage(`/s/${SESSION_ID}`);

    expect(
      await screen.findByText(resources.sessions.single.error, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Session not found', { selector: 'p' })).toBeInTheDocument();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(resources.errors.title, {
      description: 'Session not found',
    });
  });

  it('shows a session created by a reply in the sidebar without a refresh', async () => {
    let created = false;
    server.use(
      getListSessionsMockHandler(() => ({
        sessions: created ? [aChatSession(SESSION_ID, 'Brand new chat')] : [],
        nextCursor: null,
        hasMore: false,
      })),
      getCreateSessionMockHandler(() => {
        created = true;
        return {
          id: SESSION_ID,
          title: 'Brand new chat',
          createdAt: '2026-10-20T00:00:00.000Z',
          archived: false,
          archivedAt: null,
          messageCount: 0,
        };
      }),
      getSendMessageMockHandler({
        messageId: '22222222-2222-4222-8222-222222222222',
        streamId: '33333333-3333-4333-8333-333333333333',
      }),
      mockReplyStream(sseFrame('token', { token: 'hi there' }), sseFrame('end', {})),
    );
    await renderPage();
    expect(await screen.findByText(resources.sessions.empty)).toBeInTheDocument();

    await userEvent.type(
      screen.getByRole('textbox', { name: resources.chat.composer.label }),
      'hello{Enter}',
    );

    expect(await screen.findByText('Brand new chat')).toBeInTheDocument();
  });

  it('fills the composer from a starter prompt', async () => {
    await holdSession({ isAnonymous: false, emailVerified: true });
    await renderPage();
    const pool: string[] = resources.chat.starters.map(({ prompt }) => prompt);
    const starter = (await screen.findAllByRole('button')).find((button) =>
      pool.includes(button.textContent ?? ''),
    );

    await userEvent.click(starter!);
    const prompt = starter!.textContent;

    expect(screen.getByRole('textbox', { name: resources.chat.composer.label })).toHaveValue(
      prompt,
    );
  });

  it('adds a newline on Shift+Enter and sends on Enter', async () => {
    let sends = 0;
    server.use(
      getCreateSessionMockHandler(aChatSession(SESSION_ID, 'hello')),
      getSendMessageMockHandler(() => {
        sends += 1;
        return {
          messageId: '22222222-2222-4222-8222-222222222222',
          streamId: '33333333-3333-4333-8333-333333333333',
        };
      }),
      mockReplyStream(sseFrame('token', { token: 'hi' }), sseFrame('end', {})),
    );
    await renderPage();
    const box = await screen.findByRole('textbox', { name: resources.chat.composer.label });

    await userEvent.type(box, 'one{Shift>}{Enter}{/Shift}two');

    expect(box).toHaveValue('one\ntwo');
    expect(sends).toBe(0);

    await userEvent.type(box, '{Enter}');

    await waitFor(() => expect(sends).toBe(1));
  });

  it('keeps the same composer mounted when the thread replaces the empty state', async () => {
    // A remount unsubscribes the allowance footer, which cancels the allowance check the send is awaiting.
    server.use(
      getCreateSessionMockHandler(aChatSession(SESSION_ID, 'hello')),
      getSendMessageMockHandler({
        messageId: '22222222-2222-4222-8222-222222222222',
        streamId: '33333333-3333-4333-8333-333333333333',
      }),
      mockReplyStream(sseFrame('token', { token: 'hi' }), sseFrame('end', {})),
    );
    await renderPage();
    const box = await screen.findByRole('textbox', { name: resources.chat.composer.label });

    await userEvent.type(box, 'hello{Enter}');
    expect(await screen.findByText('hello')).toBeInTheDocument();

    expect(box).toBeInTheDocument();
  });

  it('shows the Run toggle disabled, and the allowance counter under the composer', async () => {
    await holdSession({ isAnonymous: true });
    server.use(mockGetSession(aSession()), getGetMessageAllowanceMockHandler(aMeteredAllowance(3)));
    await renderPage();

    expect(await screen.findByText('3 of 10 messages left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: resources.chat.run.label })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  describe('Runs', () => {
    const RUN_ID = '55555555-5555-4555-8555-555555555555';
    const STREAM_ID = '33333333-3333-4333-8333-333333333333';
    const { run: text } = resources.chat;

    const stepStarted = (stepId: string, label: string, over: Record<string, unknown> = {}) =>
      sseFrame('step-started', {
        stepId,
        attempt: 1,
        phase: 'intake',
        agent: 'language',
        label,
        turn: 0,
        parentStepId: null,
        ...over,
      });

    const aPartialRun = () =>
      mockReplyStream(
        stepStarted('s1', 'Detecting the language'),
        stepStarted('s2', 'Summarising the Session', { agent: 'session' }),
        sseFrame('step-finished', { stepId: 's1', status: 'failed' }),
        sseFrame('step-finished', { stepId: 's2', status: 'completed' }),
        stepStarted('s3', 'Writing the answer', { phase: 'output', agent: 'output' }),
        sseFrame('token', { token: 'Keep BullMQ.' }),
        sseFrame('step-finished', { stepId: 's3', status: 'completed' }),
        sseFrame('run-finished', { runId: RUN_ID, status: 'partial' }),
        sseFrame('end', {}),
      );

    // Every send the page makes, in order.
    const serveSends = () => {
      const sent: unknown[] = [];
      server.use(
        getSendMessageMockHandler(async ({ request }) => {
          const body = (await request.json()) as { mode: string };
          sent.push(body);
          return {
            messageId: '22222222-2222-4222-8222-222222222222',
            streamId: STREAM_ID,
            ...(body.mode === 'run' ? { runId: RUN_ID } : {}),
          };
        }),
      );
      return sent;
    };

    const composer = () => screen.getByRole('textbox', { name: resources.chat.composer.label });
    // The Inspector's Run tab carries the same name, so the toggle is found in the composer.
    const runToggle = () =>
      within(composer().closest('form')!).getByRole('button', { name: text.label });

    it('lets a Registered user send one message as a Run, then goes back to Direct replies', async () => {
      await holdSession({ isAnonymous: false, emailVerified: true });
      const sent = serveSends();
      server.use(aPartialRun());
      await renderPage(`/s/${SESSION_ID}`);
      await screen.findByRole('textbox', { name: resources.chat.composer.label });

      await userEvent.click(runToggle());
      expect(runToggle()).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText(text.modelHint)).toBeInTheDocument();

      await userEvent.type(composer(), 'keep BullMQ?{Enter}');

      const progress = await screen.findByRole('region', { name: text.progress });
      expect(await screen.findByText('Keep BullMQ.')).toBeInTheDocument();
      const rows = within(progress)
        .getAllByRole('listitem')
        .map((row) => [row.textContent, within(row).getByRole('img').getAttribute('aria-label')]);
      expect(rows).toEqual([
        [`Detecting the language${text.stepFailed}`, 'Failed'],
        ['Summarising the Session', 'Completed'],
        ['Writing the answeroutput', 'Completed'],
      ]);
      expect(within(progress).getByText('partial')).toBeInTheDocument();
      expect(screen.getByText(text.intakeFailed)).toBeInTheDocument();
      expect(runToggle()).toHaveAttribute('aria-pressed', 'false');
      await waitFor(() => expect(screen.queryByText(text.modelHint)).not.toBeInTheDocument());

      await userEvent.type(composer(), 'and now?{Enter}');

      await waitFor(() => expect(sent).toHaveLength(2));
      expect(sent).toMatchObject([
        { content: 'keep BullMQ?', mode: 'run' },
        { content: 'and now?', mode: 'direct' },
      ]);
    });

    it('lets a Registered user who has not verified their email start a Run', async () => {
      await holdSession({ isAnonymous: false, emailVerified: false });
      const sent = serveSends();
      server.use(aPartialRun(), getGetMessageAllowanceMockHandler(aMeteredAllowance(4)));
      await renderPage(`/s/${SESSION_ID}`);
      await screen.findByText('4 of 10 messages left');

      await userEvent.click(runToggle());
      await userEvent.type(composer(), 'keep BullMQ?{Enter}');

      await waitFor(() => expect(sent).toMatchObject([{ mode: 'run' }]));
    });

    it('never sends a Run for a Guest, whose toggle explains that registering unlocks it', async () => {
      await holdSession({ isAnonymous: true });
      const sent = serveSends();
      server.use(mockReplyStream(sseFrame('end', {})));
      // Run mode left on by a Registered user who then signed out.
      useMessageStore.setState({ isRunMode: true });
      await renderPage(`/s/${SESSION_ID}`);
      await screen.findByRole('textbox', { name: resources.chat.composer.label });

      expect(runToggle()).toHaveAttribute('aria-disabled', 'true');
      await userEvent.hover(runToggle());
      expect(await screen.findByText(text.guest)).toBeInTheDocument();

      await userEvent.type(composer(), 'hello{Enter}');

      await waitFor(() => expect(sent).toMatchObject([{ content: 'hello', mode: 'direct' }]));
    });

    it('reports a refused Run and keeps what the user typed', async () => {
      await holdSession({ isAnonymous: false, emailVerified: true });
      const toast = vi.spyOn(sonner, 'error');
      server.use(
        mockApiError('post', API_ROUTE.sendMessage, 403, {
          success: false,
          error: 'Forbidden',
          message: 'Runs are for registered users.',
        }),
      );
      await renderPage(`/s/${SESSION_ID}`);
      await screen.findByRole('textbox', { name: resources.chat.composer.label });

      await userEvent.click(runToggle());
      await userEvent.type(composer(), 'keep BullMQ?{Enter}');

      await waitFor(() => expect(toast).toHaveBeenCalledWith('Runs are for registered users.'));
      expect(composer()).toHaveValue('keep BullMQ?');
    });

    const turnStep = (stepId: string, turn: number) =>
      stepStarted(stepId, 'Planning the work', {
        phase: 'orchestrator',
        agent: 'orchestrator',
        turn,
      });
    const delegate = (stepId: string, agent: string, label: string, turn: number, parent: string) =>
      stepStarted(stepId, label, { phase: 'delegate', agent, turn, parentStepId: parent });
    const stepDone = (stepId: string, status = 'completed') =>
      sseFrame('step-finished', { stepId, status });

    // Intake, a turn of two delegates, a turn whose critic fails, then the answer starts.
    const orchestratedSteps = [
      stepStarted('s1', 'Detecting the language'),
      stepDone('s1'),
      turnStep('p1', 1),
      delegate('a1', 'analyst', 'Analysing', 1, 'p1'),
      delegate('c1', 'critic', 'Reviewing', 1, 'p1'),
      stepDone('c1'),
      stepDone('a1'),
      stepDone('p1'),
      turnStep('p2', 2),
      delegate('c2', 'critic', 'Reviewing', 2, 'p2'),
      stepDone('c2', 'failed'),
      stepDone('p2'),
      stepStarted('out', 'Writing the answer', { phase: 'output', agent: 'output' }),
      sseFrame('token', { token: 'Keep BullMQ' }),
    ];

    const groupRows = (progress: HTMLElement, name: string) =>
      within(within(progress).getByRole('group', { name }))
        .getAllByRole('listitem')
        .map((row) => [row.textContent, within(row).getByRole('img').getAttribute('aria-label')]);

    const sendRun = async () => {
      await holdSession({ isAnonymous: false, emailVerified: true });
      serveSends();
      await renderPage(`/s/${SESSION_ID}`);
      await screen.findByRole('textbox', { name: resources.chat.composer.label });
      await userEvent.click(runToggle());
      await userEvent.type(composer(), 'keep BullMQ?{Enter}');
      return screen.findByRole('region', { name: text.progress });
    };

    it('groups a Run by Orchestrator turn, with each delegate under its turn, and says why it ended partial', async () => {
      server.use(
        mockReplyStream(
          ...orchestratedSteps,
          stepDone('out'),
          sseFrame('run-finished', { runId: RUN_ID, status: 'partial' }),
          sseFrame('end', {}),
        ),
      );

      const progress = await sendRun();

      expect(await screen.findByText('Keep BullMQ')).toBeInTheDocument();
      expect(
        within(progress)
          .getAllByRole('group')
          .map((group) => group.getAttribute('aria-label')),
      ).toEqual(['Intake', 'Turn 1', 'Turn 2', 'Answer']);
      expect(groupRows(progress, 'Turn 1')).toEqual([
        ['Planning the workorchestrator', 'Completed'],
        ['Analysinganalyst', 'Completed'],
        ['Reviewingcritic', 'Completed'],
      ]);
      expect(groupRows(progress, 'Turn 2')).toEqual([
        ['Planning the workorchestrator', 'Completed'],
        [`Reviewingcritic${text.stepFailed}`, 'Failed'],
      ]);
      expect(await screen.findByRole('note')).toHaveTextContent(
        'Partial answer. Reviewing (critic) failed in turn 2, so the answer was written without it.',
      );
    });

    it('stops a Run from the composer, keeping its Steps and the answer so far, and says it was cancelled', async () => {
      let endIt: () => void = () => undefined;
      server.use(
        http.get(API_ROUTE.replyStream, () => {
          const encoder = new TextEncoder();
          return new HttpResponse(
            new ReadableStream({
              start(controller) {
                controller.enqueue(encoder.encode(orchestratedSteps.join('')));
                endIt = () => {
                  controller.enqueue(
                    encoder.encode(
                      sseFrame('run-finished', { runId: RUN_ID, status: 'cancelled' }) +
                        sseFrame('end', { reason: 'cancelled' }),
                    ),
                  );
                  controller.close();
                };
              },
            }),
            { headers: { 'Content-Type': 'text/event-stream' } },
          );
        }),
        http.post(`${API_ROUTE.replyStream}/cancel`, () => {
          endIt();
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const progress = await sendRun();
      expect(await screen.findByText('Keep BullMQ')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: resources.chat.stopReply }));

      expect(await screen.findByRole('note')).toHaveTextContent(
        'Run cancelled. It was stopped before it finished. The Steps it had completed are kept.',
      );
      expect(screen.getByText('Keep BullMQ')).toBeInTheDocument();
      expect(within(progress).getByText('cancelled')).toBeInTheDocument();
      expect(groupRows(progress, 'Turn 1')).toHaveLength(3);
      expect(groupRows(progress, 'Answer')).toEqual([
        ['Writing the answeroutput', text.stepUnfinished],
      ]);
    });

    it('shows the Steps of a Run still in flight when its Session is opened', async () => {
      server.use(
        getGetSessionMockHandler({
          ...aChatSession(SESSION_ID, 'Chat'),
          activeStreamId: STREAM_ID,
          waitingRun: null,
        }),
        getListMessagesMockHandler([aMessage('m1', 'user', 'keep BullMQ?')]),
        aPartialRun(),
      );

      await renderPage(`/s/${SESSION_ID}`);

      const progress = await screen.findByRole(
        'region',
        { name: text.progress },
        { timeout: 3000 },
      );
      expect(await within(progress).findByText('Writing the answer')).toBeInTheDocument();
      expect(within(progress).getByText('Detecting the language')).toBeInTheDocument();
      expect(await screen.findByText('Keep BullMQ.')).toBeInTheDocument();
    });
  });

  describe('a Run waiting on a Clarifying question', () => {
    const RUN_ID = '55555555-5555-4555-8555-555555555555';
    const QUESTION_STREAM_ID = '33333333-3333-4333-8333-333333333333';
    const ANSWER_STREAM_ID = '88888888-8888-4888-8888-888888888888';
    const { clarify } = resources.chat;

    const serveSession = (waiting: boolean) =>
      server.use(
        getGetSessionMockHandler({
          ...aChatSession(SESSION_ID, 'Trip'),
          activeStreamId: null,
          waitingRun: waiting
            ? { id: RUN_ID, streamId: QUESTION_STREAM_ID, stepsCompleted: 4 }
            : null,
        }),
      );

    const composer = () => screen.getByRole('textbox', { name: resources.chat.composer.label });
    const runToggle = () =>
      within(composer().closest('form')!).getByRole('button', { name: resources.chat.run.label });

    const openWaitingSession = async () => {
      await holdSession({ isAnonymous: false, emailVerified: true });
      serveSession(true);
      server.use(
        getListMessagesMockHandler([
          aMessage('m1', 'user', 'Plan me a trip'),
          { ...aMessage('m2', 'assistant', 'Which month are you going?'), runId: RUN_ID },
        ]),
      );
      await renderPage(`/s/${SESSION_ID}`);
      return screen.findByText(clarify.label);
    };

    it('shows the question, that the Run waits for the answer, and how many Steps it has done', async () => {
      await openWaitingSession();

      expect(screen.getByText('Which month are you going?')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: resources.chat.run.progress })).toHaveTextContent(
        'Runwaiting for you · 4 Steps done',
      );
      expect(screen.getByText(clarify.waitingTitle)).toBeInTheDocument();
      expect(screen.getByText(clarify.waitingNote)).toBeInTheDocument();
      expect(screen.getByText(clarify.answerHint)).toBeInTheDocument();
    });

    it('takes the next message as the answer: no Run toggle, and the picker is dimmed', async () => {
      await openWaitingSession();

      expect(runToggle()).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByText(resources.chat.run.modelHint)).toBeInTheDocument();
    });

    it('cancels the waiting Run on its question stream, and stops asking', async () => {
      const cancelled: string[] = [];
      server.use(
        http.post(`${API_ROUTE.replyStream}/cancel`, ({ params }) => {
          cancelled.push(String(params.streamId));
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await openWaitingSession();

      await userEvent.click(screen.getByRole('button', { name: clarify.cancel }));

      await waitFor(() => expect(screen.queryByText(clarify.answerHint)).not.toBeInTheDocument());
      expect(cancelled).toEqual([QUESTION_STREAM_ID]);
      expect(screen.queryByText(clarify.waitingTitle)).not.toBeInTheDocument();
      expect(screen.getByText('Which month are you going?')).toBeInTheDocument();
      expect(runToggle()).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('sends the next message as the answer and shows the resumed Run, no longer waiting', async () => {
      const sent: unknown[] = [];
      server.use(
        getSendMessageMockHandler(async ({ request }) => {
          sent.push(await request.json());
          serveSession(false);
          return {
            messageId: '22222222-2222-4222-8222-222222222222',
            streamId: ANSWER_STREAM_ID,
            runId: RUN_ID,
          };
        }),
        mockReplyStream(
          sseFrame('step-started', {
            stepId: 'out',
            attempt: 1,
            phase: 'output',
            agent: 'output',
            label: 'Writing the answer',
            turn: 0,
            parentStepId: null,
          }),
          sseFrame('token', { token: 'Go in September.' }),
          sseFrame('step-finished', { stepId: 'out', status: 'completed' }),
          sseFrame('run-finished', { runId: RUN_ID, status: 'completed' }),
          sseFrame('end', {}),
        ),
      );
      await openWaitingSession();

      await userEvent.type(composer(), 'Mid-September{Enter}');

      expect(await screen.findByText('Go in September.')).toBeInTheDocument();
      expect(sent).toMatchObject([{ content: 'Mid-September' }]);
      await waitFor(() => expect(screen.queryByText(clarify.answerHint)).not.toBeInTheDocument());
      expect(screen.queryByText(clarify.waitingTitle)).not.toBeInTheDocument();
      expect(screen.getByText('Which month are you going?')).toBeInTheDocument();
    });
  });

  describe('when the first reply of a new chat fails', () => {
    const PROVIDER_ERROR = 'The model provider rejected the request';

    const serveFailedFirstReply = (onCreate = vi.fn()) => {
      server.use(
        getCreateSessionMockHandler(() => {
          onCreate();
          return aChatSession(SESSION_ID, 'hello');
        }),
        getSendMessageMockHandler({
          messageId: '22222222-2222-4222-8222-222222222222',
          streamId: '33333333-3333-4333-8333-333333333333',
        }),
        mockReplyStream(
          sseFrame('error', { success: false, error: 'Internal', message: PROVIDER_ERROR }),
          sseFrame('end', {}),
        ),
      );
      return onCreate;
    };

    it('keeps the message and shows the error where the reply would be, not the greeting', async () => {
      serveFailedFirstReply();
      await renderPage();

      await userEvent.type(
        await screen.findByRole('textbox', { name: resources.chat.composer.label }),
        'hello{Enter}',
      );

      expect(await screen.findByText(PROVIDER_ERROR)).toBeInTheDocument();
      expect(screen.getByText('hello', { selector: 'p, div, span' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    });

    it('keeps the error once the Session it created has loaded', async () => {
      serveFailedFirstReply();
      server.use(getListMessagesMockHandler([aMessage('m1', 'user', 'hello')]));
      await renderPage();

      await userEvent.type(
        await screen.findByRole('textbox', { name: resources.chat.composer.label }),
        'hello{Enter}',
      );
      await screen.findByText(PROVIDER_ERROR);

      await waitFor(() => expect(isReplyInFlight(useChatStreamStore.getState().reply)).toBe(false));
      expect(screen.getByText(PROVIDER_ERROR)).toBeInTheDocument();
      expect(screen.queryByText(resources.chat.emptySession)).not.toBeInTheDocument();
    });

    it('continues the Session the failed attempt created instead of starting another', async () => {
      const onCreate = serveFailedFirstReply();
      await renderPage();
      await userEvent.type(
        await screen.findByRole('textbox', { name: resources.chat.composer.label }),
        'hello{Enter}',
      );
      await screen.findByText(PROVIDER_ERROR);
      await waitFor(() => expect(isReplyInFlight(useChatStreamStore.getState().reply)).toBe(false));

      await userEvent.type(
        screen.getByRole('textbox', { name: resources.chat.composer.label }),
        'again{Enter}',
      );

      expect(await screen.findByText('again')).toBeInTheDocument();
      await waitFor(() => expect(screen.getAllByText(PROVIDER_ERROR)).toHaveLength(2));
      expect(onCreate).toHaveBeenCalledTimes(1);
    });
  });

  it('renders on a mobile layout without the side panels', async () => {
    layout.isMobile = true;
    layout.showSidePanels = false;

    await renderPage();

    expect(
      await screen.findByRole('textbox', { name: resources.chat.composer.label }),
    ).toBeInTheDocument();

    layout.isMobile = false;
    layout.showSidePanels = true;
  });

  describe('an archived Session', () => {
    const serveArchived = () =>
      server.use(
        getGetSessionMockHandler({
          ...aChatSession(SESSION_ID, 'Chat'),
          archived: true,
          archivedAt: '2026-06-16T11:00:00.000Z',
          messageCount: 0,
          activeStreamId: null,
          waitingRun: null,
        }),
        getListMessagesMockHandler([aMessage('m1', 'user', 'An old question')]),
      );

    it('reads without a composer, and offers Restore in its place', async () => {
      serveArchived();

      await renderPage(`/s/${SESSION_ID}`);

      expect(await screen.findByText('An old question')).toBeInTheDocument();
      expect(screen.getByText(resources.settings.archived.notice)).toBeInTheDocument();
      expect(screen.getByText(resources.settings.archived.bar)).toBeInTheDocument();
      expect(screen.queryByLabelText(resources.chat.composer.label)).not.toBeInTheDocument();
    });

    it('brings the composer back once restored', async () => {
      serveArchived();
      server.use(
        getRestoreSessionMockHandler(() => {
          server.use(
            getGetSessionMockHandler({
              ...aChatSession(SESSION_ID, 'Chat'),
              activeStreamId: null,
              waitingRun: null,
            }),
          );
          return aChatSession(SESSION_ID, 'Chat');
        }),
      );
      await renderPage(`/s/${SESSION_ID}`);

      await userEvent.click(
        await screen.findByRole('button', { name: resources.settings.archived.restore }),
      );

      expect(await screen.findByLabelText(resources.chat.composer.label)).toBeInTheDocument();
      expect(screen.queryByText(resources.settings.archived.bar)).not.toBeInTheDocument();
    });
  });
});
