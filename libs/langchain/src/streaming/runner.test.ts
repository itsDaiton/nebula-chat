import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildChatChain } from '../chains/chat.chain';
import { streamChat, type ChatStreamConfig } from './runner';

vi.mock('../chains/chat.chain', () => ({ buildChatChain: vi.fn() }));

const mockedBuildChatChain = vi.mocked(buildChatChain);

/** Wires the mocked chain to yield `tokens`, and captures the invoke payload. */
const stubChain = (tokens: string[]) => {
  const streamArgs: unknown[] = [];
  mockedBuildChatChain.mockReturnValue({
    stream: (args: unknown) => {
      streamArgs.push(args);
      return Promise.resolve(
        (async function* () {
          for (const token of tokens) yield token;
        })(),
      );
    },
  } as unknown as ReturnType<typeof buildChatChain>);
  return streamArgs;
};

const baseConfig = (overrides: Partial<ChatStreamConfig> = {}): ChatStreamConfig => ({
  provider: 'openai',
  apiKey: 'sk-test',
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

describe('streamChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards every streamed chunk to onToken in order', async () => {
    stubChain(['Hel', 'lo ', 'world']);

    const { tokens } = await collect(baseConfig());

    expect(tokens).toEqual(['Hel', 'lo ', 'world']);
  });

  it('reports usage once, after the stream completes', async () => {
    stubChain(['a', 'b']);

    const { usages } = await collect(baseConfig());

    expect(usages).toHaveLength(1);
    expect(usages[0].totalTokens).toBe(usages[0].promptTokens + usages[0].completionTokens);
  });

  it('counts prompt tokens from the system prompt, user message and packed history', async () => {
    stubChain([]);

    const withoutSystem = await collect(baseConfig());
    const withSystem = await collect(baseConfig({ systemPrompt: 'You are terse.' }));

    expect(withSystem.usages[0].promptTokens).toBeGreaterThan(withoutSystem.usages[0].promptTokens);
  });

  it('reports zero completion tokens when the model yields nothing', async () => {
    stubChain([]);

    const { tokens, usages } = await collect(baseConfig());

    expect(tokens).toEqual([]);
    expect(usages[0].completionTokens).toBe(0);
  });

  it('maps each history role onto its LangChain message class', async () => {
    const streamArgs = stubChain([]);

    await collect(
      baseConfig({
        history: [
          { role: 'user', content: 'q' },
          { role: 'assistant', content: 'a' },
          { role: 'system', content: 's' },
        ],
      }),
    );

    const { history } = streamArgs[0] as { history: { getType: () => string }[] };
    expect(history.map((m) => m.getType())).toEqual(['human', 'ai', 'system']);
  });

  it('passes the user message through as the chain input', async () => {
    const streamArgs = stubChain([]);

    await collect(baseConfig({ userMessage: 'what is 2+2?' }));

    expect((streamArgs[0] as { input: string }).input).toBe('what is 2+2?');
  });

  it("falls back to the provider's default model when none is given", async () => {
    stubChain([]);

    await collect(baseConfig());

    expect(mockedBuildChatChain).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini' }),
    );
  });

  it('keeps an explicitly requested model', async () => {
    stubChain([]);

    await collect(baseConfig({ model: 'gpt-4o' }));

    expect(mockedBuildChatChain).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o' }));
  });

  it('always requests a streaming chain', async () => {
    stubChain([]);

    await collect(baseConfig());

    expect(mockedBuildChatChain).toHaveBeenCalledWith(expect.objectContaining({ streaming: true }));
  });

  it('drops the oldest history when the model context window cannot hold it', async () => {
    const streamArgs = stubChain([]);
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

    const { history } = streamArgs[0] as { history: unknown[] };
    expect(history.length).toBeLessThanOrEqual(3);
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
    const streamArgs = stubChain([]);

    await collect(
      baseConfig({
        model: 'some-unregistered-model',
        history: [{ role: 'user', content: 'short' }],
      }),
    );

    expect((streamArgs[0] as { history: unknown[] }).history).toHaveLength(1);
  });

  it('reserves the larger of the model default and an explicit maxTokens', async () => {
    const streamArgs = stubChain([]);

    await collect(
      baseConfig({
        model: 'gpt-4o',
        // Reserving the whole 128k window for output leaves no input budget,
        // where the model's own 4,096 default would have left plenty.
        maxTokens: 128_000,
        history: [{ role: 'user', content: 'an earlier turn' }],
      }),
    );

    expect((streamArgs[0] as { history: unknown[] }).history).toHaveLength(0);
  });

  it('keeps history when the model default reservation applies', async () => {
    const streamArgs = stubChain([]);

    await collect(
      baseConfig({
        model: 'gpt-4o',
        history: [{ role: 'user', content: 'an earlier turn' }],
      }),
    );

    expect((streamArgs[0] as { history: unknown[] }).history).toHaveLength(1);
  });

  it('rethrows a stream failure as an Error', async () => {
    mockedBuildChatChain.mockReturnValue({
      stream: () => Promise.reject(new Error('provider exploded')),
    } as unknown as ReturnType<typeof buildChatChain>);

    await expect(collect(baseConfig())).rejects.toThrow('provider exploded');
  });

  it('wraps a non-Error rejection in an Error', async () => {
    mockedBuildChatChain.mockReturnValue({
      stream: () => Promise.reject('a bare string'),
    } as unknown as ReturnType<typeof buildChatChain>);

    await expect(collect(baseConfig())).rejects.toThrow('a bare string');
  });

  it('logs start and completion when a logger is supplied', async () => {
    stubChain(['x']);
    const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };

    await collect(baseConfig({ logger }));

    expect(logger.info).toHaveBeenCalledWith(expect.anything(), 'LLM stream started');
    expect(logger.info).toHaveBeenCalledWith(expect.anything(), 'LLM stream completed');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs the failure and does not log completion when the stream throws', async () => {
    mockedBuildChatChain.mockReturnValue({
      stream: () => Promise.reject(new Error('nope')),
    } as unknown as ReturnType<typeof buildChatChain>);
    const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };

    await expect(collect(baseConfig({ logger }))).rejects.toThrow('nope');

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'nope' }),
      'LLM stream failed',
    );
    expect(logger.info).not.toHaveBeenCalledWith(expect.anything(), 'LLM stream completed');
  });

  it('runs without a logger', async () => {
    stubChain(['x']);

    await expect(collect(baseConfig())).resolves.toBeDefined();
  });
});
