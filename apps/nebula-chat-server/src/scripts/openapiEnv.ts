// Reads process.env-shaped input on purpose: it runs before @backend/env parses it.
const PROVIDER_KEYS = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'] as const;
const REQUIRED_KEYS = [
  'DATABASE_URL',
  'REDIS_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
] as const;

/** Fills each unset var `env.ts` requires from its `OPENAPI_`-prefixed stand-in. */
export const applyOpenApiEnvFallbacks = (env: NodeJS.ProcessEnv = process.env): void => {
  for (const key of [...PROVIDER_KEYS, ...REQUIRED_KEYS]) {
    const fallback = env[`OPENAPI_${key}`];
    if (!env[key] && fallback) env[key] = fallback;
  }
};

/** The vars `env.ts` would reject as missing, provider keys reported as one entry. */
export const missingOpenApiEnv = (env: NodeJS.ProcessEnv = process.env): string[] => [
  ...(PROVIDER_KEYS.some((key) => env[key]) ? [] : ['OPENAI_API_KEY or ANTHROPIC_API_KEY']),
  ...REQUIRED_KEYS.filter((key) => !env[key]),
];
