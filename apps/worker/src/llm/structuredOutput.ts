import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessage, BaseMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { z } from 'zod';
import { toCallUsage } from '@worker/llm/callUsage';
import { llmConcurrencyLimiter } from '@worker/llm/concurrencyLimiter';
import { createLLM } from '@worker/llm/createLLM';
import type { LLMConfig } from '@worker/llm/createLLM';
import type { CallUsage } from '@worker/modelCalls/recordModelCall';

export type StructuredRequest<T> = LLMConfig & {
  /** Names the output for the provider's tool call. */
  name: string;
  schema: z.ZodType<T>;
  messages: BaseMessage[];
  /** The graph's config, so the call's callbacks reach the graph's stream. */
  config?: RunnableConfig;
};

export type StructuredResult<T> = { output: T; usage: CallUsage | undefined };

/** One structured-output model call; tests inject a scripted one in its place. */
export type StructuredCall = <T extends Record<string, unknown>>(
  request: StructuredRequest<T>,
) => Promise<StructuredResult<T>>;

export const invokeStructured = async <T extends Record<string, unknown>>(
  request: StructuredRequest<T>,
  createModel: (config: LLMConfig) => BaseChatModel = createLLM,
): Promise<StructuredResult<T>> => {
  const { name, schema, messages, config, ...llmConfig } = request;
  const runnable = createModel(llmConfig).withStructuredOutput(schema, { name, includeRaw: true });
  const { raw, parsed } = await llmConcurrencyLimiter(() => runnable.invoke(messages, config));
  // A reply the provider's parser could not read arrives as `parsed: null`.
  const output = schema.parse(parsed);
  // Billed tokens come only from the provider here: a structured reply is not streamed, so there is nothing to count.
  const usage = toCallUsage((raw as AIMessage).usage_metadata, {
    promptTokens: 0,
    completionTokens: 0,
  });
  return { output, usage };
};
