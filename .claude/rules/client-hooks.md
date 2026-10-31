---
paths:
  - 'apps/client/src/**/hooks/**'
---

# Hooks

Hooks in `/hooks/` are thin wrappers that read from stores or query hooks and compose logic. They must not duplicate state that already lives in a store or the query cache.

A hook that just re-exposes store state (`useDrawer` over `useDrawerStore` and `useSearchStore`) is correct; one that keeps its own `useState` for it is not.

Utility hooks that are inherently parameterised per call-site (`useDebounce`, `useEventListener`) may use `useRef` — they cannot be singleton stores.
