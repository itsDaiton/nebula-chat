/** 128000 → "128K", 1047576 → "1M". */
export const formatContextWindow = (tokens: number) =>
  tokens >= 1_000_000 ? `${Math.round(tokens / 1_000_000)}M` : `${Math.round(tokens / 1_000)}K`;
