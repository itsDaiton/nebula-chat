import type { UsageMetadata } from '@langchain/core/messages';
import type { CallUsage } from '@worker/modelCalls/recordModelCall';

// A provider's input total includes the cached tokens; with nothing reported and nothing streamed,
// nothing is known to have been billed.
export const toCallUsage = (
  reported: UsageMetadata | undefined,
  estimate: { promptTokens: number; completionTokens: number },
): CallUsage | undefined => {
  if (reported) {
    const cached = reported.input_token_details?.cache_read ?? 0;
    return {
      inputTokens: reported.input_tokens - cached,
      cachedInputTokens: cached,
      outputTokens: reported.output_tokens,
      estimated: false,
    };
  }
  if (estimate.completionTokens === 0) return undefined;
  return {
    inputTokens: estimate.promptTokens,
    cachedInputTokens: 0,
    outputTokens: estimate.completionTokens,
    estimated: true,
  };
};
