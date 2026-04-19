# M-4 — `@nebula-chat/cache` (replaces bare redis package)

## Ticket metadata

| Field | Value |
|-------|-------|
| **ID** | M-4 |
| **Package** | `libs/cache` → published as `@nebula-chat/cache` |
| **Depends on** | Nothing — fully independent lib ticket |
| **Blocks** | Nothing |
| **Standalone** | Yes |

## Objective

Create `libs/cache` as a standalone versioned package providing a two-tier cache: in-process LRU (L1) backed by ioredis (L2). Also exposes the raw ioredis instance for BullMQ and pub/sub. Replaces the bare `redis` package in `apps/server`.

## Acceptance criteria

- [ ] `libs/cache/` exists with correct `package.json`
- [ ] `TwoTierCache.get()` checks L1 first, falls back to L2, promotes L2 hits to L1
- [ ] `TwoTierCache.set()` writes to both L1 and L2
- [ ] `TwoTierCache.del()` removes from both tiers
- [ ] `getRedis()` exposes the raw ioredis instance
- [ ] `CacheKeys` object exports all key-builder functions
- [ ] LLM response caching helpers exist
- [ ] `apps/server` consumes `@nebula-chat/cache` via a Fastify plugin
- [ ] `redis` bare package is removed from `apps/server/package.json`

---

## Directory structure

```
libs/cache/
├── src/
│   ├── cache.ts          # TwoTierCache class
│   ├── keys.ts           # cache key builders
│   ├── llm-cache.ts      # LLM response caching helpers
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

## Implementation

### File: `libs/cache/package.json`

```json
{
  "name": "@nebula-chat/cache",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "ioredis": "^5.4.2",
    "lru-cache": "^11.1.0"
  },
  "devDependencies": {
    "@types/node": "^25.5.0",
    "typescript": "^5.9.3"
  }
}
```

### File: `libs/cache/src/cache.ts`

```ts
import { LRUCache } from 'lru-cache';
import IORedis from 'ioredis';

export interface CacheConfig {
  redisUrl: string;
  /** Max number of items in the L1 LRU cache. Default: 500 */
  l1MaxSize?: number;
  /** L1 TTL in milliseconds. Default: 60_000 (1 min) */
  l1Ttl?: number;
  /** Default L2 TTL in seconds when not specified per-call. Default: 3600 (1 hr) */
  defaultL2Ttl?: number;
}

export class TwoTierCache {
  private l1: LRUCache<string, string>;
  private l2: IORedis;
  private defaultL2Ttl: number;

  constructor(private config: CacheConfig) {
    this.l1 = new LRUCache({
      max: config.l1MaxSize ?? 500,
      ttl: config.l1Ttl ?? 60_000,
    });
    this.l2 = new IORedis(config.redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    this.defaultL2Ttl = config.defaultL2Ttl ?? 3600;
  }

  async get<T>(key: string): Promise<T | null> {
    // L1 — in-process LRU
    const l1Hit = this.l1.get(key);
    if (l1Hit !== undefined) {
      return JSON.parse(l1Hit) as T;
    }

    // L2 — Redis
    const l2Hit = await this.l2.get(key);
    if (l2Hit !== null) {
      this.l1.set(key, l2Hit); // promote to L1
      return JSON.parse(l2Hit) as T;
    }

    return null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const ttl = ttlSeconds ?? this.defaultL2Ttl;

    this.l1.set(key, serialized);
    await this.l2.setex(key, ttl, serialized);
  }

  async del(key: string): Promise<void> {
    this.l1.delete(key);
    await this.l2.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (this.l1.has(key)) return true;
    const result = await this.l2.exists(key);
    return result > 0;
  }

  /** Expose raw ioredis instance for BullMQ, pub/sub, etc. */
  getRedis(): IORedis {
    return this.l2;
  }

  async disconnect(): Promise<void> {
    await this.l2.quit();
  }
}
```

### File: `libs/cache/src/keys.ts`

```ts
/**
 * Centralised cache key builders.
 * All keys use a namespace:identifier pattern.
 */
export const CacheKeys = {
  conversation: (id: string) => `conv:${id}`,
  userConversations: (userId: string) => `user_convs:${userId}`,
  messages: (conversationId: string) => `msgs:${conversationId}`,
  llmResponse: (hash: string) => `llm:${hash}`,
  session: (token: string) => `session:${token}`,
  user: (id: string) => `user:${id}`,
} as const;
```

### File: `libs/cache/src/llm-cache.ts`

```ts
import { createHash } from 'crypto';
import { TwoTierCache } from './cache';
import { CacheKeys } from './keys';

export interface LLMCacheParams {
  messages: unknown[];
  model: string;
  temperature: number;
  systemPrompt?: string;
}

/**
 * Creates a short hash from LLM call parameters.
 * Same inputs always produce the same hash → cache hit.
 */
export function hashLLMParams(params: LLMCacheParams): string {
  return createHash('sha256')
    .update(JSON.stringify(params))
    .digest('hex')
    .slice(0, 16);
}

export async function getCachedLLMResponse(
  cache: TwoTierCache,
  params: LLMCacheParams
): Promise<string | null> {
  const hash = hashLLMParams(params);
  return cache.get<string>(CacheKeys.llmResponse(hash));
}

export async function setCachedLLMResponse(
  cache: TwoTierCache,
  params: LLMCacheParams,
  response: string,
  ttlSeconds = 3600
): Promise<void> {
  const hash = hashLLMParams(params);
  await cache.set(CacheKeys.llmResponse(hash), response, ttlSeconds);
}
```

### File: `libs/cache/src/index.ts`

```ts
export { TwoTierCache } from './cache';
export type { CacheConfig } from './cache';

export { CacheKeys } from './keys';

export { hashLLMParams, getCachedLLMResponse, setCachedLLMResponse } from './llm-cache';
export type { LLMCacheParams } from './llm-cache';
```

---

## Consuming in `apps/server`

### 1. Add workspace dependency

```json
{
  "dependencies": {
    "@nebula-chat/cache": "workspace:*"
  }
}
```

### 2. Fastify plugin

```ts
// apps/server/src/plugins/cache.plugin.ts
import fp from 'fastify-plugin';
import { TwoTierCache } from '@nebula-chat/cache';
import { env } from '../env';

export default fp(async (app) => {
  const cache = new TwoTierCache({ redisUrl: env.REDIS_URL });

  app.decorate('cache', cache);

  app.addHook('onClose', async () => {
    await cache.disconnect();
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    cache: import('@nebula-chat/cache').TwoTierCache;
  }
}
```

Register in `server.ts`:

```ts
await app.register(import('./plugins/cache.plugin'));
```

### 3. Usage in a route handler

```ts
import { getCachedLLMResponse, setCachedLLMResponse } from '@nebula-chat/cache';

// In handler:
const cached = await getCachedLLMResponse(req.server.cache, { messages, model, temperature });
if (cached) return reply.send({ content: cached, cached: true });

const response = await generateResponse(/* ... */);
await setCachedLLMResponse(req.server.cache, { messages, model, temperature }, response);
```

### 4. Expose Redis for BullMQ (Ticket M-7)

```ts
// In workers/queues.ts
import { TwoTierCache } from '@nebula-chat/cache';
const cache = new TwoTierCache({ redisUrl: env.REDIS_URL });
const connection = cache.getRedis(); // pass to BullMQ Queue/Worker
```

---

## Removing the bare `redis` package

After migrating:

1. Remove `redis` from `apps/server/package.json` dependencies
2. Run `pnpm install`
3. Verify no imports of `redis` remain:

```bash
grep -r "from 'redis'" apps/server/src/
```
