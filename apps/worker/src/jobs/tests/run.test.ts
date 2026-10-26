import { ToolMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getModel } from '@nebula-chat/contracts';
import type { ReplyStreamEvent } from '@nebula-chat/contracts';
import { captureLogger, captureSpans, eventLines, LEVEL } from '@nebula-chat/otel/testing';
import { createRunProcessor } from '@worker/jobs/run';
import { memoryLedger, memoryStream } from '@worker/jobs/tests/directReplyFakes';
import {
  delegatingOnce,
  failingChat,
  memoryRuns,
  memorySteps,
  neverHandingOff,
  orchestratorReply,
  scriptedModels,
} from '@worker/jobs/tests/runFakes';
import type { OrchestratorScript } from '@worker/jobs/tests/runFakes';
import type { RunDeps, RunStore } from '@worker/runs/executeRun';
import type { RunLimits } from '@worker/runs/orchestrator';
import type { RunModels } from '@worker/runs/runGraph';
import { stepIdFor } from '@worker/runs/steps';
import type { StepStore } from '@worker/runs/steps';

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
  language: 'Language detection prompt',
  session: 'Session summary prompt',
  orchestrator: 'Orchestrator prompt',
  analyst: 'Analyst prompt',
  critic: 'Critic prompt',
  output: 'Output prompt',
};

const LIMITS: RunLimits = {
  turnCap: 6,
  parallelDelegates: 4,
  tokenBudget: 60_000,
  handoffThreshold: 0.85,
  delegateTimeoutMs: 60_000,
};

const spans = captureSpans();
afterAll(() => spans.stop());

let db: ReturnType<typeof memoryRuns>;
let stepRows: ReturnType<typeof memorySteps>;
let redis: ReturnType<typeof memoryStream>;
let ledger: ReturnType<typeof memoryLedger>;
let log: ReturnType<typeof captureLogger>;
let checkpointer: MemorySaver;

const run = (
  models: RunModels,
  data: unknown = payload,
  overrides: Partial<
    Pick<RunDeps, 'stream' | 'runTimeoutMs' | 'cancelPollMs' | 'steps' | 'runs'>
  > & {
    limits?: Partial<RunLimits>;
    /** BullMQ's view of the job: tries made before this one, and how many it gets in all. */
    attemptsMade?: number;
    attempts?: number;
  } = {},
) =>
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
    runTimeoutMs: 60_000,
    cancelPollMs: 10_000,
    ...overrides,
    limits: { ...LIMITS, ...overrides.limits },
  })({
    id: 'job-1',
    data,
    attemptsMade: overrides.attemptsMade ?? 0,
    opts: { attempts: overrides.attempts ?? 1 },
  });

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

const INTAKE = { language: DETECTED, session: SUMMARISED };
const happyModels = () => scriptedModels(INTAKE, ANSWER);
const stepsIn = (phase: string) => steps().filter((step) => step.phase === phase);
const outputHuman = (models: ReturnType<typeof scriptedModels>) =>
  models.chatCalls[0]?.messages[1]?.text ?? '';
const orchestratorTurns = (models: ReturnType<typeof scriptedModels>) =>
  models.agentCalls.filter((c) => c.agent === 'orchestrator');

const reset = () => {
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
};
beforeEach(reset);

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
    const earlierEvents = events.slice(0, outputStart);
    // Two Intake Steps, two Orchestrator turns and their two delegate Steps all finish first.
    expect(earlierEvents.filter((e) => e.type === 'step-finished')).toHaveLength(6);
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
          stepId: stepNamed('language').id,
          attempt: 1,
          phase: 'intake',
          agent: 'language',
          label: 'Detecting the language',
          turn: 0,
          parentStepId: null,
        },
        {
          type: 'step-started',
          stepId: stepNamed('session').id,
          attempt: 1,
          phase: 'intake',
          agent: 'session',
          label: 'Summarising the Session',
          turn: 0,
          parentStepId: null,
        },
        {
          type: 'step-started',
          stepId: stepNamed('output').id,
          attempt: 1,
          phase: 'output',
          agent: 'output',
          label: 'Writing the answer',
          turn: 0,
          parentStepId: null,
        },
      ]),
    );
    expect(started).toHaveLength(7);
  });

  it('never streams an Intake Agent’s model output as the answer', async () => {
    await run(happyModels().models);

    const tokens = streamed().filter((e) => e.type === 'token');
    expect(tokens.map((e) => (e.type === 'token' ? e.token : ''))).toEqual(ANSWER);
  });

  it('persists a completed Step per Intake Agent, Orchestrator turn, delegate and the Output Agent, in full', async () => {
    await run(happyModels().models);

    expect(steps().map((step) => step.phase)).toEqual([
      'intake',
      'intake',
      'orchestrator',
      'delegate',
      'delegate',
      'orchestrator',
      'output',
    ]);
    expect(steps().every((step) => step.status === 'completed')).toBe(true);
    expect(stepNamed('language')).toMatchObject({
      runId: RUN_ID,
      phase: 'intake',
      attempt: 1,
      status: 'completed',
      input: {
        model: 'gpt-4o-mini',
        parameters: { temperature: 0 },
        system: 'Language detection prompt',
        human: 'Kolik je dva plus dva?',
      },
      output: DETECTED,
      tokens: 50,
    });
    expect(stepNamed('session')).toMatchObject({
      phase: 'intake',
      status: 'completed',
      input: { human: expect.stringContaining('Assistant: Ahoj! Jak pomohu?') },
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

  it('stores the Brief on the Run: each Intake Agent’s output under its name', async () => {
    await run(happyModels().models);

    expect(db.runs.get(RUN_ID)?.brief).toEqual({
      language: { language: 'Czech', englishRestatement: 'How much is two plus two?' },
      session: { summary: 'The user greeted the assistant.' },
      missing: [],
    });
  });

  it('passes the Brief to the Output Agent as JSON, with the Orchestrator’s findings and the user’s message', async () => {
    const models = happyModels();

    await run(models.models);

    const [call] = models.chatCalls;
    const [system, human] = call!.messages;
    expect(system?.text).toBe('Output prompt');
    const json = /```json\n([\s\S]*?)\n```/.exec(human?.text ?? '')?.[1];
    expect(JSON.parse(json ?? 'null')).toEqual({
      language: { language: 'Czech', englishRestatement: 'How much is two plus two?' },
      session: { summary: 'The user greeted the assistant.' },
      missing: [],
    });
    expect(human?.text).toContain('Kolik je dva plus dva?');
    expect(human?.text).toContain('# Findings\n\nFindings: analyst result | critic result');
  });

  it('gives each Intake Agent its own prompt, the summary the history oldest first', async () => {
    const models = happyModels();

    await run(models.models);

    const summary = models.structuredCalls.find((c) => c.name === 'session')!;
    expect(summary.messages[0]?.text).toBe('Session summary prompt');
    expect(summary.messages[1]?.text).toMatch(/User: Ahoj\n\nAssistant: Ahoj! Jak pomohu\?/);
    const detection = models.structuredCalls.find((c) => c.name === 'language')!;
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

    expect(ledger.calls).toHaveLength(7);
    for (const step of steps()) {
      expect(ledger.calls).toContainEqual(
        expect.objectContaining({
          idempotencyKey: `${step.id}:1`,
          runId: RUN_ID,
          stepId: step.id,
          agent: step.name,
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
      scriptedModels({ language: DETECTED, session: new Error('provider down') }, ANSWER);

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
        language: { language: 'Czech', englishRestatement: 'How much is two plus two?' },
        session: null,
        missing: ['session'],
      });
    });

    it('records the failed Step with its error and announces it failed', async () => {
      await run(partialModels().models);

      const failed = stepNamed('session');
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
        { level: LEVEL.warn, 'nebula.agent.name': 'session' },
      ]);
    });
  });

  describe('when the Output Agent fails', () => {
    const failingOutput = (): RunModels => {
      const { models } = happyModels();
      // Only the Output Agent streams, so only it fails.
      return {
        ...models,
        chat: (config) => (config.streaming ? failingChat('provider down')() : models.chat(config)),
      };
    };

    it('ends the Run failed, with an error, the Run’s status and end on the stream', async () => {
      await run(failingOutput());

      expect(db.runs.get(RUN_ID)?.status).toBe('failed');
      expect(db.created).toEqual([]);
      expect(types().slice(-3)).toEqual(['error', 'run-finished', 'end']);
      expect(streamed().at(-2)).toEqual({
        type: 'run-finished',
        runId: RUN_ID,
        status: 'failed',
        error: streamed().find((e) => e.type === 'error') && {
          success: false,
          error: 'Internal',
          message: expect.any(String),
        },
      });
      expect(stepNamed('output').status).toBe('failed');
    });

    it('still records what the finished Steps used, and deletes the checkpoints', async () => {
      await run(failingOutput());

      // Two Intake Steps at 50 tokens, two Orchestrator turns and two delegates at 120.
      expect(db.runs.get(RUN_ID)?.tokensUsed).toBe(2 * 50 + 4 * 120);
      expect(await checkpointsOf(RUN_ID)).toEqual([]);
      expect(eventLines(log.lines, 'chat.run.completed')).toMatchObject([
        { level: LEVEL.error, 'nebula.outcome': 'failed' },
      ]);
    });
  });

  it('starts a re-run Step over its own row with a higher attempt', async () => {
    await run(happyModels().models);
    await run(happyModels().models);

    expect(steps()).toHaveLength(7);
    expect(steps().every((step) => step.attempt === 2)).toBe(true);
    expect(stepEvents().filter((e) => e.type === 'step-started' && e.attempt === 2)).toHaveLength(
      7,
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

  describe('the Orchestrator', () => {
    it('calls several delegate Agents in one turn, and they run concurrently', async () => {
      const models = happyModels();

      await run(models.models);

      expect(stepsIn('delegate').map((step) => [step.name, step.turn])).toEqual([
        ['analyst', 1],
        ['critic', 1],
      ]);
      expect(models.maxDelegatesInFlight()).toBe(2);
    });

    it('runs no more delegates at once than the per-turn cap', async () => {
      const models = scriptedModels(INTAKE, ANSWER, {
        orchestrator: delegatingOnce([
          ['analyst', 'call_a'],
          ['analyst', 'call_b'],
          ['critic', 'call_c'],
        ]),
      });

      await run(models.models, payload, { limits: { parallelDelegates: 2 } });

      expect(stepsIn('delegate')).toHaveLength(3);
      expect(models.maxDelegatesInFlight()).toBe(2);
    });

    it('feeds the results into the next turn, where it can delegate again', async () => {
      const call = (name: string, id: string, task: string) =>
        ({ name, id, args: { task }, type: 'tool_call' }) as const;
      const reviewing: OrchestratorScript = (messages) => {
        const results = messages.filter(ToolMessage.isInstance);
        if (results.length === 0)
          return orchestratorReply('', [call('analyst', 'call_1', 'Analyse')]);
        if (results.length === 1) {
          return orchestratorReply('', [call('critic', 'call_2', `Review: ${results[0]!.text}`)]);
        }
        return orchestratorReply('Both agreed.');
      };
      const models = scriptedModels(INTAKE, ANSWER, { orchestrator: reviewing });

      await run(models.models);

      const second = orchestratorTurns(models)[1]!.messages;
      expect(second.filter(ToolMessage.isInstance).map((m) => m.text)).toEqual(['analyst result']);
      const critic = models.agentCalls.find((c) => c.agent === 'critic')!;
      expect(critic.messages[1]?.text).toBe('Review: analyst result');
      expect(stepsIn('orchestrator').map((step) => step.turn)).toEqual([1, 2, 3]);
      expect(outputHuman(models)).toContain('# Findings\n\nBoth agreed.');
      expect(db.runs.get(RUN_ID)?.status).toBe('completed');
    });

    it('is given only the delegate Agents as tools, and gives the delegates none', async () => {
      const models = happyModels();

      await run(models.models);

      for (const turn of orchestratorTurns(models)) {
        expect(turn.tools).toEqual(['analyst', 'critic']);
      }
      const delegated = models.agentCalls.filter((c) => c.agent !== 'orchestrator');
      expect(delegated).toHaveLength(2);
      for (const call of delegated) {
        expect(call.tools).toEqual([]);
        expect(call.messages.map((m) => m.type)).toEqual(['system', 'human']);
      }
    });

    it('opens with the Brief and the user’s message, under its own prompt', async () => {
      const models = happyModels();

      await run(models.models);

      const [opening] = orchestratorTurns(models)[0]!.messages;
      expect(opening?.text).toContain('"englishRestatement": "How much is two plus two?"');
      expect(opening?.text).toContain('Kolik je dva plus dva?');
      expect(stepsIn('orchestrator')[0]?.input).toMatchObject({
        model: 'gpt-4.1',
        system: 'Orchestrator prompt',
      });
    });

    it('persists each turn and delegate execution with its turn and parent, a delegate under its tool-call id', async () => {
      await run(happyModels().models);

      const [first, second] = stepsIn('orchestrator');
      expect(first).toMatchObject({ name: 'orchestrator', turn: 1, parentStepId: null });
      expect(first?.output).toMatchObject({
        toolCalls: [
          expect.objectContaining({ id: 'call_analyst_1', name: 'analyst' }),
          expect.objectContaining({ id: 'call_critic_1', name: 'critic' }),
        ],
      });
      expect(second).toMatchObject({
        turn: 2,
        output: { content: expect.stringContaining('Findings') },
      });
      const analyst = stepNamed('analyst');
      expect(analyst).toMatchObject({
        id: stepIdFor(RUN_ID, 'delegate', 'call_analyst_1'),
        turn: 1,
        parentStepId: first!.id,
        input: {
          toolCallId: 'call_analyst_1',
          task: 'Task for the analyst',
          system: 'Analyst prompt',
        },
        output: { result: 'analyst result' },
        tokens: 120,
      });
      expect(stepEvents()).toContainEqual({
        type: 'step-started',
        stepId: analyst.id,
        attempt: 1,
        phase: 'delegate',
        agent: 'analyst',
        label: 'Analysing',
        turn: 1,
        parentStepId: first!.id,
      });
    });

    it('records each turn and delegate as a Model call with its usage, and adds them to the Run', async () => {
      await run(happyModels().models);

      const analyst = stepNamed('analyst');
      expect(ledger.calls).toContainEqual(
        expect.objectContaining({
          stepId: analyst.id,
          agent: 'analyst',
          model: 'gpt-4.1-mini',
          inputTokens: 100,
          outputTokens: 20,
          outcome: 'completed',
        }),
      );
      expect(db.runs.get(RUN_ID)?.tokensUsed).toBe(2 * 50 + 4 * 120 + stepNamed('output').tokens!);
    });

    it('hands off at the turn cap, and the Run ends partial with its answer written', async () => {
      const models = scriptedModels(INTAKE, ANSWER, { orchestrator: neverHandingOff });

      await run(models.models, payload, { limits: { turnCap: 2 } });

      expect(stepsIn('orchestrator')).toHaveLength(2);
      expect(stepsIn('delegate')).toHaveLength(2);
      expect(outputHuman(models)).toContain('because it ran out of turns');
      expect(outputHuman(models)).toContain('## From the analyst Agent\n\nanalyst result');
      expect(db.created).toHaveLength(1);
      expect(db.runs.get(RUN_ID)?.status).toBe('partial');
      expect(streamed().slice(-2)).toEqual([
        { type: 'run-finished', runId: RUN_ID, status: 'partial' },
        { type: 'end' },
      ]);
    });

    it('hands off once the Run budget nears its threshold, launching no more delegates, and ends partial', async () => {
      const models = scriptedModels(INTAKE, ANSWER, { orchestrator: neverHandingOff });

      // Intake uses 100 and the first turn 120, past 85% of 200: its delegate is refused.
      await run(models.models, payload, { limits: { tokenBudget: 200 } });

      expect(stepsIn('orchestrator')).toHaveLength(1);
      expect(stepsIn('delegate')).toEqual([]);
      expect(outputHuman(models)).toContain('because the Run budget was nearly spent');
      expect(db.created).toHaveLength(1);
      expect(db.runs.get(RUN_ID)).toMatchObject({ status: 'partial', tokenBudget: 200 });
    });

    it('returns a failing delegate’s error to the Orchestrator as a tool result, carries on, and ends partial', async () => {
      const models = scriptedModels(INTAKE, ANSWER, {
        delegates: { critic: { reply: new Error('provider down') } },
      });

      await run(models.models);

      expect(stepNamed('critic')).toMatchObject({ status: 'failed', error: { error: 'Internal' } });
      const results = orchestratorTurns(models)[1]!.messages.filter(ToolMessage.isInstance);
      expect(results.map((m) => [m.status, m.text])).toEqual([
        ['success', 'analyst result'],
        ['error', 'The critic Agent failed and returned no result.'],
      ]);
      expect(ledger.calls).toContainEqual(
        expect.objectContaining({ agent: 'critic', outcome: 'failed' }),
      );
      expect(eventLines(log.lines, 'chat.run.step.failed')).toMatchObject([
        { level: LEVEL.warn, 'nebula.agent.name': 'critic' },
      ]);
      expect(db.created).toHaveLength(1);
      expect(db.runs.get(RUN_ID)?.status).toBe('partial');
    });

    it('times a slow delegate out into an error tool result', async () => {
      const models = scriptedModels(INTAKE, ANSWER, {
        delegates: { analyst: { reply: 'too late', delayMs: 1_000 } },
      });

      await run(models.models, payload, { limits: { delegateTimeoutMs: 20 } });

      expect(stepNamed('analyst').status).toBe('failed');
      const results = orchestratorTurns(models)[1]!.messages.filter(ToolMessage.isInstance);
      expect(results[0]?.text).toBe('The analyst Agent timed out and returned no result.');
      expect(db.created).toHaveLength(1);
      expect(db.runs.get(RUN_ID)?.status).toBe('partial');
    });
  });

  describe('when its User stops it', () => {
    // A stream that raises the cancel flag once `when` sees the event, as the server would on a stop.
    const stoppingStream = (when: (event: ReplyStreamEvent) => boolean) => ({
      ...redis.stream,
      append: async (streamId: string, event: ReplyStreamEvent) => {
        if (when(event)) redis.cancelled.add(STREAM_ID);
        await redis.stream.append(streamId, event);
      },
    });

    it('stops between Orchestrator turns, keeping the finished Steps, and ends cancelled', async () => {
      const models = happyModels();

      await run(models.models, payload, {
        stream: stoppingStream((e) => e.type === 'step-started' && e.phase === 'delegate'),
      });

      expect(orchestratorTurns(models)).toHaveLength(1);
      expect(steps().map((step) => [step.phase, step.status])).toEqual([
        ['intake', 'completed'],
        ['intake', 'completed'],
        ['orchestrator', 'completed'],
        ['delegate', 'completed'],
        ['delegate', 'completed'],
      ]);
      expect(db.runs.get(RUN_ID)).toMatchObject({
        status: 'cancelled',
        tokensUsed: 2 * 50 + 3 * 120,
      });
      expect(db.created).toEqual([]);
      expect(streamed().slice(-2)).toEqual([
        { type: 'run-finished', runId: RUN_ID, status: 'cancelled' },
        { type: 'end', reason: 'cancelled' },
      ]);
      expect(await checkpointsOf(RUN_ID)).toEqual([]);
      expect(eventLines(log.lines, 'chat.run.completed')).toMatchObject([
        { level: LEVEL.info, 'nebula.outcome': 'cancelled' },
      ]);
    });

    it('aborts the Output Agent mid-stream and keeps the answer so far', async () => {
      const models = scriptedModels(INTAKE, ANSWER, { outputSleepMs: 50 });

      await run(models.models, payload, {
        stream: stoppingStream((e) => e.type === 'token'),
        cancelPollMs: 5,
      });

      const kept = db.created[0]?.content ?? '';
      expect(kept.length).toBeGreaterThan(0);
      expect(kept.length).toBeLessThan(ANSWER.join('').length);
      expect(ANSWER.join('').startsWith(kept)).toBe(true);
      expect(db.runs.get(RUN_ID)?.status).toBe('cancelled');
      expect(stepNamed('output')).toMatchObject({ status: 'failed', tokens: expect.any(Number) });
      // The stopped Output Step's tokens count too.
      expect(db.runs.get(RUN_ID)?.tokensUsed).toBe(2 * 50 + 4 * 120 + stepNamed('output').tokens!);
      expect(ledger.calls).toContainEqual(
        expect.objectContaining({ agent: 'output', outcome: 'cancelled' }),
      );
      expect(streamed().at(-1)).toEqual({ type: 'end', reason: 'cancelled' });
    });
  });

  it('fails a Run that outlives its timeout', async () => {
    const models = scriptedModels(INTAKE, ANSWER, {
      delegates: { analyst: { reply: 'slow', delayMs: 1_000 } },
    });

    await run(models.models, payload, { runTimeoutMs: 30 });

    expect(db.runs.get(RUN_ID)?.status).toBe('failed');
    expect(types().slice(-3)).toEqual(['error', 'run-finished', 'end']);
  });

  describe('when BullMQ retries the job', () => {
    // A failure the Orchestrator cannot work around, as a lost database connection is: not the delegate's own.
    const finishFailingOnce = (stepName: string): StepStore => {
      let failed = false;
      return {
        ...stepRows.store,
        finish: async (stepId, result) => {
          const step = stepRows.steps.get(stepId);
          if (!failed && step?.name === stepName && result.status === 'completed') {
            failed = true;
            throw new Error('connection lost');
          }
          return stepRows.store.finish(stepId, result);
        },
      };
    };

    // The critic is done before the analyst's Step fails: a task still in flight is cancelled with it.
    const critic_first = {
      critic: { reply: 'critic result', delayMs: 1 },
      analyst: { reply: 'analyst result', delayMs: 60 },
    };

    it('resumes from the checkpoint, re-running only the delegate that was in flight, at attempt 2', async () => {
      const models = scriptedModels(INTAKE, ANSWER, { delegates: critic_first });
      const flaky = finishFailingOnce('analyst');

      await expect(run(models.models, payload, { steps: flaky, attempts: 3 })).rejects.toThrow(
        'connection lost',
      );
      expect(db.runs.get(RUN_ID)?.status).toBe('running');
      expect(types()).not.toContain('end');
      expect(await checkpointsOf(RUN_ID)).not.toHaveLength(0);

      await run(models.models, payload, { steps: flaky, attempts: 3, attemptsMade: 1 });

      expect(models.structuredCalls).toHaveLength(2);
      const callsBy = (agent: string) => models.agentCalls.filter((c) => c.agent === agent);
      expect(callsBy('critic')).toHaveLength(1);
      expect(callsBy('analyst')).toHaveLength(2);
      expect(callsBy('orchestrator')).toHaveLength(2);
      expect(stepNamed('analyst').attempt).toBe(2);
      expect(stepNamed('critic').attempt).toBe(1);
      expect(stepNamed('session').attempt).toBe(1);
      expect(stepEvents()).toContainEqual(
        expect.objectContaining({
          type: 'step-started',
          stepId: stepNamed('analyst').id,
          attempt: 2,
        }),
      );
      expect(db.runs.get(RUN_ID)?.status).toBe('completed');
      expect(db.created).toHaveLength(1);
      expect(streamed().at(-1)).toEqual({ type: 'end' });
      expect(await checkpointsOf(RUN_ID)).toHaveLength(0);
    });

    it('keeps the Run’s token total and turn numbering as if it had never stopped', async () => {
      const uninterrupted = scriptedModels(INTAKE, ANSWER, { delegates: critic_first });
      await run(uninterrupted.models);
      const expected = db.runs.get(RUN_ID)!.tokensUsed;
      const turns = stepsIn('orchestrator').map((step) => step.turn);
      reset();

      const models = scriptedModels(INTAKE, ANSWER, { delegates: critic_first });
      const flaky = finishFailingOnce('analyst');
      await run(models.models, payload, { steps: flaky, attempts: 3 }).catch(() => undefined);
      await run(models.models, payload, { steps: flaky, attempts: 3, attemptsMade: 1 });

      expect(db.runs.get(RUN_ID)?.tokensUsed).toBe(expected);
      expect(stepsIn('orchestrator').map((step) => step.turn)).toEqual(turns);
    });

    it('records the re-run’s Model call too: it was billed', async () => {
      const models = scriptedModels(INTAKE, ANSWER, { delegates: critic_first });
      const flaky = finishFailingOnce('analyst');
      await run(models.models, payload, { steps: flaky, attempts: 3 }).catch(() => undefined);
      await run(models.models, payload, { steps: flaky, attempts: 3, attemptsMade: 1 });

      expect(ledger.calls.filter((c) => c.agent === 'analyst')).toHaveLength(2);
    });

    it('does not start a Run over when its thread finished but the Run was never closed', async () => {
      const models = scriptedModels(INTAKE, ANSWER);
      const runs: RunStore = {
        ...db.store,
        finishRun: async () => {
          throw new Error('connection lost');
        },
      };
      await expect(run(models.models, payload, { runs, attempts: 3 })).rejects.toThrow(
        'connection lost',
      );
      const callsBefore = models.structuredCalls.length + models.agentCalls.length;

      await run(models.models, payload, { attempts: 3, attemptsMade: 1 });

      expect(models.structuredCalls.length + models.agentCalls.length).toBe(callsBefore);
      expect(db.runs.get(RUN_ID)?.status).toBe('completed');
      expect(db.runs.get(RUN_ID)?.tokensUsed).toBeGreaterThan(0);
    });

    describe('when the Orchestrator keeps failing', () => {
      const broken = () =>
        scriptedModels(INTAKE, ANSWER, {
          orchestrator: () => {
            throw new Error('provider down');
          },
        });

      it('leaves the Run and its stream open until the last try', async () => {
        const models = broken();

        await expect(run(models.models, payload, { attempts: 3 })).rejects.toThrow('provider down');
        await expect(run(models.models, payload, { attempts: 3, attemptsMade: 1 })).rejects.toThrow(
          'provider down',
        );

        expect(db.runs.get(RUN_ID)?.status).toBe('running');
        expect(types()).not.toContain('error');
        expect(types()).not.toContain('end');
        expect(await checkpointsOf(RUN_ID)).not.toHaveLength(0);
      });

      it('ends the Run failed on the last try, with a typed error, its checkpoints deleted', async () => {
        const models = broken();
        await run(models.models, payload, { attempts: 3 }).catch(() => undefined);

        await run(models.models, payload, { attempts: 3, attemptsMade: 2 });

        expect(db.runs.get(RUN_ID)?.status).toBe('failed');
        expect(types().slice(-3)).toEqual(['error', 'run-finished', 'end']);
        expect(streamed().at(-2)).toEqual({
          type: 'run-finished',
          runId: RUN_ID,
          status: 'failed',
          error: { success: false, error: 'Internal', message: expect.any(String) },
        });
        expect(db.created).toHaveLength(0);
        expect(await checkpointsOf(RUN_ID)).toHaveLength(0);
      });
    });
  });
});
