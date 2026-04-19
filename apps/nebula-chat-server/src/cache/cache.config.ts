export const cacheConfig = {
  provider: 'redis',
  maxItems: 1000,
  defaultTTL: 600000,
  maxConnections: 10,
  statsKey: 'cache:stats',
  keysList: 'cache:keys',
  keyLimit: 100,
};
