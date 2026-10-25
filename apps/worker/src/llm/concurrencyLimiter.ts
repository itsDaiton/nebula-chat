import pLimit from 'p-limit';

// Caps concurrent LLM calls across the entire process to prevent overwhelming providers.
export const llmConcurrencyLimiter = pLimit(10);
