import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { buildChatChain } from '../chains/chat.chain';
import type { LLMLogger } from '../logger';
import { DEFAULT_MODELS, MODEL_REGISTRY } from '../providers/types';
import type { LLMConfig } from '../providers/types';
import { llmConcurrencyLimiter } from '../rate-limit/concurrency';
import { countTokens } from '../tokens/counter';
import { getMessageContentText, packHistory } from '../tokens/window';

export type HistoryMessage = {
  role: string;
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

  logger?.info(
    { provider: llmConfig.provider, model, historyLength: history.length },
    'LLM stream started',
  );

  const resolvedModel = model ?? DEFAULT_MODELS[llmConfig.provider];
  const registry = MODEL_REGISTRY[resolvedModel];
  const reservedOutputTokens = registry
    ? Math.max(registry.defaultMaxOutput, llmConfig.maxTokens ?? 0)
    : 0;
  const maxInputTokens = registry
    ? registry.contextWindow - reservedOutputTokens
    : DEFAULT_MAX_INPUT_TOKENS;

  const langchainHistory = history.map((m) =>
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
  );

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
      logger?.info(
        {
          provider: llmConfig.provider,
          model: resolvedModel,
          promptTokens,
          completionTokens,
          totalTokens,
          durationMs,
        },
        'LLM stream completed',
      );
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger?.error(
      { error: error.message, provider: llmConfig.provider, model: resolvedModel },
      'LLM stream failed',
    );
    throw error;
  }
};
