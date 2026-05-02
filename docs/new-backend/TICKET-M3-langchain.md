# M-3 — `@nebula-chat/langchain` (replaces openai package)

## Ticket metadata

| Field          | Value                                                            |
| -------------- | ---------------------------------------------------------------- |
| **ID**         | M-3                                                              |
| **Package**    | `libs/langchain` → published as `@nebula-chat/langchain`         |
| **Depends on** | Nothing — fully independent lib ticket                           |
| **Blocks**     | M-7 (queues use this lib), M-10 (circuit breaker wraps this lib) |
| **Standalone** | Yes                                                              |

## Objective

Create `libs/langchain` as a standalone versioned package that wraps:

- A **multi-provider LLM factory** (`createLLM`) that returns LangChain's `BaseChatModel` — caller code never imports a provider SDK directly
- A **token counting + context window packing** module using `tiktoken` for all providers (exact for OpenAI models, `cl100k_base` approximation for all others)
- A **rate limiter** that is userId-aware from day one so it wires into M-6 auth with no interface changes
- LangChain chain builders and prompt templates

`apps/server` calls this lib instead of the `openai` package directly. The `openai` package is removed after this ticket.

## Acceptance criteria

- [ ] `libs/langchain/` exists with correct `package.json`
- [ ] `createLLM(config)` returns a `BaseChatModel` for `openai`, `anthropic`, and `groq` providers
- [ ] `buildChatChain(config)` returns a runnable LangChain chain that accepts any supported provider
- [ ] `countTokens(text, model?)` returns a token count using tiktoken (`cl100k_base` fallback for unknown models)
- [ ] `packHistory(messages, limits)` trims oldest messages to fit within `maxInputTokens`
- [ ] `createRateLimiter(options)` returns a userId-keyed in-memory sliding-window limiter
- [ ] `llmConcurrencyLimiter` limits concurrent LLM calls to 10
- [ ] LangSmith tracing activates automatically when env vars are set
- [ ] `apps/server` has `@nebula-chat/langchain: "workspace:*"` in dependencies
- [ ] `openai` package is removed from `apps/server/package.json`
- [ ] All chat functionality works through the new lib

---

## Directory structure

```
libs/langchain/
├── src/
│   ├── providers/
│   │   ├── types.ts          # ProviderType, LLMConfig, MODEL_REGISTRY
│   │   ├── factory.ts        # createLLM(config): BaseChatModel
│   │   ├── openai.ts         # ChatOpenAI wiring
│   │   └── anthropic.ts      # ChatAnthropic wiring
│   ├── tokens/
│   │   ├── counter.ts        # countTokens(text, model?) using tiktoken
│   │   └── window.ts         # packHistory(messages, limits)
│   ├── rate-limit/
│   │   ├── concurrency.ts    # p-limit concurrency guard
│   │   └── sliding-window.ts # in-memory per-userId sliding window
│   ├── chains/
│   │   └── chat.chain.ts     # buildChatChain(config)
│   ├── prompts/
│   │   └── system.ts         # system prompt templates
│   └── index.ts              # public API surface
├── package.json
└── tsconfig.json
```

---

## Implementation

### File: `libs/langchain/package.json`

```json
{
  "name": "@nebula-chat/langchain",
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
    "langchain": "^0.3.0",
    "@langchain/core": "^0.3.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/anthropic": "^0.3.0",
    "langsmith": "^0.2.0",
    "tiktoken": "^1.0.0",
    "p-limit": "^6.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

### File: `libs/langchain/src/providers/types.ts`

```ts
export type ProviderType = 'openai' | 'anthropic';

export type LLMConfig = {
  provider: ProviderType;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
};

export type ModelEntry = {
  contextWindow: number;
  defaultMaxOutput: number;
};

// Context window sizes used by packHistory to determine how much history to include.
// Add new models here as providers are expanded.
export const MODEL_REGISTRY: Record<string, ModelEntry> = {
  // OpenAI
  'gpt-4o': { contextWindow: 128_000, defaultMaxOutput: 4_096 },
  'gpt-4o-mini': { contextWindow: 128_000, defaultMaxOutput: 16_384 },
  'gpt-4-turbo': { contextWindow: 128_000, defaultMaxOutput: 4_096 },
  // Anthropic
  'claude-3-5-sonnet-20241022': { contextWindow: 200_000, defaultMaxOutput: 8_192 },
  'claude-3-5-haiku-20241022': { contextWindow: 200_000, defaultMaxOutput: 8_192 },
  'claude-3-opus-20240229': { contextWindow: 200_000, defaultMaxOutput: 4_096 },
};

export const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
};
```

### File: `libs/langchain/src/providers/openai.ts`

```ts
import { ChatOpenAI } from '@langchain/openai';
import type { LLMConfig } from './types';
import { DEFAULT_MODELS } from './types';

export const createOpenAILLM = (config: LLMConfig): ChatOpenAI =>
  new ChatOpenAI({
    openAIApiKey: config.apiKey,
    modelName: config.model ?? DEFAULT_MODELS.openai,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens,
    streaming: config.streaming ?? false,
  });
```

### File: `libs/langchain/src/providers/anthropic.ts`

```ts
import { ChatAnthropic } from '@langchain/anthropic';
import type { LLMConfig } from './types';
import { DEFAULT_MODELS } from './types';

export const createAnthropicLLM = (config: LLMConfig): ChatAnthropic =>
  new ChatAnthropic({
    anthropicApiKey: config.apiKey,
    modelName: config.model ?? DEFAULT_MODELS.anthropic,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens,
    streaming: config.streaming ?? false,
  });
```

### File: `libs/langchain/src/providers/factory.ts`

```ts
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LLMConfig } from './types';
import { createOpenAILLM } from './openai';
import { createAnthropicLLM } from './anthropic';

export const createLLM = (config: LLMConfig): BaseChatModel => {
  switch (config.provider) {
    case 'openai':
      return createOpenAILLM(config);
    case 'anthropic':
      return createAnthropicLLM(config);
  }
};
```

### File: `libs/langchain/src/tokens/counter.ts`

```ts
import { encoding_for_model, get_encoding, type TiktokenModel } from 'tiktoken';

// tiktoken model names that are valid for encoding_for_model.
// Any model not in this set falls back to cl100k_base.
const TIKTOKEN_MODELS = new Set<string>([
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
]);

export const countTokens = (text: string, model?: string): number => {
  const enc = TIKTOKEN_MODELS.has(model ?? '')
    ? encoding_for_model(model as TiktokenModel)
    : get_encoding('cl100k_base');

  const count = enc.encode(text).length;
  enc.free();
  return count;
};
```

### File: `libs/langchain/src/tokens/window.ts`

```ts
import type { BaseMessage } from '@langchain/core/messages';
import { countTokens } from './counter';

export type WindowLimits = {
  maxInputTokens: number;
  model?: string;
  systemPrompt?: string;
  userMessage?: string;
};

// Returns the longest suffix of history that fits within maxInputTokens
// after reserving space for the system prompt and the new user message.
export const packHistory = (history: BaseMessage[], limits: WindowLimits): BaseMessage[] => {
  const { maxInputTokens, model, systemPrompt = '', userMessage = '' } = limits;

  const fixedTokens = countTokens(systemPrompt, model) + countTokens(userMessage, model);

  let budget = maxInputTokens - fixedTokens;
  if (budget <= 0) return [];

  const result: BaseMessage[] = [];

  // Walk backwards — most recent messages have priority
  for (let i = history.length - 1; i >= 0; i--) {
    const msgTokens = countTokens(history[i].content as string, model);
    if (msgTokens > budget) break;
    result.unshift(history[i]);
    budget -= msgTokens;
  }

  return result;
};
```

### File: `libs/langchain/src/rate-limit/concurrency.ts`

```ts
import pLimit from 'p-limit';

// Caps concurrent LLM calls across the entire process to prevent overwhelming providers.
export const llmConcurrencyLimiter = pLimit(10);
```

### File: `libs/langchain/src/rate-limit/sliding-window.ts`

```ts
export type RateLimiterOptions = {
  windowMs: number; // sliding window duration
  maxRequests: number; // max calls per window per key
};

export type RateLimiter = {
  check: (userId: string) => { allowed: boolean; retryAfterMs: number };
};

// In-memory sliding window rate limiter keyed by userId.
// userId defaults to 'anonymous' so this works pre-auth;
// once M-6 lands, pass the JWT subject as userId.
export const createRateLimiter = (options: RateLimiterOptions): RateLimiter => {
  const { windowMs, maxRequests } = options;
  const buckets = new Map<string, number[]>();

  return {
    check(userId: string) {
      const now = Date.now();
      const cutoff = now - windowMs;

      const timestamps = (buckets.get(userId) ?? []).filter((t) => t > cutoff);
      buckets.set(userId, timestamps);

      if (timestamps.length >= maxRequests) {
        const retryAfterMs = timestamps[0] - cutoff;
        return { allowed: false, retryAfterMs };
      }

      timestamps.push(now);
      return { allowed: true, retryAfterMs: 0 };
    },
  };
};
```

### File: `libs/langchain/src/chains/chat.chain.ts`

```ts
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { BaseMessage } from '@langchain/core/messages';
import { createLLM } from '../providers/factory';
import type { LLMConfig } from '../providers/types';
import { SYSTEM_PROMPTS, type SystemPromptKey } from '../prompts/system';

export type ChatChainInput = {
  history: BaseMessage[];
  input: string;
};

export type ChatChainConfig = LLMConfig & {
  systemPrompt?: string | SystemPromptKey;
};

export const buildChatChain = (config: ChatChainConfig) => {
  const llm = createLLM(config);

  const systemPromptText =
    typeof config.systemPrompt === 'string' && config.systemPrompt in SYSTEM_PROMPTS
      ? SYSTEM_PROMPTS[config.systemPrompt as SystemPromptKey]
      : (config.systemPrompt ?? SYSTEM_PROMPTS.default);

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPromptText],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
  ]);

  return RunnableSequence.from([prompt, llm, new StringOutputParser()]);
};

export type ChatChain = ReturnType<typeof buildChatChain>;
```

### File: `libs/langchain/src/prompts/system.ts`

```ts
export const SYSTEM_PROMPTS = {
  default: 'You are a helpful assistant. Answer concisely and accurately.',
  coding: 'You are an expert software engineer. Provide working code with brief explanations.',
  creative: 'You are a creative writing assistant. Be imaginative and engaging.',
} as const;

export type SystemPromptKey = keyof typeof SYSTEM_PROMPTS;
```

### File: `libs/langchain/src/index.ts`

```ts
// Providers
export { createLLM } from './providers/factory';
export type { LLMConfig, ProviderType, ModelEntry } from './providers/types';
export { MODEL_REGISTRY, DEFAULT_MODELS } from './providers/types';

// Tokens
export { countTokens } from './tokens/counter';
export { packHistory } from './tokens/window';
export type { WindowLimits } from './tokens/window';

// Rate limiting
export { llmConcurrencyLimiter } from './rate-limit/concurrency';
export { createRateLimiter } from './rate-limit/sliding-window';
export type { RateLimiter, RateLimiterOptions } from './rate-limit/sliding-window';

// Chains
export { buildChatChain } from './chains/chat.chain';
export type { ChatChainInput, ChatChainConfig, ChatChain } from './chains/chat.chain';

// Prompts
export { SYSTEM_PROMPTS } from './prompts/system';
export type { SystemPromptKey } from './prompts/system';
```

---

## LangSmith tracing

LangSmith is enabled via environment variables — no code changes needed in the lib:

```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=ls__your_key_here
LANGCHAIN_PROJECT=nebula-chat
```

All chain invocations appear in the LangSmith dashboard automatically when these variables are present. Omitting them disables tracing silently.

---

## Consuming in `apps/server`

### 1. Add workspace dependency

In `apps/server/package.json`:

```json
{
  "dependencies": {
    "@nebula-chat/langchain": "workspace:*"
  }
}
```

### 2. Full usage example in a service

The service is the **only** place that constructs provider config. Routes and controllers never import provider SDKs or touch the lib directly — they call the service.

```ts
// apps/server/src/modules/chat/chat.service.ts
import {
  buildChatChain,
  countTokens,
  packHistory,
  createRateLimiter,
  llmConcurrencyLimiter,
  MODEL_REGISTRY,
  DEFAULT_MODELS,
} from '@nebula-chat/langchain';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { env } from '../../env';

const provider = 'openai'; // read from env in real usage
const model = DEFAULT_MODELS[provider];
const modelMeta = MODEL_REGISTRY[model];

// Instantiated once at module level — shared across all requests
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });

export const generateResponse = async (
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  userId = 'anonymous', // replaced with JWT subject once M-6 lands
) => {
  const { allowed, retryAfterMs } = rateLimiter.check(userId);
  if (!allowed) {
    throw new Error(`Rate limit exceeded. Retry after ${retryAfterMs}ms`);
  }

  const systemPrompt = 'You are a helpful assistant.';
  const maxInputTokens = modelMeta.contextWindow - modelMeta.defaultMaxOutput;

  const langchainHistory = history.map((m) =>
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
  );

  const trimmedHistory = packHistory(langchainHistory, {
    maxInputTokens,
    model,
    systemPrompt,
    userMessage,
  });

  const chain = buildChatChain({
    provider,
    apiKey: env.OPENAI_API_KEY,
    model,
    streaming: false,
  });

  return llmConcurrencyLimiter(() => chain.invoke({ history: trimmedHistory, input: userMessage }));
};
```

### 3. Streaming usage (for SSE routes — see M-8)

```ts
const chain = buildChatChain({
  provider: 'openai',
  apiKey: env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
  streaming: true,
});

const stream = await chain.stream({ history: trimmedHistory, input: userMessage });

for await (const chunk of stream) {
  reply.raw.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
}
```

### 4. Switching providers at runtime (env-driven)

```ts
// apps/server/src/env.ts — add these vars
LLM_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
LLM_API_KEY: z.string().min(1),
LLM_MODEL: z.string().optional(),
```

```ts
// chat.service.ts — provider resolved from env, no code changes per-provider
const chain = buildChatChain({
  provider: env.LLM_PROVIDER,
  apiKey: env.LLM_API_KEY,
  model: env.LLM_MODEL,
});
```

---

## API layer contract

Routes and controllers must **never** import from provider SDKs (`@langchain/openai`, `@langchain/anthropic`, etc.) or call `createLLM` directly. All LLM invocations, token counting, history packing, and rate limiting must go through the service, which calls `@nebula-chat/langchain`.

```
Route → Controller → Service → @nebula-chat/langchain
                              ↑ only place lib is called
```

---

## Removing the `openai` package

After all direct `openai` SDK calls are replaced:

1. Remove `openai` from `apps/server/package.json` dependencies
2. Run `pnpm install`
3. Verify no direct imports remain:

```bash
grep -r "from 'openai'" apps/server/src/
grep -r "require('openai')" apps/server/src/
```

Both commands should return no results.
