import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { RunnableLambda } from '@langchain/core/runnables';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { LLMConfig } from '@worker/llm/createLLM';
import { invokeStructured } from '@worker/llm/structuredOutput';

const schema = z.object({ language: z.string() });

/** A provider answering with `parsed`, the way `withStructuredOutput(..., { includeRaw: true })` does. */
const answering = (parsed: unknown, raw = new AIMessage('')) => {
  const configs: LLMConfig[] = [];
  const createModel = (config: LLMConfig): BaseChatModel => {
    configs.push(config);
    return {
      withStructuredOutput: () => RunnableLambda.from(async () => ({ raw, parsed })),
    } as unknown as BaseChatModel;
  };
  return { createModel, configs };
};

const request = {
  provider: 'openai' as const,
  apiKey: 'sk-test',
  model: 'gpt-4o-mini',
  name: 'language',
  schema,
  messages: [new HumanMessage('Ahoj')],
};

describe('invokeStructured', () => {
  it('returns the typed output and what the provider billed', async () => {
    const raw = Object.assign(new AIMessage(''), {
      usage_metadata: {
        input_tokens: 30,
        output_tokens: 5,
        total_tokens: 35,
        input_token_details: { cache_read: 10 },
      },
    });
    const { createModel, configs } = answering({ language: 'Czech' }, raw);

    const result = await invokeStructured(request, createModel);

    expect(result).toEqual({
      output: { language: 'Czech' },
      usage: { inputTokens: 20, cachedInputTokens: 10, outputTokens: 5, estimated: false },
    });
    expect(configs).toEqual([{ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini' }]);
  });

  it('reports no usage when the provider reported none', async () => {
    const { createModel } = answering({ language: 'Czech' });

    const result = await invokeStructured(request, createModel);

    expect(result.usage).toBeUndefined();
  });

  it('rejects output that breaks the schema', async () => {
    const { createModel } = answering(null);

    await expect(invokeStructured(request, createModel)).rejects.toThrow();
  });
});
