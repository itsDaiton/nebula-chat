import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { RunnableLambda } from '@langchain/core/runnables';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildChatChain } from '../chat.chain';

vi.mock('../../providers/factory', () => ({
  // Stands in for the chat model: echoes the fully-rendered prompt back as the
  // completion, so assertions can read what the template actually produced.
  createLLM: vi.fn(() =>
    RunnableLambda.from(
      (messages: { toChatMessages: () => BaseMessage[] }) =>
        new AIMessage(
          messages
            .toChatMessages()
            .map((m) => `${m.getType()}:${String(m.content)}`)
            .join('|'),
        ),
    ),
  ),
}));

const baseConfig = { provider: 'openai' as const, apiKey: 'sk-test' };

const render = async (config: Parameters<typeof buildChatChain>[0], history: BaseMessage[] = []) =>
  buildChatChain(config).invoke({ history, input: 'what is 2+2?' });

describe('buildChatChain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the default system prompt when none is supplied', async () => {
    const rendered = await render(baseConfig);

    expect(rendered).toContain('system:You are a helpful assistant.');
  });

  it('resolves a named prompt key to its registered text', async () => {
    const rendered = await render({ ...baseConfig, systemPrompt: 'coding' });

    expect(rendered).toContain('system:You are an expert software engineer.');
  });

  it('treats an unrecognised string as a custom system prompt verbatim', async () => {
    const rendered = await render({ ...baseConfig, systemPrompt: 'Answer only in haiku.' });

    expect(rendered).toContain('system:Answer only in haiku.');
  });

  it('places the user input last, after the history', async () => {
    const rendered = await render({ ...baseConfig }, [
      new HumanMessage('earlier question'),
      new AIMessage('earlier answer'),
    ]);

    const parts = rendered.split('|');

    expect(parts[0]).toContain('system:');
    expect(parts[1]).toBe('human:earlier question');
    expect(parts[2]).toBe('ai:earlier answer');
    expect(parts[3]).toBe('human:what is 2+2?');
  });

  it('renders with no history at all', async () => {
    const parts = (await render(baseConfig)).split('|');

    expect(parts).toHaveLength(2);
    expect(parts[1]).toBe('human:what is 2+2?');
  });

  it('parses the model output down to a plain string', async () => {
    await expect(render(baseConfig)).resolves.toBeTypeOf('string');
  });
});
