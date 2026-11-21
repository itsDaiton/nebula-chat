---
paths:
  - 'apps/client/src/**/hooks/**'
---

# Hooks

Hooks in `/hooks/` are thin wrappers that read from stores or query hooks and compose logic. They must not duplicate state that already lives in a store or the query cache.

A hook that just re-exposes store state (`useDrawer` over `useDrawerStore` and `useSearchStore`) is correct; one that keeps its own `useState` for it is not.

Utility hooks that are inherently parameterised per call-site (`useDebounce`, `useEventListener`) may use `useRef` — they cannot be singleton stores.

## Orchestrate; classify elsewhere

A hook sequences calls and writes results to stores. The step that classifies a result (an error code to an outcome, a lookup table, a copy string) lives in a React-free helper beside it (`streaming/`, `utils/`) with its own test.

`useChatStream.ts` is the model: it calls `sendFailureOf` and `allowanceRefusalOf`, then acts. A new failure kind is a new entry in `streaming/sendErrors.ts`; the hook gains no branch and no module-level constant. Sonar's cognitive-complexity limit (15) trips when this slips.
