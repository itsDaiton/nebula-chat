import { beforeEach, describe, expect, it } from 'vitest';
import { GENERIC_ERROR_MESSAGE } from '@nebula-chat/errors';
import { MODEL_IDS } from '@nebula-chat/contracts';
import type { StreamChat } from '@worker/directReplies/runDirectReply';
import { createDirectReplyProcessor } from '@worker/jobs/directReply';
import { captureLogger, eventLines, LEVEL } from '@nebula-chat/otel/testing';
import {
  failingModel,
  memoryStore,
  memoryStream,
  scriptedModel,
  slowModel,
} from '@worker/jobs/tests/directReplyFakes';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const MESSAGE_ID = '33333333-3333-4333-8333-333333333333';
const STREAM_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_USER_ID = '55555555-5555-4555-8555-555555555555';

const payload = {
  userId: USER_ID,
  sessionId: SESSION_ID,
  messageId: MESSAGE_ID,
  streamId: STREAM_ID,
};

let operations: string[];
let db: ReturnType<typeof memoryStore>;
let redis: ReturnType<typeof memoryStream>;
let log: ReturnType<typeof captureLogger>;

const processorWith = (
  streamChat: StreamChat,
  apiKeys: { openai?: string; anthropic?: string } = { openai: 'sk-openai', anthropic: 'sk-ant' },
) =>
  createDirectReplyProcessor({
    store: db.store,
    stream: redis.stream,
    streamChat,
    apiKeys,
    logger: log.logger,
    cancelPollMs: 1,
  });

const run = (streamChat: StreamChat, data: unknown = payload) =>
  processorWith(streamChat)({ id: 'job-1', data });

const streamed = () => redis.events.get(STREAM_ID) ?? [];

beforeEach(() => {
  operations = [];
  db = memoryStore();
  redis = memoryStream(operations);
  log = captureLogger();
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
    expect(operations.slice(-3)).toEqual(['persist', 'append:end', 'expire']);
  });

  it("calls the Session's Model with its history, oldest first, and the user Message", async () => {
    const model = scriptedModel(['4']);
    await run(model.streamChat);

    expect(model.calls).toHaveLength(1);
    expect(model.calls[0]).toMatchObject({
      provider: 'openai',
      apiKey: 'sk-openai',
      model: 'gpt-4o-mini',
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
      expect(operations.slice(-3)).toEqual(['persist', 'append:end', 'expire']);
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

    it('finishes a reply nobody stopped without aborting its model call', async () => {
      const model = slowModel(['a', 'b']);

      await run(model.streamChat);

      expect(model.signals[0]?.aborted).toBe(false);
      expect(streamed().at(-1)).toEqual({ type: 'end' });
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

  it.each(MODEL_IDS)('can reply on %s, a Model a Session may be bound to', async (model) => {
    db.sessions.set(SESSION_ID, { id: SESSION_ID, userId: USER_ID, model });
    await run(scriptedModel(['4']).streamChat);

    expect(streamed().at(-1)).toEqual({ type: 'end' });
    expect(streamed().some((event) => event.type === 'error')).toBe(false);
  });
});
