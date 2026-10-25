import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import { llmConcurrencyLimiter } from '@worker/llm/concurrencyLimiter';
import { countTokens } from '@worker/llm/countTokens';
import { createLLM } from '@worker/llm/createLLM';
import { DEFAULT_MODELS, MODEL_REGISTRY } from '@worker/llm/modelRegistry';
import type { LLMConfig } from '@worker/llm/modelRegistry';
import { getMessageContentText, packHistory } from '@worker/llm/packHistory';

type HistoryRole = 'assistant' | 'user';

export type HistoryMessage = {
  role: HistoryRole;
  content: string;
};

export type ChatStreamConfig = LLMConfig & {
  systemPrompt: string;
  history: HistoryMessage[];
  userMessage: string;
  logger?: Logger;
  /** Aborts the model call mid-stream; `streamChat` then rejects and reports no usage. */
  signal?: AbortSignal;
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
  const { history, userMessage, systemPrompt, logger, model, signal, ...llmConfig } = config;
  const startMs = Date.now();

  const resolvedModel = model ?? DEFAULT_MODELS[llmConfig.provider];
  const genAi = {
    'gen_ai.provider.name': llmConfig.provider,
    'gen_ai.request.model': resolvedModel,
  };

  // `debug`, since the caller writes the one `info` summary.
  if (logger) {
    logEvent(logger, 'debug', 'llm.stream.started', genAi, `LLM stream started · ${resolvedModel}`);
  }

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

  const llm = createLLM({ ...llmConfig, model: resolvedModel, streaming: true });
  const messages = [
    new SystemMessage(systemPrompt),
    ...trimmedHistory,
    new HumanMessage(userMessage),
  ];

  try {
    await llmConcurrencyLimiter(async () => {
      const stream = await llm.stream(messages, signal ? { signal } : {});
      let completionTokens = 0;

      for await (const chunk of stream) {
        const token = chunk.text;
        callbacks.onToken(token);
        completionTokens += countTokens(token, resolvedModel);
      }

      const totalTokens = promptTokens + completionTokens;
      callbacks.onUsage({ promptTokens, completionTokens, totalTokens });

      if (logger) {
        logEvent(
          logger,
          'debug',
          'llm.stream.finished',
          {
            ...genAi,
            'gen_ai.usage.input_tokens': promptTokens,
            'gen_ai.usage.output_tokens': completionTokens,
            'nebula.duration_ms': Date.now() - startMs,
          },
          `LLM stream finished · ${resolvedModel} · ${totalTokens} tokens`,
        );
      }
    });
  } catch (err) {
    // Rethrow only. The failure is the caller's to log, once, where it is
    // handled — logging it here too wrote a second error line for it.
    throw err instanceof Error ? err : new Error(String(err));
  }
};
