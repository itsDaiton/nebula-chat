export type CacheEntry = {
  value: string;
  expiresAt: number;
};

export interface CachedStreamData {
  tokens: string;
  usageData?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
