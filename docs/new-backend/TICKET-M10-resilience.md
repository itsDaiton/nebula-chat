# M-10 — Resilience (Circuit Breaker)

## Ticket metadata

| Field          | Value                                                   |
| -------------- | ------------------------------------------------------- |
| **ID**         | M-10                                                    |
| **Scope**      | `libs/langchain` (add to existing lib) or `apps/server` |
| **Depends on** | M-3 (LangChain lib)                                     |
| **Blocks**     | Nothing                                                 |
| **Standalone** | No — wraps existing LLM calls                           |

## Objective

Wrap all LLM API calls with retry and circuit breaker policies using cockatiel. When the OpenAI API is degraded, the circuit opens after 5 consecutive failures and requests fail fast for 10 seconds instead of hanging and timing out.

## Acceptance criteria

- [ ] `cockatiel` installed
- [ ] `llmPolicy` wraps retry (3 attempts, exponential backoff) and circuit breaker (5 consecutive failures)
- [ ] All LLM invocations use `llmPolicy.execute()`
- [ ] Circuit breaker state is logged when it opens/closes
- [ ] A `CircuitBreakerOpenError` is returned to the client with a 503 status when the circuit is open

## Packages to add

```json
{
  "dependencies": {
    "cockatiel": "^3.2.0"
  }
}
```

Add to `libs/langchain` (if extending the lib) or `apps/server` (if keeping it in the app layer).

## Implementation

### File: `libs/langchain/src/resilience.ts`

```ts
import {
  Policy,
  ConsecutiveBreaker,
  ExponentialBackoff,
  retry,
  circuitBreaker,
  wrap,
  BrokenCircuitError,
} from 'cockatiel';

const retryPolicy = retry(Policy.handleAll(), {
  maxAttempts: 3,
  backoff: new ExponentialBackoff({ initialDelay: 500, maxDelay: 10_000 }),
});

const breakerPolicy = circuitBreaker(Policy.handleAll(), {
  halfOpenAfter: 10_000, // try again after 10s
  breaker: new ConsecutiveBreaker(5), // open after 5 consecutive failures
});

breakerPolicy.onBreak(() => console.error('[circuit-breaker] LLM circuit OPENED'));
breakerPolicy.onReset(() => console.info('[circuit-breaker] LLM circuit CLOSED'));

export const llmPolicy = wrap(retryPolicy, breakerPolicy);

export { BrokenCircuitError };
```

Export from `libs/langchain/src/index.ts`:

```ts
export { llmPolicy, BrokenCircuitError } from './resilience';
```

### Usage in service layer

```ts
import { llmPolicy, BrokenCircuitError } from '@nebula-chat/langchain';

// In a route handler or service:
try {
  const response = await llmPolicy.execute(() => chain.invoke({ history, input }));
  return reply.send({ content: response });
} catch (err) {
  if (err instanceof BrokenCircuitError) {
    return reply.status(503).send({
      error: 'LLM service temporarily unavailable. Please try again shortly.',
    });
  }
  throw err; // let Fastify handle other errors
}
```

### `env.ts` additions (optional — for configurability)

```ts
CIRCUIT_BREAKER_THRESHOLD: z.string().default('5').transform(Number),
```
