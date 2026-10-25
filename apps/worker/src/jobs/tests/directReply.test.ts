import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { GENERIC_ERROR_MESSAGE } from '@nebula-chat/errors';
import { estimateCost, MODEL_IDS } from '@nebula-chat/contracts';
import type { StreamChat } from '@worker/directReplies/runDirectReply';
import { createDirectReplyProcessor } from '@worker/jobs/directReply';
import { captureLogger, captureSpans, eventLines, LEVEL } from '@nebula-chat/otel/testing';
import type { ReplyCache } from '@worker/directReplies/replyCache';
import type { CallUsage, ModelCallLedger } from '@worker/modelCalls/recordModelCall';
import {
  brokenCache,
  brokenLedger,
  failingModel,
  memoryCache,
  memoryLedger,
  memoryStore,
  memoryStream,
  scriptedModel,
  slowModel,
} from '@worker/jobs/tests/directReplyFakes';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const MESSAGE_ID = '33333333-3333-4333-8333-333333333333';
const STREAM_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_MESSAGE_ID = '66666666-6666-4666-8666-666666666666';
const OTHER_USER_ID = '55555555-5555-4555-8555-555555555555';

const payload = {
  userId: USER_ID,
  sessionId: SESSION_ID,
  messageId: MESSAGE_ID,
  streamId: STREAM_ID,
};

const spans = captureSpans();
afterAll(() => spans.stop());

let operations: string[];
let db: ReturnType<typeof memoryStore>;
let redis: ReturnType<typeof memoryStream>;
let log: ReturnType<typeof captureLogger>;
let responses: ReturnType<typeof memoryCache>;
let ledger: ReturnType<typeof memoryLedger>;

const processorWith = (
  streamChat: StreamChat,
  apiKeys: { openai?: string; anthropic?: string } = { openai: 'sk-openai', anthropic: 'sk-ant' },
  cache: ReplyCache = responses.cache,
  modelCalls: ModelCallLedger = ledger.ledger,
) =>
  createDirectReplyProcessor({
    store: db.store,
    stream: redis.stream,
    cache,
    ledger: modelCalls,
    streamChat,
    prompts: { directReply: 'You are the Direct reply prompt.' },
    apiKeys,
    logger: log.logger,
    cancelPollMs: 1,
  });

const run = (streamChat: StreamChat, data: unknown = payload) =>
  processorWith(streamChat)({ id: 'job-1', data });

const streamed = () => redis.events.get(STREAM_ID) ?? [];

beforeEach(() => {
  spans.reset();
  operations = [];
  db = memoryStore();
  redis = memoryStream(operations);
  log = captureLogger();
  responses = memoryCache();
  ledger = memoryLedger();
  const created = db.store.createAssistantMessage;
  db.store.createAssistantMessage = async (message) => {
    operations.push('persist');
    await created(message);
  };
  db.sessions.set(SESSION_ID, { id: SESSION_ID, userId: USER_ID, model: 'gpt-4o-mini' });
  db.messages.push(
    { id: 'm-1', sessionId: SESSION_ID, role: 'user', content: 'Hi' },
    { id: 'm-2', sessionId: SESSION_ID, role: 'assistant', content: 'Hello!' },
    { id: MESSAGE_ID, sessionId: SESSION_ID, role: 'user', content: 'What is 2+2?' },
  );
});

describe('the Direct reply job', () => {
  it('streams every token in order, then usage, then end', async () => {
    await run(scriptedModel(['2', '+2', ' is 4']).streamChat);

    expect(streamed()).toEqual([
      { type: 'token', token: '2' },
      { type: 'token', token: '+2' },
      { type: 'token', token: ' is 4' },
      { type: 'usage', promptTokens: 10, completionTokens: 3, totalTokens: 13 },
      { type: 'end' },
    ]);
  });

  it('persists the assistant Message under the stream id, with its token count, before ending the stream', async () => {
    await run(scriptedModel(['4']).streamChat);

    expect(db.created).toEqual([
      { id: STREAM_ID, sessionId: SESSION_ID, content: '4', tokenCount: 11 },
    ]);
    expect(operations.slice(-4)).toEqual(['persist', 'markEnded', 'append:end', 'expire']);
  });

  it("calls the Session's Model with the Direct reply prompt, its history, oldest first, and the user Message", async () => {
    const model = scriptedModel(['4']);
    await run(model.streamChat);

    expect(model.calls).toHaveLength(1);
    expect(model.calls[0]).toMatchObject({
      provider: 'openai',
      apiKey: 'sk-openai',
      model: 'gpt-4o-mini',
      systemPrompt: 'You are the Direct reply prompt.',
      userMessage: 'What is 2+2?',
      history: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
      ],
    });
  });

  it("uses the Anthropic key for an Anthropic Session's Model", async () => {
    db.sessions.set(SESSION_ID, {
      id: SESSION_ID,
      userId: USER_ID,
      model: 'claude-3-5-haiku-20241022',
    });
    const model = scriptedModel(['4']);
    await run(model.streamChat);

    expect(model.calls[0]).toMatchObject({ provider: 'anthropic', apiKey: 'sk-ant' });
  });

  it('writes one info line for the reply, carrying every ID in the job', async () => {
    await run(scriptedModel(['4']).streamChat);

    const [line, ...rest] = eventLines(log.lines, 'chat.reply.completed');
    expect(rest).toHaveLength(0);
    expect(line).toMatchObject({
      level: LEVEL.info,
      'nebula.outcome': 'completed',
      'user.id': USER_ID,
      'nebula.session.id': SESSION_ID,
      'nebula.message.id': MESSAGE_ID,
      'nebula.reply.message.id': STREAM_ID,
      'nebula.job.id': 'job-1',
      'gen_ai.request.model': 'gpt-4o-mini',
      'gen_ai.usage.output_tokens': 1,
    });
  });

  it('never logs Message content or tokens', async () => {
    await run(scriptedModel(['secret answer']).streamChat);

    const all = JSON.stringify(log.lines);
    expect(all).not.toContain('secret answer');
    expect(all).not.toContain('What is 2+2?');
  });

  describe('when it fails', () => {
    it('turns a model failure into a typed error event, never the raw message, then ends the stream', async () => {
      await run(failingModel(new Error('upstream 529: overloaded at 10.0.0.7'), ['par']));

      expect(streamed()).toEqual([
        { type: 'token', token: 'par' },
        { type: 'error', success: false, error: 'Internal', message: GENERIC_ERROR_MESSAGE },
        { type: 'end' },
      ]);
      expect(db.created).toEqual([]);
      expect(redis.expired.has(STREAM_ID)).toBe(true);
    });

    it('marks the stream ended before its end event, so no Session read names it in flight after', async () => {
      await run(failingModel(new Error('boom')));

      expect(operations).toEqual(['append:error', 'markEnded', 'append:end', 'expire']);
      expect(redis.ended.has(STREAM_ID)).toBe(true);
    });

    it('lands every queued token before the error, even when the stream is slow to append', async () => {
      const append = redis.stream.append;
      redis.stream.append = async (streamId, event) => {
        if (event.type === 'token') await new Promise((resolve) => setTimeout(resolve, 5));
        await append(streamId, event);
      };

      await run(failingModel(new Error('boom'), ['a', 'b', 'c']));

      expect(streamed().map((event) => event.type)).toEqual([
        'token',
        'token',
        'token',
        'error',
        'end',
      ]);
    });

    it('logs the failed reply once, at error', async () => {
      await run(failingModel(new Error('boom')));

      const lines = eventLines(log.lines, 'chat.reply.completed');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        level: LEVEL.error,
        'nebula.outcome': 'failed',
        'error.type': 'Internal',
      });
    });

    it('reports a Session the User does not own as not found, without calling the model', async () => {
      db.sessions.set(SESSION_ID, { id: SESSION_ID, userId: OTHER_USER_ID, model: 'gpt-4o-mini' });
      const model = scriptedModel(['4']);
      await run(model.streamChat);

      expect(model.calls).toHaveLength(0);
      expect(streamed()).toEqual([
        { type: 'error', success: false, error: 'NotFound', message: expect.any(String) },
        { type: 'end' },
      ]);
      expect(eventLines(log.lines, 'chat.reply.completed')[0]).toMatchObject({
        level: LEVEL.warn,
      });
    });

    it('reports a user Message that is not in the Session as not found', async () => {
      await run(scriptedModel(['4']).streamChat, {
        ...payload,
        messageId: '66666666-6666-4666-8666-666666666666',
      });

      expect(streamed()[0]).toMatchObject({ type: 'error', error: 'NotFound' });
    });

    it("reports a Session bound to a Model the worker doesn't know as a bad request", async () => {
      db.sessions.set(SESSION_ID, { id: SESSION_ID, userId: USER_ID, model: 'gpt-0' });
      await run(scriptedModel(['4']).streamChat);

      expect(streamed()[0]).toMatchObject({
        type: 'error',
        error: 'BadRequest',
        message: 'Unsupported model: gpt-0',
      });
    });

    it('reports a missing provider key as an internal error without naming the key', async () => {
      await processorWith(scriptedModel(['4']).streamChat, { anthropic: 'sk-ant' })({
        id: 'job-1',
        data: payload,
      });

      expect(streamed()[0]).toEqual({
        type: 'error',
        success: false,
        error: 'Internal',
        message: GENERIC_ERROR_MESSAGE,
      });
    });

    it('treats an empty completion as a failure and persists nothing', async () => {
      await run(scriptedModel(['  ']).streamChat);

      expect(streamed().at(-2)).toMatchObject({ type: 'error', error: 'Internal' });
      expect(db.created).toEqual([]);
    });

    it('logs, and still resolves, when the stream cannot be ended either', async () => {
      redis.stream.append = async () => {
        throw new Error('redis down');
      };

      await expect(run(scriptedModel(['4']).streamChat)).resolves.toBeUndefined();
      expect(eventLines(log.lines, 'chat.stream.end.failed')).toMatchObject([
        { level: LEVEL.warn },
      ]);
    });
  });

  describe('when the User stops it', () => {
    it('aborts the model call, persists what it had produced and ends the stream as cancelled', async () => {
      const model = slowModel(['Two', ' plus', ' two', ' is', ' four'], (index) => {
        if (index === 1) redis.cancelled.add(STREAM_ID);
      });

      await run(model.streamChat);

      expect(model.signals[0]?.aborted).toBe(true);
      expect(streamed()).toEqual([
        { type: 'token', token: 'Two' },
        { type: 'token', token: ' plus' },
        { type: 'end', reason: 'cancelled' },
      ]);
      expect(db.created).toEqual([
        { id: STREAM_ID, sessionId: SESSION_ID, content: 'Two plus', tokenCount: null },
      ]);
      expect(operations.slice(-4)).toEqual(['persist', 'markEnded', 'append:end', 'expire']);
    });

    it('logs the reply once, at info, as cancelled', async () => {
      const model = slowModel(['a', 'b', 'c'], () => redis.cancelled.add(STREAM_ID));

      await run(model.streamChat);

      expect(eventLines(log.lines, 'chat.reply.completed')).toMatchObject([
        { level: LEVEL.info, 'nebula.outcome': 'cancelled' },
      ]);
    });

    it('never calls the model for a reply stopped while its job was queued, and persists nothing', async () => {
      redis.cancelled.add(STREAM_ID);
      const model = scriptedModel(['4']);

      await run(model.streamChat);

      expect(model.calls).toHaveLength(0);
      expect(streamed()).toEqual([{ type: 'end', reason: 'cancelled' }]);
      expect(db.created).toEqual([]);
      expect(redis.expired.has(STREAM_ID)).toBe(true);
    });

    it('fails, not cancels, a reply whose stop lands only after the model had finished', async () => {
      // The cancel check is still in flight when the model returns; it lands while the persist fails.
      let checks = 0;
      redis.stream.isCancelled = async () => {
        checks += 1;
        // The check before the model call finds no stop; a later one resolves late, as stopped.
        if (checks === 1) return false;
        return new Promise((resolve) => setTimeout(() => resolve(true), 15));
      };
      let persists = 0;
      db.store.createAssistantMessage = async () => {
        persists += 1;
        await new Promise((resolve) => setTimeout(resolve, 30));
        throw new Error('postgres down');
      };
      const model: StreamChat = async (_config, { onToken, onUsage }) => {
        onToken('4');
        // Long enough for one cancel check to start, short enough for it to resolve later.
        await new Promise((resolve) => setTimeout(resolve, 5));
        onUsage({ promptTokens: 1, completionTokens: 1, totalTokens: 2 });
      };

      await run(model);

      expect(persists).toBe(1);
      expect(streamed().slice(-2)).toEqual([
        { type: 'error', success: false, error: 'Internal', message: GENERIC_ERROR_MESSAGE },
        { type: 'end' },
      ]);
    });

    it('finishes a reply nobody stopped without aborting its model call', async () => {
      const model = slowModel(['a', 'b']);

      await run(model.streamChat);

      expect(model.signals[0]?.aborted).toBe(false);
      expect(streamed().at(-1)).toEqual({ type: 'end' });
    });
  });

  describe('its response cache', () => {
    const usage = { promptTokens: 10, completionTokens: 3, totalTokens: 13 };

    it('captures the tokens and usage of a reply that completed, not its stream events', async () => {
      await run(scriptedModel(['2', '+2', ' is 4']).streamChat);

      expect([...responses.entries.values()]).toEqual([{ tokens: ['2', '+2', ' is 4'], usage }]);
    });

    it('replays a repeated prompt from the cache without calling the model, with the events of a live reply', async () => {
      await run(scriptedModel(['2', '+2', ' is 4']).streamChat);
      const live = [...streamed()];
      redis.events.clear();
      const model = scriptedModel(['never used']);

      await run(model.streamChat);

      expect(model.calls).toHaveLength(0);
      expect(streamed()).toEqual(live);
    });

    it('replays a cached reply even when the provider key is missing', async () => {
      await run(scriptedModel(['4']).streamChat);
      redis.events.clear();

      await processorWith(scriptedModel([]).streamChat, {})({ id: 'job-1', data: payload });

      expect(streamed()).toContainEqual({ type: 'token', token: '4' });
      expect(streamed().some((e) => e.type === 'error')).toBe(false);
    });

    it('persists the replayed Message as cached, with the captured token count', async () => {
      await run(scriptedModel(['2', '+2', ' is 4']).streamChat);

      await run(scriptedModel([]).streamChat);

      expect(db.created.at(-1)).toEqual({
        id: STREAM_ID,
        sessionId: SESSION_ID,
        content: '2+2 is 4',
        tokenCount: 13,
        cached: true,
      });
      expect(db.created[0]).not.toHaveProperty('cached');
    });

    it('ends a replay like a live reply: persisted, then ended, then expired', async () => {
      await run(scriptedModel(['4']).streamChat);
      operations.length = 0;

      await run(scriptedModel([]).streamChat);

      expect(operations.slice(-4)).toEqual(['persist', 'markEnded', 'append:end', 'expire']);
    });

    it('logs the replay as a completed reply carrying the cache key, never the content', async () => {
      await run(scriptedModel(['secret answer']).streamChat);
      log.lines.length = 0;

      await run(scriptedModel([]).streamChat);

      const [line, ...rest] = eventLines(log.lines, 'chat.reply.completed');
      expect(rest).toHaveLength(0);
      expect(line).toMatchObject({
        level: LEVEL.info,
        'nebula.outcome': 'completed',
        'nebula.cache.key': [...responses.entries.keys()][0],
        'gen_ai.usage.output_tokens': 1,
      });
      expect(JSON.stringify(log.lines)).not.toContain('secret answer');
    });

    it('misses for another prompt, and for another Model on the same prompt', async () => {
      await run(scriptedModel(['4']).streamChat);

      db.messages.push({
        id: OTHER_MESSAGE_ID,
        sessionId: SESSION_ID,
        role: 'user',
        content: 'And 3+3?',
      });
      const otherPrompt = scriptedModel(['6']);
      await run(otherPrompt.streamChat, { ...payload, messageId: OTHER_MESSAGE_ID });

      db.sessions.set(SESSION_ID, { id: SESSION_ID, userId: USER_ID, model: 'gpt-4o' });
      const otherModel = scriptedModel(['4']);
      await run(otherModel.streamChat);

      expect(otherPrompt.calls).toHaveLength(1);
      expect(otherModel.calls).toHaveLength(1);
    });

    it('never writes the cache for an error, an empty completion or a cancelled reply', async () => {
      await run(failingModel(new Error('boom'), ['partial']));
      await run(scriptedModel([' ']).streamChat);
      redis.cancelled.add(STREAM_ID);
      await run(scriptedModel(['4']).streamChat);

      expect(responses.writes).toEqual([]);
    });

    it('does not capture a reply stopped while the model streamed', async () => {
      const model = slowModel(['a', 'b', 'c', 'd'], (index) => {
        if (index === 1) redis.cancelled.add(STREAM_ID);
      });

      await run(model.streamChat);

      expect(responses.writes).toEqual([]);
    });

    it('regenerate skips the lookup, calls the model and overwrites the entry', async () => {
      await run(scriptedModel(['old answer']).streamChat);
      redis.events.clear();
      const model = scriptedModel(['new answer']);

      await run(model.streamChat, { ...payload, regenerate: true });

      expect(model.calls).toHaveLength(1);
      expect(streamed()).toContainEqual({ type: 'token', token: 'new answer' });
      expect([...responses.entries.values()]).toEqual([
        {
          tokens: ['new answer'],
          usage: { promptTokens: 10, completionTokens: 1, totalTokens: 11 },
        },
      ]);
      expect(db.created.at(-1)).not.toHaveProperty('cached');
    });

    it('treats an entry it cannot read as a miss and overwrites it', async () => {
      await run(scriptedModel(['4']).streamChat);
      const [key] = [...responses.entries.keys()];
      responses.entries.set(key!, { tokens: 'event: token\ndata: {"token":"4"}' });
      const model = scriptedModel(['fresh']);

      await run(model.streamChat);

      expect(model.calls).toHaveLength(1);
      expect(responses.entries.get(key!)).toMatchObject({ tokens: ['fresh'] });
    });

    it('degrades a failing cache to a miss: the reply is live, complete and warns', async () => {
      const model = scriptedModel(['4']);

      await processorWith(
        model.streamChat,
        undefined,
        brokenCache(),
      )({ id: 'job-1', data: payload });

      expect(model.calls).toHaveLength(1);
      expect(streamed().at(-1)).toEqual({ type: 'end' });
      expect(streamed().some((e) => e.type === 'error')).toBe(false);
      expect(db.created).toHaveLength(1);
      expect(eventLines(log.lines, 'cache.read.failed')[0]).toMatchObject({ level: LEVEL.warn });
      expect(eventLines(log.lines, 'cache.write.failed')[0]).toMatchObject({ level: LEVEL.warn });
    });
  });

  describe('its payload', () => {
    it('drops a payload that breaks the contract, logging it and touching nothing', async () => {
      const model = scriptedModel(['4']);
      await run(model.streamChat, { sessionId: SESSION_ID, content: 'What is 2+2?' });

      expect(model.calls).toHaveLength(0);
      expect(redis.events.size).toBe(0);
      expect(eventLines(log.lines, 'job.payload.rejected')).toMatchObject([
        { level: LEVEL.error, 'nebula.job.id': 'job-1' },
      ]);
    });
  });

  describe('its Model call ledger', () => {
    const billed: CallUsage = {
      inputTokens: 1_000,
      cachedInputTokens: 200,
      outputTokens: 500,
      estimated: false,
    };
    const cost = estimateCost('gpt-4o-mini', billed);

    it('records one Model call for a reply, with the provider-reported tokens and the cost at the catalog price', async () => {
      await run(scriptedModel(['4'], undefined, billed).streamChat);

      expect(ledger.calls).toEqual([
        {
          idempotencyKey: STREAM_ID,
          userId: USER_ID,
          sessionId: SESSION_ID,
          provider: 'openai',
          model: 'gpt-4o-mini',
          inputTokens: 1_000,
          cachedInputTokens: 200,
          outputTokens: 500,
          tokensEstimated: false,
          costUsd: cost,
          durationMs: expect.any(Number),
          outcome: 'completed',
          cached: false,
        },
      ]);
      expect(cost).toBeGreaterThan(0);
    });

    it('prices the call for the Session’s own Model and provider', async () => {
      db.sessions.set(SESSION_ID, {
        id: SESSION_ID,
        userId: USER_ID,
        model: 'claude-3-5-haiku-20241022',
      });

      await run(scriptedModel(['4'], undefined, billed).streamChat);

      expect(ledger.calls).toMatchObject([
        {
          provider: 'anthropic',
          model: 'claude-3-5-haiku-20241022',
          costUsd: estimateCost('claude-3-5-haiku-20241022', billed),
        },
      ]);
    });

    it('times the call from its start to its end', async () => {
      await run(slowModel(['a', 'b', 'c'], undefined, billed).streamChat);

      expect(ledger.calls[0]?.durationMs).toBeGreaterThanOrEqual(50);
    });

    it('flags a call whose counts are our estimate because the provider reported none', async () => {
      const estimated: CallUsage = { ...billed, cachedInputTokens: 0, estimated: true };

      await run(scriptedModel(['4'], undefined, estimated).streamChat);

      expect(ledger.calls).toMatchObject([{ tokensEstimated: true, cachedInputTokens: 0 }]);
    });

    it('records a replayed Cache entry as a cached call that cost nothing', async () => {
      await run(scriptedModel(['4'], undefined, billed).streamChat);
      const replayId = '77777777-7777-4777-8777-777777777777';
      const model = scriptedModel(['never used']);

      await run(model.streamChat, { ...payload, streamId: replayId });

      expect(model.calls).toHaveLength(0);
      expect(ledger.calls).toHaveLength(2);
      expect(ledger.calls[1]).toEqual({
        idempotencyKey: replayId,
        userId: USER_ID,
        sessionId: SESSION_ID,
        provider: 'openai',
        model: 'gpt-4o-mini',
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        tokensEstimated: false,
        costUsd: 0,
        durationMs: expect.any(Number),
        outcome: 'completed',
        cached: true,
      });
    });

    it('records a failed reply with the outcome and the tokens the provider had billed', async () => {
      await run(failingModel(new Error('upstream 529'), ['par'], billed));

      expect(ledger.calls).toMatchObject([
        { outcome: 'failed', inputTokens: 1_000, outputTokens: 500, costUsd: cost, cached: false },
      ]);
    });

    it('records a failed reply with no reported tokens as a zero-cost call', async () => {
      await run(failingModel(new Error('401 from the provider')));

      expect(ledger.calls).toMatchObject([
        {
          outcome: 'failed',
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
          tokensEstimated: false,
          costUsd: 0,
        },
      ]);
    });

    it('records a reply its User stopped as cancelled, with the tokens used so far', async () => {
      const model = slowModel(['a', 'b', 'c'], () => redis.cancelled.add(STREAM_ID), billed);

      await run(model.streamChat);

      expect(ledger.calls).toMatchObject([
        { outcome: 'cancelled', inputTokens: 1_000, outputTokens: 500, costUsd: cost },
      ]);
    });

    it('records an empty completion as completed: the model answered, the reply is what failed', async () => {
      await run(scriptedModel(['  '], undefined, billed).streamChat);

      expect(streamed().at(-2)).toMatchObject({ type: 'error' });
      expect(ledger.calls).toMatchObject([{ outcome: 'completed', costUsd: cost }]);
    });

    it('records nothing for a reply stopped while its job was queued', async () => {
      redis.cancelled.add(STREAM_ID);

      await run(scriptedModel(['4']).streamChat);

      expect(ledger.calls).toEqual([]);
    });

    it('records nothing for a Session the User does not own', async () => {
      db.sessions.clear();

      await run(scriptedModel(['4']).streamChat);

      expect(ledger.calls).toEqual([]);
    });

    it('records nothing when the provider key is missing, so no call was made', async () => {
      await processorWith(scriptedModel(['4']).streamChat, {})({ id: 'job-1', data: payload });

      expect(ledger.calls).toEqual([]);
    });

    it('does not record the same reply twice when its job runs again', async () => {
      const model = scriptedModel(['4'], undefined, billed);
      await run(model.streamChat);

      await run(model.streamChat, { ...payload, regenerate: true });

      expect(model.calls).toHaveLength(2);
      expect(ledger.calls).toHaveLength(1);
    });

    it('still completes the reply, and warns, when the ledger cannot be written', async () => {
      const processor = processorWith(
        scriptedModel(['4'], undefined, billed).streamChat,
        undefined,
        undefined,
        brokenLedger(),
      );

      await expect(processor({ id: 'job-1', data: payload })).resolves.toBeUndefined();

      expect(streamed().at(-1)).toEqual({ type: 'end' });
      expect(db.created).toHaveLength(1);
      expect(eventLines(log.lines, 'model_call.record.failed')).toMatchObject([
        { level: LEVEL.warn },
      ]);
    });
  });

  it.each(MODEL_IDS)('can reply on %s, a Model a Session may be bound to', async (model) => {
    db.sessions.set(SESSION_ID, { id: SESSION_ID, userId: USER_ID, model });
    await run(scriptedModel(['4']).streamChat);

    expect(streamed().at(-1)).toEqual({ type: 'end' });
    expect(streamed().some((event) => event.type === 'error')).toBe(false);
  });
});

describe('trace propagation', () => {
  const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
  const PARENT_ID = 'b7ad6b7169203331';
  const traceparent = `00-${TRACE_ID}-${PARENT_ID}-01`;

  it("runs the job as a child of the server's span, with the model call under it", async () => {
    await run(scriptedModel(['ok']).streamChat, { ...payload, traceparent });

    const [model, job] = spans.spans();
    expect(job!.name).toBe('direct-replies process');
    expect(job!.spanContext().traceId).toBe(TRACE_ID);
    expect(job!.parentSpanContext?.spanId).toBe(PARENT_ID);
    expect(model!.name).toBe('chat gpt-4o-mini');
    expect(model!.spanContext().traceId).toBe(TRACE_ID);
    expect(model!.parentSpanContext?.spanId).toBe(job!.spanContext().spanId);
  });

  it('starts a fresh root span for a job with no trace context', async () => {
    await run(scriptedModel(['ok']).streamChat);

    const job = spans.spans().find((span) => span.name === 'direct-replies process');
    expect(job!.parentSpanContext).toBeUndefined();
    expect(streamed().at(-1)).toEqual({ type: 'end' });
  });

  it("stamps the job's log lines with the trace id", async () => {
    await run(scriptedModel(['ok']).streamChat, { ...payload, traceparent });

    expect(eventLines(log.lines, 'chat.reply.completed')).toMatchObject([{ trace_id: TRACE_ID }]);
  });
});
