import { getModel } from './modelCatalog';

export type TokenUsage = {
  /** Input tokens billed at the full input rate: those not served from the provider's prompt cache. */
  inputTokens: number;
  /** Input tokens served from the prompt cache. */
  cachedInputTokens?: number;
  outputTokens: number;
};

const MICRO_USD = 1_000_000;

/** Estimated cost in USD at list price, rounded to the nearest millionth of a dollar. */
export const estimateCost = (modelId: string, usage: TokenUsage): number => {
  const { prices } = getModel(modelId);
  // Tokens times USD per million tokens is already in millionths of a dollar.
  const microUsd =
    usage.inputTokens * prices.input +
    (usage.cachedInputTokens ?? 0) * prices.cachedInput +
    usage.outputTokens * prices.output;
  return Math.round(microUsd) / MICRO_USD;
};
