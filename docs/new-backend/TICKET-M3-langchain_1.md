# M-3 — `@nebula-chat/langchain` (replaces openai package)

## Ticket metadata

| Field | Value |
|-------|-------|
| **ID** | M-3 |
| **Package** | `libs/langchain` → published as `@nebula-chat/langchain` |
| **Depends on** | Nothing — fully independent lib ticket |
| **Blocks** | M-7 (queues use this lib), M-10 (circuit breaker wraps this lib) |
| **Standalone** | Yes |

## Objective

Create `libs/langchain` as a standalone versioned package wrapping LangChain setup, LLM factory, chain builders, and prompt templates. `apps/server` calls this lib instead of the `openai` package directly. The `openai` package is removed after this ticket.

## Acceptance criteria

- [ ] `libs/langchain/` exists with correct `package.json`
- [ ] `createLLM(config)` returns a configured `ChatOpenAI` instance
- [ ] `buildChatChain(config)` returns a runnable LangChain chain
- [ ] `llmLimiter` limits concurrent LLM calls to 10
- [ ] LangSmith tracing activates automatically when env vars are set
- [ ] `apps/server` has `@nebula-chat/langchain: "workspace:*"` in dependencies
- [ ] `openai` package is removed from `apps/server/package.json`
- [ ] Existing chat functionality works through the new lib

---

## Directory structure

```
libs/langchain/
├── src/
│   ├── llm.ts                  # LLM client factory
│   ├── limiter.ts              # p-limit concurrency control
│   ├── chains/
│   │   └── chat.chain.ts       # chat chain builder
│   ├── prompts/
│   │   └── system.ts           # system prompt templates
│   └── index.ts
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
    "@langchain/community": "^0.3.0",
    "langsmith": "^0.2.0",
    "p-limit": "^6.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

### File: `libs/langchain/src/llm.ts`

```ts
import { ChatOpenAI } from '@langchain/openai';

export interface LLMConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

export function createLLM(config: LLMConfig): ChatOpenAI {
  return new ChatOpenAI({
    openAIApiKey: config.apiKey,
    modelName: config.model ?? 'gpt-4o-mini',
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens,
    streaming: config.streaming ?? false,
  });
}
```

### File: `libs/langchain/src/limiter.ts`

```ts
import pLimit from 'p-limit';

/**
 * Limits concurrent LLM calls across the entire process.
 * Prevents overwhelming the OpenAI API rate limits.
 */
export const llmLimiter = pLimit(10);
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

### File: `libs/langchain/src/chains/chat.chain.ts`

```ts
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { BaseMessage } from '@langchain/core/messages';
import { createLLM, LLMConfig } from '../llm';
import { SYSTEM_PROMPTS, SystemPromptKey } from '../prompts/system';

export interface ChatChainInput {
  history: BaseMessage[];
  input: string;
}

export interface ChatChainConfig extends LLMConfig {
  systemPrompt?: string | SystemPromptKey;
}

export function buildChatChain(config: ChatChainConfig) {
  const llm = createLLM(config);

  const systemPromptText =
    typeof config.systemPrompt === 'string' && config.systemPrompt in SYSTEM_PROMPTS
      ? SYSTEM_PROMPTS[config.systemPrompt as SystemPromptKey]
      : config.systemPrompt ?? SYSTEM_PROMPTS.default;

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPromptText],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
  ]);

  return RunnableSequence.from([prompt, llm, new StringOutputParser()]);
}

export type ChatChain = ReturnType<typeof buildChatChain>;
```

### File: `libs/langchain/src/index.ts`

```ts
export { createLLM } from './llm';
export type { LLMConfig } from './llm';

export { buildChatChain } from './chains/chat.chain';
export type { ChatChainInput, ChatChainConfig, ChatChain } from './chains/chat.chain';

export { llmLimiter } from './limiter';

export { SYSTEM_PROMPTS } from './prompts/system';
export type { SystemPromptKey } from './prompts/system';
```

---

## LangSmith tracing

LangSmith is enabled via environment variables — no code changes are needed in the lib. Set these in `apps/server/.env.local`:

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

### 2. Usage in a service

```ts
// apps/server/src/modules/chat/chat.service.ts
import { buildChatChain, llmLimiter } from '@nebula-chat/langchain';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { env } from '../../env';

export async function generateResponse(
  userMessage: string,
  history: Array<{ role: string; content: string }>
) {
  const chain = buildChatChain({ apiKey: env.OPENAI_API_KEY });

  const langchainHistory = history.map((m) =>
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  return llmLimiter(() =>
    chain.invoke({ history: langchainHistory, input: userMessage })
  );
}
```

### 3. Streaming usage (for SSE routes — see M-8)

```ts
const chain = buildChatChain({ apiKey: env.OPENAI_API_KEY, streaming: true });
const stream = await chain.stream({ history: [], input: userMessage });

for await (const chunk of stream) {
  reply.raw.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
}
```

---

## Removing the `openai` package

After all direct `openai` SDK calls are replaced with `@nebula-chat/langchain`:

1. Remove `openai` from `apps/server/package.json` dependencies
2. Run `pnpm install`
3. Verify no imports of `openai` remain in `apps/server/src/`

```bash
grep -r "from 'openai'" apps/server/src/
grep -r "require('openai')" apps/server/src/
```

Both commands should return no results.
