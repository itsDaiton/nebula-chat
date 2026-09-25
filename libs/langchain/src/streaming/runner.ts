import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buildChatChain } from '../chains/chat.chain';
import type { LLMLogger } from '../logger';
import { DEFAULT_MODELS, MODEL_REGISTRY } from '../providers/types';
import type { LLMConfig } from '../providers/types';
import { llmConcurrencyLimiter } from '../rate-limit/concurrency';
import { countTokens } from '../tokens/counter';
import { getMessageContentText, packHistory } from '../tokens/window';

export type HistoryRole = 'assistant' | 'system' | 'user';

export type HistoryMessage = {
  role: HistoryRole;
  content: string;
};

export type ChatStreamConfig = LLMConfig & {
  systemPrompt?: string;
  history: HistoryMessage[];
  userMessage: string;
  logger?: LLMLogger;
};

export type ChatStreamCallbacks = {
  onToken: (token: string) => void;
  onUsage: (usage: { promptTokens: number; completionTokens: number; totalTokens: number }) => void;
};

const DEFAULT_MAX_INPUT_TOKENS = 8_000;

export const streamChat = async (
  config: ChatStreamConfig,
  callbacks: ChatStreamCallbacks,
): Promise<void> => {
  const { history, userMessage, systemPrompt = '', logger, model, ...llmConfig } = config;
  const startMs = Date.now();

  const resolvedModel = model ?? DEFAULT_MODELS[llmConfig.provider];
  // Flat OTel gen_ai.* keys, stamped by hand: this lib does not depend on
  // @nebula-chat/otel. Progress inside the Direct reply, so `debug` — the
  // caller writes the one `info` summary for the unit of work.
  const genAi = {
    'gen_ai.provider.name': llmConfig.provider,
    'gen_ai.request.model': resolvedModel,
  };

  logger?.debug(
    { 'event.name': 'llm.stream.started', ...genAi },
    `LLM stream started · ${resolvedModel}`,
  );

  const registry = MODEL_REGISTRY[resolvedModel];
  const reservedOutputTokens = registry
    ? Math.max(registry.defaultMaxOutput, llmConfig.maxTokens ?? 0)
    : 0;
  const maxInputTokens = registry
    ? registry.contextWindow - reservedOutputTokens
    : DEFAULT_MAX_INPUT_TOKENS;

  const langchainHistory = history.map((message) => {
    switch (message.role) {
      case 'user':
        return new HumanMessage(message.content);
      case 'assistant':
        return new AIMessage(message.content);
      case 'system':
        return new SystemMessage(message.content);
      default: {
        const unreachable: never = message.role;
        throw new Error(`Unsupported history role: ${String(unreachable)}`);
      }
    }
  });

  const trimmedHistory = packHistory(langchainHistory, {
    maxInputTokens,
    model: resolvedModel,
    systemPrompt,
    userMessage,
  });

  const promptTokens =
    countTokens(systemPrompt, resolvedModel) +
    countTokens(userMessage, resolvedModel) +
    trimmedHistory.reduce(
      (sum, m) => sum + countTokens(getMessageContentText(m), resolvedModel),
      0,
    );

  const chain = buildChatChain({
    ...llmConfig,
    model: resolvedModel,
    systemPrompt,
    streaming: true,
  });

  try {
    await llmConcurrencyLimiter(async () => {
      const stream = await chain.stream({ history: trimmedHistory, input: userMessage });
      let completionTokens = 0;

      for await (const chunk of stream) {
        callbacks.onToken(chunk);
        completionTokens += countTokens(chunk, resolvedModel);
      }

      const totalTokens = promptTokens + completionTokens;
      callbacks.onUsage({ promptTokens, completionTokens, totalTokens });

      const durationMs = Date.now() - startMs;
      logger?.debug(
        {
          'event.name': 'llm.stream.finished',
          ...genAi,
          'gen_ai.usage.input_tokens': promptTokens,
          'gen_ai.usage.output_tokens': completionTokens,
          'nebula.duration_ms': durationMs,
        },
        `LLM stream finished · ${resolvedModel} · ${totalTokens} tokens`,
      );
    });
  } catch (err) {
    // Rethrow only. The failure is the caller's to log, once, where it is
    // handled — logging it here too wrote a second error line for it.
    throw err instanceof Error ? err : new Error(String(err));
  }
};
