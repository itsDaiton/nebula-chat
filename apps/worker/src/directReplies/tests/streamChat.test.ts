import { AIMessageChunk, type BaseMessage } from '@langchain/core/messages';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureLogger, eventLines, LEVEL } from '@nebula-chat/otel/testing';
import { streamChat, type ChatStreamConfig } from '@worker/directReplies/streamChat';
import { createLLM } from '@worker/llm/createLLM';

vi.mock('@worker/llm/createLLM', () => ({ createLLM: vi.fn() }));

const mockedCreateLLM = vi.mocked(createLLM);

type StreamOptions = { signal?: AbortSignal };

/** Wires the mocked model's `stream` to `impl`, and captures the messages it was sent. */
const stubModel = (impl: (options: StreamOptions) => AsyncIterable<AIMessageChunk>) => {
  const sent: BaseMessage[][] = [];
  mockedCreateLLM.mockReturnValue({
    stream: (messages: BaseMessage[], options: StreamOptions = {}) => {
      sent.push(messages);
      return Promise.resolve(impl(options));
    },
  } as unknown as ReturnType<typeof createLLM>);
  return sent;
};

/** Wires the mocked model to yield `tokens` as message chunks, and captures the messages sent. */
const stubChain = (tokens: string[]) =>
  stubModel(async function* () {
    for (const token of tokens) yield new AIMessageChunk(token);
  });

/** The packed history the model was sent: everything between the system and human messages. */
const historyOf = (sent: BaseMessage[][]) => sent[0]?.slice(1, -1) ?? [];

const baseConfig = (overrides: Partial<ChatStreamConfig> = {}): ChatStreamConfig => ({
  provider: 'openai',
  apiKey: 'sk-test',
  systemPrompt: '',
  history: [],
  userMessage: 'hello',
  ...overrides,
});

const collect = async (config: ChatStreamConfig) => {
  const tokens: string[] = [];
  const usages: { promptTokens: number; completionTokens: number; totalTokens: number }[] = [];
  await streamChat(config, {
    onToken: (t) => tokens.push(t),
    onUsage: (u) => usages.push(u),
  });
  return { tokens, usages };
};

/** Wires the mocked model to yield `tokens` one at a time, stopping as LangChain does once its `signal` aborts. */
const stubAbortableChain = (tokens: string[]) =>
  stubModel(async function* ({ signal }) {
    for (const token of tokens) {
      signal?.throwIfAborted();
      yield new AIMessageChunk(token);
    }
  });

describe('streamChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stops streaming once its signal aborts, rejecting without reporting usage', async () => {
    stubAbortableChain(['one', 'two', 'three']);
    const controller = new AbortController();
    const tokens: string[] = [];
    const onUsage = vi.fn();

    const streaming = streamChat(baseConfig({ signal: controller.signal }), {
      onToken: (token) => {
        tokens.push(token);
        controller.abort();
      },
      onUsage,
    });

    await expect(streaming).rejects.toThrow();
    expect(tokens).toEqual(['one']);
    expect(onUsage).not.toHaveBeenCalled();
  });

  it('keeps its signal out of the model config', async () => {
    stubChain(['a']);

    await collect(baseConfig({ signal: new AbortController().signal }));

    expect(mockedCreateLLM.mock.calls[0]?.[0]).not.toHaveProperty('signal');
  });

  it('forwards every streamed chunk to onToken in order', async () => {
    stubChain(['Hel', 'lo ', 'world']);

    const { tokens } = await collect(baseConfig());

    expect(tokens).toEqual(['Hel', 'lo ', 'world']);
  });

  it('reports usage once, after the stream completes', async () => {
    stubChain(['a', 'b']);

    const { usages } = await collect(baseConfig());

    const [usage] = usages;
    expect(usages).toHaveLength(1);
    expect(usage?.totalTokens).toBe((usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0));
  });

  it('counts prompt tokens from the system prompt, user message and packed history', async () => {
    stubChain([]);

    const withoutSystem = await collect(baseConfig());
    const withSystem = await collect(baseConfig({ systemPrompt: 'You are terse.' }));

    expect(withSystem.usages[0]?.promptTokens).toBeGreaterThan(
      withoutSystem.usages[0]?.promptTokens ?? Infinity,
    );
  });

  it('reports zero completion tokens when the model yields nothing', async () => {
    stubChain([]);

    const { tokens, usages } = await collect(baseConfig());

    expect(tokens).toEqual([]);
    expect(usages[0]?.completionTokens).toBe(0);
  });

  it('maps each history role onto its LangChain message class', async () => {
    const sent = stubChain([]);

    await collect(
      baseConfig({
        history: [
          { role: 'user', content: 'q' },
          { role: 'assistant', content: 'a' },
        ],
      }),
    );

    expect(historyOf(sent).map((m) => m.getType())).toEqual(['human', 'ai']);
  });

  it('sends the system prompt first, then the history, then the user message', async () => {
    const sent = stubChain([]);

    await collect(
      baseConfig({
        systemPrompt: 'You are terse.',
        history: [{ role: 'assistant', content: 'earlier answer' }],
        userMessage: 'what is 2+2?',
      }),
    );

    expect(sent[0]?.map((m) => [m.getType(), m.content])).toEqual([
      ['system', 'You are terse.'],
      ['ai', 'earlier answer'],
      ['human', 'what is 2+2?'],
    ]);
  });

  it("falls back to the provider's default model when none is given", async () => {
    stubChain([]);

    await collect(baseConfig());

    expect(mockedCreateLLM).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o-mini' }));
  });

  it('keeps an explicitly requested model', async () => {
    stubChain([]);

    await collect(baseConfig({ model: 'gpt-4o' }));

    expect(mockedCreateLLM).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o' }));
  });

  it('always requests a streaming model', async () => {
    stubChain([]);

    await collect(baseConfig());

    expect(mockedCreateLLM).toHaveBeenCalledWith(expect.objectContaining({ streaming: true }));
  });

  it('drops the oldest history when the model context window cannot hold it', async () => {
    const sent = stubChain([]);
    const long = 'a very long earlier exchange '.repeat(400);

    await collect(
      baseConfig({
        // gpt-4o-mini: 128k window less 16,384 reserved output.
        history: [
          { role: 'user', content: long },
          { role: 'user', content: long },
          { role: 'user', content: 'recent' },
        ],
      }),
    );

    expect(historyOf(sent).length).toBeLessThanOrEqual(3);
  });

  it('rejects a history role outside the supported union', async () => {
    stubChain([]);

    await expect(
      collect(
        baseConfig({
          history: [{ role: 'moderator', content: 'x' } as never],
        }),
      ),
    ).rejects.toThrow('Unsupported history role: moderator');
  });

  it('falls back to a default input budget for a model outside the registry', async () => {
    const sent = stubChain([]);

    await collect(
      baseConfig({
        model: 'some-unregistered-model',
        history: [{ role: 'user', content: 'short' }],
      }),
    );

    expect(historyOf(sent)).toHaveLength(1);
  });

  it('reserves the larger of the model default and an explicit maxTokens', async () => {
    const sent = stubChain([]);

    await collect(
      baseConfig({
        model: 'gpt-4o',
        // Reserving the whole 128k window for output leaves no input budget,
        // where the model's own 4,096 default would have left plenty.
        maxTokens: 128_000,
        history: [{ role: 'user', content: 'an earlier turn' }],
      }),
    );

    expect(historyOf(sent)).toHaveLength(0);
  });

  it('keeps history when the model default reservation applies', async () => {
    const sent = stubChain([]);

    await collect(
      baseConfig({
        model: 'gpt-4o',
        history: [{ role: 'user', content: 'an earlier turn' }],
      }),
    );

    expect(historyOf(sent)).toHaveLength(1);
  });

  it('rethrows a stream failure as an Error', async () => {
    stubModel(() => {
      throw new Error('provider exploded');
    });

    await expect(collect(baseConfig())).rejects.toThrow('provider exploded');
  });

  it('wraps a non-Error rejection in an Error', async () => {
    stubModel(() => {
      throw 'a bare string';
    });

    await expect(collect(baseConfig())).rejects.toThrow('a bare string');
  });

  it('logs start and finish at debug with the gen_ai attributes', async () => {
    stubChain(['x']);
    const { logger, lines } = captureLogger();

    await collect(baseConfig({ logger }));

    expect(eventLines(lines, 'llm.stream.started')).toEqual([
      expect.objectContaining({
        level: LEVEL.debug,
        'gen_ai.provider.name': 'openai',
        'gen_ai.request.model': 'gpt-4o-mini',
      }),
    ]);
    expect(eventLines(lines, 'llm.stream.finished')).toEqual([
      expect.objectContaining({
        level: LEVEL.debug,
        'gen_ai.provider.name': 'openai',
        'gen_ai.request.model': 'gpt-4o-mini',
        'gen_ai.usage.input_tokens': expect.any(Number),
        'gen_ai.usage.output_tokens': expect.any(Number),
        'nebula.duration_ms': expect.any(Number),
      }),
    ]);
    expect(lines.filter((line) => line.level >= LEVEL.info)).toEqual([]);
  });

  it('never logs the user message or the completion text', async () => {
    stubChain(['the secret answer']);
    const { logger, lines } = captureLogger();

    await collect(baseConfig({ logger, userMessage: 'my private question' }));

    const logged = JSON.stringify(lines);
    expect(logged).not.toContain('my private question');
    expect(logged).not.toContain('the secret answer');
  });

  it('leaves a stream failure to the caller: rethrows without logging it', async () => {
    stubModel(() => {
      throw new Error('nope');
    });
    const { logger, lines } = captureLogger();

    await expect(collect(baseConfig({ logger }))).rejects.toThrow('nope');

    expect(lines.filter((line) => line.level >= LEVEL.warn)).toEqual([]);
    expect(eventLines(lines, 'llm.stream.finished')).toEqual([]);
  });

  it('runs without a logger', async () => {
    stubChain(['x']);

    await expect(collect(baseConfig())).resolves.toBeDefined();
  });
});
