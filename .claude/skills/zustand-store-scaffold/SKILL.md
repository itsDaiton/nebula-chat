---
name: zustand-store-scaffold
description: Scaffold a new Zustand store file for client/UI state following project conventions (no useState, @/ aliases, one-file-per-store). Use when creating a new store in apps/nebula-chat-client/src/**/stores/. Not for server state — that is a generated react-query hook.
allowed-tools: Read, Write
argument-hint: '<StoreName> <target-path>'
---

# Zustand Store Scaffold

Creates a conventional store file. Reads `apps/nebula-chat-client/AGENTS.md` first to pick up any updated conventions.

## Preconditions

- `$ARGUMENTS` includes the PascalCase store name (without the `use` prefix or `Store` suffix — e.g. `Example`) and the target directory (e.g. `apps/nebula-chat-client/src/modules/chat/stores`).
- A reference store (e.g. `useSearchStore`) exists — read it to match current style.
- The state is **client/UI state** (ADR-0012). Anything read from or written to the API is server state: use the Orval-generated react-query hook instead of a store, and stop here.

## Template

Write to `<target-path>/use<StoreName>Store.ts`:

```ts
import { create } from 'zustand';

type <StoreName>State = {
  // shape
};

type <StoreName>Actions = {
  // actions
};

type <StoreName>Store = <StoreName>State & <StoreName>Actions;

const initialState: <StoreName>State = {
  // defaults
};

export const use<StoreName>Store = create<<StoreName>Store>()((set) => ({
  ...initialState,
  // action implementations
}));
```

## Anti-goals

- No `interface` — always `type`.
- No barrel exports.
- No side effects at module load — in particular no fetch; a query hook fetches on mount.
- No API calls inside actions — server state lives in react-query, not in a store.
