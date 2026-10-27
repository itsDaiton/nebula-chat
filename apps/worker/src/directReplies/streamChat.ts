import {
  AIMessage,
  HumanMessage,
  mergeUsageMetadata,
  SystemMessage,
} from '@langchain/core/messages';
import type { UsageMetadata } from '@langchain/core/messages';
import { DEFAULT_MODELS, findModel } from '@nebula-chat/contracts';
import { logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import { toCallUsage } from '@worker/llm/callUsage';
import { llmConcurrencyLimiter } from '@worker/llm/concurrencyLimiter';
import { countTokens } from '@worker/llm/countTokens';
import { createLLM } from '@worker/llm/createLLM';
import type { LLMConfig } from '@worker/llm/createLLM';
import { getMessageContentText, packHistory } from '@worker/llm/packHistory';
import type { CallUsage } from '@worker/modelCalls/recordModelCall';

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
  /** The reply stream's usage, counted by us. */
  onUsage: (usage: { promptTokens: number; completionTokens: number; totalTokens: number }) => void;
  /** What the call used, for the ledger: once it ends, stopped or failed too, unless it never streamed. */
  onCallUsage?: (usage: CallUsage) => void;
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

  const catalogModel = findModel(resolvedModel);
  const reservedOutputTokens = catalogModel
    ? Math.max(catalogModel.maxOutput, llmConfig.maxTokens ?? 0)
    : 0;
  const maxInputTokens = catalogModel
    ? catalogModel.contextWindow - reservedOutputTokens
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
      let completionTokens = 0;
      let reported: UsageMetadata | undefined;

      try {
        const stream = await llm.stream(messages, signal ? { signal } : {});
        for await (const chunk of stream) {
          const token = chunk.text;
          callbacks.onToken(token);
          completionTokens += countTokens(token, resolvedModel);
          if (chunk.usage_metadata) {
            reported = mergeUsageMetadata(reported, chunk.usage_metadata);
          }
        }
      } finally {
        const usage = toCallUsage(reported, { promptTokens, completionTokens });
        if (usage) callbacks.onCallUsage?.(usage);
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
