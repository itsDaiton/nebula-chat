---
name: zustand-store-scaffold
description: Scaffold a new Zustand store file following project conventions (no useState, module-level init, @/ aliases, one-file-per-store). Use when creating a new store in apps/nebula-chat-client/src/**/stores/.
allowed-tools: Read, Write
argument-hint: '<StoreName> <target-path>'
---

# Zustand Store Scaffold

Creates a conventional store file. Reads `AGENTS.md` first to pick up any updated conventions.

## Preconditions

- `$ARGUMENTS` includes the PascalCase store name (without the `use` prefix or `Store` suffix — e.g. `Example`) and the target directory (e.g. `apps/nebula-chat-client/src/modules/chat/stores`).
- A reference store (e.g. `useConversationsStore`) exists — read it to match current style.

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
- No side effects at module load unless required by the conventions (initialization via store action called from a Provider).
