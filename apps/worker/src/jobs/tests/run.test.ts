import { MemorySaver } from '@langchain/langgraph';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getModel } from '@nebula-chat/contracts';
import type { ReplyStreamEvent } from '@nebula-chat/contracts';
import { captureLogger, captureSpans, eventLines, LEVEL } from '@nebula-chat/otel/testing';
import { createRunProcessor } from '@worker/jobs/run';
import { memoryLedger, memoryStream } from '@worker/jobs/tests/directReplyFakes';
import { failingChat, memoryRuns, memorySteps, scriptedModels } from '@worker/jobs/tests/runFakes';
import type { RunModels } from '@worker/runs/runGraph';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const MESSAGE_ID = '33333333-3333-4333-8333-333333333333';
const STREAM_ID = '44444444-4444-4444-8444-444444444444';
const RUN_ID = '55555555-5555-4555-8555-555555555555';
const OTHER_USER_ID = '66666666-6666-4666-8666-666666666666';

const payload = {
  userId: USER_ID,
  sessionId: SESSION_ID,
  messageId: MESSAGE_ID,
  streamId: STREAM_ID,
  runId: RUN_ID,
};

const DETECTED = { language: 'Czech', englishRestatement: 'How much is two plus two?' };
const SUMMARISED = { summary: 'The user greeted the assistant.' };
const ANSWER = ['Dva', ' plus dva', ' jsou čtyři.'];

const prompts = {
  directReply: 'Direct reply prompt',
  languageDetection: 'Language detection prompt',
  sessionSummary: 'Session summary prompt',
  output: 'Output prompt',
};

const spans = captureSpans();
afterAll(() => spans.stop());

let db: ReturnType<typeof memoryRuns>;
let stepRows: ReturnType<typeof memorySteps>;
let redis: ReturnType<typeof memoryStream>;
let ledger: ReturnType<typeof memoryLedger>;
let log: ReturnType<typeof captureLogger>;
let checkpointer: MemorySaver;

const run = (models: RunModels, data: unknown = payload) =>
  createRunProcessor({
    runs: db.store,
    steps: stepRows.store,
    stream: redis.stream,
    ledger: ledger.ledger,
    checkpointer,
    models,
    prompts,
    apiKeys: { openai: 'sk-openai' },
    logger: log.logger,
  })({ id: 'job-1', data });

const streamed = (): ReplyStreamEvent[] => redis.events.get(STREAM_ID) ?? [];
const types = () => streamed().map((event) => event.type);
const stepEvents = () =>
  streamed().filter((e) => e.type === 'step-started' || e.type === 'step-finished');
const steps = () => [...stepRows.steps.values()];
const stepNamed = (name: string) => steps().find((step) => step.name === name)!;
const checkpointsOf = async (threadId: string) => {
  const found = [];
  for await (const checkpoint of checkpointer.list({ configurable: { thread_id: threadId } })) {
    found.push(checkpoint);
  }
  return found;
};

const happyModels = () =>
  scriptedModels({ languageDetection: DETECTED, sessionSummary: SUMMARISED }, ANSWER);

beforeEach(() => {
  spans.reset();
  db = memoryRuns();
  stepRows = memorySteps();
  redis = memoryStream();
  ledger = memoryLedger();
  log = captureLogger();
  checkpointer = new MemorySaver();
  db.runs.set(RUN_ID, {
    id: RUN_ID,
    userId: USER_ID,
    status: 'queued',
    brief: null,
    tokensUsed: 0,
  });
  db.messages.push(
    { id: 'm-1', sessionId: SESSION_ID, role: 'user', content: 'Ahoj' },
    { id: 'm-2', sessionId: SESSION_ID, role: 'assistant', content: 'Ahoj! Jak pomohu?' },
    { id: MESSAGE_ID, sessionId: SESSION_ID, role: 'user', content: 'Kolik je dva plus dva?' },
  );
});

describe('the Run job', () => {
  it('ends completed, its answer persisted as an assistant Message linked to the Run', async () => {
    await run(happyModels().models);

    expect(db.runs.get(RUN_ID)).toMatchObject({ status: 'completed' });
    expect(db.created).toEqual([
      {
        id: STREAM_ID,
        sessionId: SESSION_ID,
        runId: RUN_ID,
        content: 'Dva plus dva jsou čtyři.',
        tokenCount: expect.any(Number),
      },
    ]);
  });

  it('streams Step events, then the answer’s tokens inside the Output Step, then the Run’s status and end', async () => {
    await run(happyModels().models);

    const events = streamed();
    const outputStart = events.findIndex((e) => e.type === 'step-started' && e.phase === 'output');
    const intakeEvents = events.slice(0, outputStart);
    expect(intakeEvents.filter((e) => e.type === 'step-finished')).toHaveLength(2);
    expect(events.slice(outputStart + 1, outputStart + 4)).toEqual(
      ANSWER.map((token) => ({ type: 'token', token })),
    );
    expect(events.slice(-3)).toEqual([
      { type: 'step-finished', stepId: stepNamed('output').id, status: 'completed' },
      { type: 'run-finished', runId: RUN_ID, status: 'completed' },
      { type: 'end' },
    ]);
  });

  it('announces each Step’s first attempt with its phase, Agent and label', async () => {
    await run(happyModels().models);

    const started = stepEvents().filter((e) => e.type === 'step-started');
    expect(started).toEqual(
      expect.arrayContaining([
        {
          type: 'step-started',
          stepId: stepNamed('languageDetection').id,
          attempt: 1,
          phase: 'intake',
          agent: 'languageDetection',
          label: 'Detecting the language',
        },
        {
          type: 'step-started',
          stepId: stepNamed('sessionSummary').id,
          attempt: 1,
          phase: 'intake',
          agent: 'sessionSummary',
          label: 'Summarising the Session',
        },
        {
          type: 'step-started',
          stepId: stepNamed('output').id,
          attempt: 1,
          phase: 'output',
          agent: 'output',
          label: 'Writing the answer',
        },
      ]),
    );
    expect(started).toHaveLength(3);
  });

  it('never streams an Intake Agent’s model output as the answer', async () => {
    await run(happyModels().models);

    const tokens = streamed().filter((e) => e.type === 'token');
    expect(tokens.map((e) => (e.type === 'token' ? e.token : ''))).toEqual(ANSWER);
  });

  it('persists one completed Step per Intake Agent and one for the Output Agent, in full', async () => {
    await run(happyModels().models);

    expect(steps()).toHaveLength(3);
    expect(stepNamed('languageDetection')).toMatchObject({
      runId: RUN_ID,
      phase: 'intake',
      attempt: 1,
      status: 'completed',
      input: { message: 'Kolik je dva plus dva?' },
      output: DETECTED,
      tokens: 50,
    });
    expect(stepNamed('sessionSummary')).toMatchObject({
      phase: 'intake',
      status: 'completed',
      input: { message: expect.stringContaining('Assistant: Ahoj! Jak pomohu?') },
      output: SUMMARISED,
    });
    expect(stepNamed('output')).toMatchObject({
      phase: 'output',
      status: 'completed',
      output: { answer: 'Dva plus dva jsou čtyři.' },
      tokens: expect.any(Number),
    });
  });

  it('runs the Intake Agents concurrently', async () => {
    const models = happyModels();

    await run(models.models);

    expect(models.maxInFlight()).toBe(2);
  });

  it('stores the typed Brief on the Run', async () => {
    await run(happyModels().models);

    expect(db.runs.get(RUN_ID)?.brief).toEqual({
      language: 'Czech',
      englishRestatement: 'How much is two plus two?',
      sessionSummary: 'The user greeted the assistant.',
      missing: [],
    });
  });

  it("asks the Output Agent to answer in the user's language, given the English restatement and the summary", async () => {
    const models = happyModels();

    await run(models.models);

    const [call] = models.chatCalls;
    const [system, human] = call!.messages;
    expect(system?.text).toBe('Output prompt');
    expect(human?.text).toContain('Language: Czech');
    expect(human?.text).toContain('English restatement: How much is two plus two?');
    expect(human?.text).toContain('Session summary: The user greeted the assistant.');
    expect(human?.text).toContain('Kolik je dva plus dva?');
  });

  it('gives each Intake Agent its own prompt, the summary the history oldest first', async () => {
    const models = happyModels();

    await run(models.models);

    const summary = models.structuredCalls.find((c) => c.name === 'sessionSummary')!;
    expect(summary.messages[0]?.text).toBe('Session summary prompt');
    expect(summary.messages[1]?.text).toMatch(/User: Ahoj\n\nAssistant: Ahoj! Jak pomohu\?/);
    const detection = models.structuredCalls.find((c) => c.name === 'languageDetection')!;
    expect(detection.messages.map((m) => m.text)).toEqual([
      'Language detection prompt',
      'Kolik je dva plus dva?',
    ]);
  });

  it('runs Intake on cheaper Models than the Output Agent', async () => {
    const models = happyModels();

    await run(models.models);

    const outputPrice = getModel(models.chatCalls[0]!.config.model!).prices.output;
    for (const call of models.structuredCalls) {
      expect(getModel(call.model).prices.output).toBeLessThan(outputPrice);
    }
  });

  it('records one Model call per model-calling Step, linked to its Run, Step and Agent', async () => {
    await run(happyModels().models);

    expect(ledger.calls).toHaveLength(3);
    for (const name of ['languageDetection', 'sessionSummary', 'output']) {
      const step = stepNamed(name);
      expect(ledger.calls).toContainEqual(
        expect.objectContaining({
          idempotencyKey: step.id,
          runId: RUN_ID,
          stepId: step.id,
          agent: name,
          userId: USER_ID,
          sessionId: SESSION_ID,
          outcome: 'completed',
        }),
      );
    }
  });

  it('adds up the tokens its Steps used on the Run', async () => {
    await run(happyModels().models);

    const used = steps().reduce((sum, step) => sum + (step.tokens ?? 0), 0);
    expect(db.runs.get(RUN_ID)?.tokensUsed).toBe(used);
  });

  it("checkpoints under the Run's id and deletes the checkpoints once the Run ends", async () => {
    const deleted = vi.spyOn(checkpointer, 'deleteThread');

    await run(happyModels().models);

    expect(deleted).toHaveBeenCalledExactlyOnceWith(RUN_ID);
    expect(await checkpointsOf(RUN_ID)).toEqual([]);
  });

  it('writes exactly one info summary line', async () => {
    await run(happyModels().models);

    expect(eventLines(log.lines, 'chat.run.completed')).toMatchObject([
      { level: LEVEL.info, 'nebula.outcome': 'completed', 'nebula.run.id': RUN_ID },
    ]);
  });

  describe('when an Intake Agent fails', () => {
    const partialModels = () =>
      scriptedModels(
        { languageDetection: DETECTED, sessionSummary: new Error('provider down') },
        ANSWER,
      );

    it('still answers, and ends the Run partial', async () => {
      await run(partialModels().models);

      expect(db.created).toHaveLength(1);
      expect(db.runs.get(RUN_ID)?.status).toBe('partial');
      expect(streamed().slice(-2)).toEqual([
        { type: 'run-finished', runId: RUN_ID, status: 'partial' },
        { type: 'end' },
      ]);
    });

    it('leaves a partial Brief naming the missing Agent', async () => {
      await run(partialModels().models);

      expect(db.runs.get(RUN_ID)?.brief).toEqual({
        language: 'Czech',
        englishRestatement: 'How much is two plus two?',
        sessionSummary: null,
        missing: ['sessionSummary'],
      });
    });

    it('records the failed Step with its error and announces it failed', async () => {
      await run(partialModels().models);

      const failed = stepNamed('sessionSummary');
      expect(failed).toMatchObject({
        status: 'failed',
        error: { success: false, error: 'Internal' },
      });
      expect(stepEvents()).toContainEqual({
        type: 'step-finished',
        stepId: failed.id,
        status: 'failed',
      });
      expect(eventLines(log.lines, 'chat.run.step.failed')).toMatchObject([
        { level: LEVEL.warn, 'nebula.agent.name': 'sessionSummary' },
      ]);
    });
  });

  describe('when the Output Agent fails', () => {
    const failingOutput = (): RunModels => ({
      ...happyModels().models,
      chat: failingChat('provider down'),
    });

    it('ends the Run failed, with an error, the Run’s status and end on the stream', async () => {
      await run(failingOutput());

      expect(db.runs.get(RUN_ID)?.status).toBe('failed');
      expect(db.created).toEqual([]);
      expect(types().slice(-3)).toEqual(['error', 'run-finished', 'end']);
      expect(streamed().at(-2)).toEqual({ type: 'run-finished', runId: RUN_ID, status: 'failed' });
      expect(stepNamed('output').status).toBe('failed');
    });

    it('still records what the Intake Steps used, and deletes the checkpoints', async () => {
      await run(failingOutput());

      expect(db.runs.get(RUN_ID)?.tokensUsed).toBe(100);
      expect(await checkpointsOf(RUN_ID)).toEqual([]);
      expect(eventLines(log.lines, 'chat.run.completed')).toMatchObject([
        { level: LEVEL.error, 'nebula.outcome': 'failed' },
      ]);
    });
  });

  it('starts a re-run Step over its own row with a higher attempt', async () => {
    await run(happyModels().models);
    await run(happyModels().models);

    expect(steps()).toHaveLength(3);
    expect(steps().every((step) => step.attempt === 2)).toBe(true);
    expect(stepEvents().filter((e) => e.type === 'step-started' && e.attempt === 2)).toHaveLength(
      3,
    );
  });

  it('runs on its own Models, whatever the Session’s', async () => {
    const models = happyModels();

    await run(models.models);

    expect(models.chatCalls[0]?.config).toMatchObject({ provider: 'openai', apiKey: 'sk-openai' });
  });

  it("refuses another User's Run with NotFound on the stream, touching nothing", async () => {
    await run(happyModels().models, { ...payload, userId: OTHER_USER_ID });

    expect(streamed()).toEqual([
      expect.objectContaining({ type: 'error', error: 'NotFound' }),
      { type: 'end' },
    ]);
    expect(db.runs.get(RUN_ID)?.status).toBe('queued');
    expect(steps()).toEqual([]);
  });

  it('fails the Run when its user Message is gone', async () => {
    db.messages.splice(2, 1);

    await run(happyModels().models);

    expect(db.runs.get(RUN_ID)?.status).toBe('failed');
    expect(types()).toEqual(['error', 'run-finished', 'end']);
  });

  it('drops a payload that breaks the contract, logging it', async () => {
    await run(happyModels().models, { ...payload, runId: 'not-a-uuid' });

    expect(redis.events.size).toBe(0);
    expect(eventLines(log.lines, 'job.payload.rejected')).toMatchObject([{ level: LEVEL.error }]);
  });
});
