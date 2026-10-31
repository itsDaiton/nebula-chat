---
paths:
  - 'apps/client/src/**/*.ts'
  - 'apps/client/src/**/*.tsx'
---

# `useEffect` rules

**Never use `useEffect`.** Reference: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

| Pattern                            | Wrong                            | Right                                                                             |
| ---------------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| Derived / computed state           | `useEffect` → `setState`         | Compute inline during render or `useMemo`                                         |
| Syncing state on prop/route change | `useEffect` → Zustand `set`      | Guarded render-time write (see `useChatSession.ts`)                               |
| Fetching data on mount             | `useEffect(() => fetch(), [])`   | Generated react-query hook, which fetches on mount (see `useSessions.ts`)         |
| Refreshing data after a write      | `useEffect` → refetch            | `queryClient.invalidateQueries` where the write happens (see `useChatStream.ts`)  |
| Reading a browser API value        | `useEffect` + `useState`         | `useSyncExternalStore` (see `useViewportHeight.ts`)                               |
| DOM measurement after mount        | `useRef` + `useEffect`           | Callback ref — `ref={useCallback((node) => { ... }, [])}` (see `useMultiLine.ts`) |
| Registering a DOM event listener   | `useEffect` + `addEventListener` | `useEventListener` via `useSyncExternalStore` subscribe lifecycle                 |

New code reaches for the patterns above. Two `useEffect` calls predate this rule and remain until they are
reworked: `ChatContainer` (clearing the post-stream flags, scrolling to the newest message) and `Layout`
(closing mobile search when the desktop layout appears). Add no others.
