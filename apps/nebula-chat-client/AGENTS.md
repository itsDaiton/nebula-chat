# AGENTS.md — Frontend (`nebula-chat-client`)

Conventions specific to the React SPA. See the [root AGENTS.md](../../AGENTS.md) for monorepo-wide commands, git workflow, and cross-cutting rules (no barrels, `type` not `interface`, arrow functions) that also apply here.

---

## Commands

Run from `apps/nebula-chat-client` (or `pnpm --filter nebula-chat-client run <cmd>` from the root):

```bash
pnpm dev        # Vite dev server on localhost:5173
pnpm build      # tsc + Vite build → build/
pnpm typecheck  # tsc --noEmit
```

Test commands are under [Testing](#testing); monorepo-wide lint/format/build live in the [root AGENTS.md](../../AGENTS.md#development-commands).

---

## Directory Layout

```text
apps/nebula-chat-client/src/
├── App.tsx                        # Root — mounts providers and router
├── main.tsx                       # Vite entry point
├── RouterProvider.tsx             # React Router setup
├── routes.ts                      # Typed route helpers
├── libs/api/
│   ├── client.ts                  # axios instance (credentials, AppError interceptor); Orval's mutator
│   ├── queryClient.ts             # createQueryClient + the app's client (global onError → toaster)
│   ├── types/types.ts             # createQueryClient options
│   ├── utils/                     # toAppError (failed request → AppError), notifyError (→ toaster)
│   └── generated/                 # Orval output: react-query hooks, models, MSW handlers
├── libs/auth/
│   ├── client.ts                  # better-auth client (anonymous plugin, credentials) — the one auth entry point
│   └── utils/ensureSession.ts     # get-session, else sign-in/anonymous
├── resources.ts                   # UI string constants
├── App.css
├── theme/
│   ├── theme.ts                   # Chakra UI theme tokens
│   └── ThemeProvider.tsx          # next-themes wrapper
├── modules/                       # Feature modules
│   ├── auth/
│   │   ├── AuthPage.tsx           # /auth — sign-in and sign-up tabs plus social sign-in; opt-in, never a wall
│   │   ├── ForgotPasswordPage.tsx # /auth/forgot-password — emails a reset link
│   │   ├── ResetPasswordPage.tsx  # /auth/reset-password — new password from the emailed link's token
│   │   ├── VerifyEmailPage.tsx    # /auth/verify-email — where the verification link lands (verified / expired / invalid)
│   │   ├── types/types.ts         # Auth props, credentials (inferred from the schemas), better-auth result shape
│   │   ├── stores/
│   │   │   └── usePasswordVisibilityStore.ts
│   │   ├── utils/
│   │   │   ├── authSchemas.ts         # zod schemas for the sign-in / sign-up / forgot / reset / change-password forms
│   │   │   ├── authForms.ts           # Form configs (sign-in, sign-up, forgot, reset, change password): schema, fields, copy, better-auth call
│   │   │   ├── authCallbackUrl.ts     # Absolute client URL an emailed link or social sign-in redirects back to
│   │   │   ├── socialSignIn.ts        # Google/GitHub button configs + copy for the OAuth callback's ?error= code
│   │   │   ├── runAuthRequest.ts      # better-auth call → AuthRequestError (copy + field) from its error code
│   │   │   └── AuthRequestError.ts    # AppError carrying the form field its message belongs under
│   │   ├── hooks/
│   │   │   ├── useAuth.ts             # Current session (Guest vs Registered, needsEmailVerification) from useSession
│   │   │   ├── useSessionBootstrap.ts # Query that runs ensureSession once per page load
│   │   │   ├── useAuthMutation.ts     # An auth form's mutation for its config's request
│   │   │   ├── useResendVerification.ts # Re-sends the verification email; toasts on success
│   │   │   ├── useSocialSignIn.ts     # Starts a Google/GitHub sign-in; better-auth then leaves for the provider
│   │   │   ├── useSignOut.ts          # Sign-out, then useAfterSignOut
│   │   │   ├── useAfterSignOut.ts     # Once the auth session is gone: reset the bootstrap so AuthGate re-mints a Guest
│   │   │   └── useIdentityChange.ts   # After any of them: reset server state and per-user UI state (allowance, settings search), go to the chat root
│   │   └── components/
│   │       ├── AuthGate.tsx       # Wraps the routes; renders nothing until a session (Guest at least) exists
│   │       ├── AccountStatus.tsx  # Header: Sign in button for a Guest; UserMenu (name/email, Settings, Sign out) for a Registered user
│   │       ├── UserMenu.tsx       # Registered user's Avatar trigger (initials) + the menu it opens
│   │       ├── AuthLayout.tsx     # Shell every auth page shares: app mark + card (+ footer)
│   │       ├── AuthForm.tsx       # One react-hook-form + zod form, driven by an AuthFormConfig
│   │       ├── AuthFormField.tsx  # Label, input (or PasswordInput) and its error text
│   │       ├── AuthFormAlert.tsx  # Outcome (error or success) that belongs to the whole form
│   │       ├── AuthStatus.tsx     # Titled outcome in place of a form (sent, reset, link invalid)
│   │       ├── SocialSignIn.tsx   # "Continue with Google / GitHub" + why the last attempt failed
│   │       ├── BackToSignIn.tsx   # Footer link back to /auth
│   │       ├── EmailVerificationPrompt.tsx  # Above the chat input: unverified Registered user → resend (→ "keep chatting" at the allowance)
│   │       └── ResendVerificationButton.tsx
│   ├── chat/
│   │   ├── ChatPage.tsx
│   │   ├── types/types.ts         # All chat types
│   │   ├── utils/                 # Model options, SSE event names, message mapping
│   │   ├── stores/                # Zustand stores (client state)
│   │   │   ├── useChatStreamStore.ts
│   │   │   ├── useMessageStore.ts
│   │   │   ├── useModelStore.ts
│   │   │   └── useModelSelectorStore.ts
│   │   ├── hooks/                 # Logic hooks (consume stores)
│   │   │   ├── useChatStream.ts
│   │   │   ├── useHandleSendMessage.ts
│   │   │   ├── useMessageHandler.ts
│   │   │   ├── useModel.ts
│   │   │   └── useModelSelector.ts
│   │   └── components/
│   │       ├── ChatContainer.tsx
│   │       ├── ChatInput.tsx
│   │       ├── ChatInputArea.tsx
│   │       ├── ChatMessage.tsx
│   │       ├── ChatStreaming.tsx
│   │       ├── MessageAllowancePrompt.tsx # Guest's send refused at the message allowance → register
│   │       ├── ModelSelect.tsx
│   │       ├── SendButton.tsx
│   │       └── ...
│   ├── settings/
│   │   ├── SettingsPage.tsx       # /settings — Registered-only (others → /auth); Account: Profile, Security, Account sections
│   │   ├── types/types.ts
│   │   ├── utils/
│   │   │   ├── settingsSections.ts    # The settings navigation's sections (label, icon, route)
│   │   │   ├── settingsSchemas.ts     # zod schema for the profile name
│   │   │   └── settingsIndex.ts       # Searchable settings (copy + keywords) and the match rule
│   │   ├── stores/
│   │   │   ├── usePasswordChangeStore.ts  # Whether the Password row's change form is unfolded
│   │   │   └── useSettingsSearchStore.ts  # The settings search text
│   │   ├── hooks/
│   │   │   ├── useUpdateName.ts       # better-auth update-user; the session refetch updates the header
│   │   │   ├── useSettingsSearch.ts   # Which rows/sections the search leaves visible
│   │   │   ├── useSignOutEverywhere.ts # revoke-sessions, then sign-out on this device
│   │   │   └── useHasPassword.ts      # list-accounts → has a credential password (delete-account confirm)
│   │   └── components/
│   │       ├── SettingsLayout.tsx # App Header over Settings' own shell in place of the chat (no conversations): nav + open section
│   │       ├── SettingsNav.tsx    # Search + "Settings" section links; a sidebar on desktop, a top bar on mobile
│   │       ├── SettingsSearch.tsx # Front-end-only filter over the settings rows
│   │       ├── SettingsSection.tsx # Titled group of rows (h2)
│   │       ├── SettingsRow.tsx    # Label/description left, control right; stacked on mobile
│   │       ├── ProfileNameForm.tsx # Full name row: edit in place, Save once changed
│   │       ├── PasswordSetting.tsx # Password row whose button unfolds the change-password AuthForm
│   │       ├── SignOutEverywhereSetting.tsx # Sign out of all devices row
│   │       ├── DeleteAccountSetting.tsx # Delete account row + its alertdialog
│   │       ├── DeleteAccountForm.tsx # Password confirm, or none for a Google/GitHub-only user
│   │       └── AccountIdSetting.tsx # The user's UUID with a copy button
│   └── conversations/
│       ├── types/types.ts         # All conversation types
│       ├── utils/                 # navigationActions
│       ├── stores/
│       │   └── useConversationsSearchStore.ts  # Search text + its debounced copy
│       ├── hooks/
│       │   ├── useConversations.ts        # Sidebar list: infinite query
│       │   ├── useConversation.ts         # Open conversation: detail + messages queries
│       │   ├── useConversationsSearch.ts  # Search results: query on the debounced text
│       │   └── useInfiniteScroll.ts
│       └── components/
│           ├── ConversationsList.tsx
│           ├── ConversationDrawer.tsx
│           ├── ConversationsSearch.tsx
│           ├── ConversationListItem.tsx
│           └── ConversationSkeletons.tsx
└── shared/                        # Cross-module code
    ├── types/types.ts             # Shared types
    ├── config/
    │   ├── serverConfig.ts        # API base URL helper
    │   └── paginationConfig.ts    # Default page size
    ├── stores/                    # Global Zustand stores
    │   ├── useSearchStore.ts      # Search overlay open/closed
    │   ├── useDrawerStore.ts      # Mobile drawer open/closed
    │   └── useViewportStore.ts    # Viewport height
    ├── hooks/                     # Shared utility hooks
    │   ├── useAutoScroll.ts
    │   ├── useDebounce.ts
    │   ├── useDrawer.ts
    │   ├── useEscapeKey.ts
    │   ├── useEventListener.ts
    │   ├── useKeyboardHandler.ts
    │   ├── useKeyboardShortcut.ts
    │   ├── useMultiLine.ts
    │   ├── useResponsiveLayout.ts
    │   ├── useResetChat.ts
    │   ├── useTextareaAutoResize.ts
    │   └── useViewportHeight.ts
    ├── layout/
    │   ├── Layout.tsx             # Main shell (header, sidepanels, drawer)
    │   ├── Header.tsx
    │   ├── SidePanel.tsx
    │   └── Page.tsx
    ├── components/
    │   ├── navigation/
    │   │   ├── NebulaButton.tsx
    │   │   └── BadgeActionButton.tsx
    │   └── ui/                    # Chakra UI primitives & adapters
    │       ├── color-mode.tsx
    │       ├── provider.tsx
    │       ├── toaster.tsx
    │       ├── password-input.tsx # Controlled masking toggle (Chakra's snippet, keyboard-reachable)
    │       ├── markdown-content.tsx
    │       └── ...
    └── utils/
        ├── dateUtils.ts
        ├── scrollUtils.ts
        ├── urlUtils.ts
        └── index.ts
```

---

## Routing

Routes are defined in `routes.ts` as typed helpers and consumed through React Router:

```ts
import { route } from '@/routes';

navigate(route.chat.root()); // /
navigate(route.chat.conversation(id)); // /c/:id
```

`RouterProvider.tsx` sets up the React Router instance. Route components live in `modules/*/` as `*Page.tsx` files.

---

## Imports

Always use the `@/` path alias — never relative paths (`./`, `../../`, etc.). `@/` maps to `apps/nebula-chat-client/src/`. This applies to **every** import in every file — components, hooks, utils, and types — regardless of how close the files are to each other.

**Check every import in every file you touch.** If a relative path exists anywhere in a file you modify, fix it.

```ts
// correct
import { useSearchStore } from '@/shared/stores/useSearchStore';
import type { Conversation } from '@/modules/conversations/types/types';
import { ChatInput } from '@/modules/chat/components/ChatInput';
import { useChatStream } from '@/modules/chat/hooks/useChatStream';

// wrong — no relative paths, ever
import { useSearchStore } from '../../shared/stores/useSearchStore';
import type { Conversation } from '../types/types';
import { ChatInput } from './ChatInput';
```

---

## No `index.ts` barrels

Never use `index.ts` files for re-exports. Each module, component, hook, util, or type must be imported directly from the file that defines it — no barrel files anywhere in the repo (frontend or backend).

This keeps imports explicit, avoids circular-dependency traps, and prevents the tree-shaking and IDE-performance issues barrel files are known for.

```ts
// correct — import from the defining file
import { axiosClient } from '@/libs/api/client';
import { queryClient } from '@/libs/api/queryClient';
import { ChatInput } from '@/modules/chat/components/ChatInput';

// wrong — never re-export through an index.ts
// apps/nebula-chat-client/src/libs/api/index.ts
export * from './client';
export * from './queryClient';
```

The only `index.ts` files tolerated are those emitted by code generators (e.g. Orval output). Do not hand-author or hand-edit them.

---

## TypeScript Types

- Use `type` — never `interface`. This applies everywhere: `types/types.ts`, hooks, components, utils — no exceptions.

```ts
// correct
type ConversationWithMessages = {
  id: string;
  messages: Message[];
};

// wrong — anywhere in the codebase
interface ConversationWithMessages { ... }
```

- All types must live in `/types/types.ts` under the relevant module or `shared/`. Never define types inline inside hook, store, or component files.
- Always import types with the `type` keyword:

```ts
import type { ChatMessage } from '@/modules/chat/types/types';
```

### Modern TypeScript / ES Style

- **Never use `'use client'`** — this is a Vite/React SPA, not Next.js. The directive has no effect and must never appear in any file.

- Always use `const` arrow functions — never `function` declarations. This applies to hooks, utils, helpers, and components.

```ts
// correct
export const useMyHook = () => { ... };
export const formatDate = (date: string): string => { ... };
export const MyComponent = () => <div />;

// wrong
export function useMyHook() { ... }
export function formatDate(date: string): string { ... }
function MyComponent() { ... }
```

---

## State Management — react-query for server state, Zustand for client state

State is split by **kind** ([ADR-0012](../../docs/adr/0012-adopt-tanstack-query-for-server-state.md)):

- **Server state** is anything the API owns (conversations, messages, search results). It lives in the
  [TanStack Query](https://tanstack.com/query) cache and is read through the **Orval-generated hooks** in
  `src/libs/api/generated/**`; the cache owns loading, errors, dedup and refetching.
- **Client state** is what the browser owns (drawer open, selected model, input text). It lives in
  [Zustand](https://zustand.docs.pmnd.rs/) stores.
- **Chat streaming** is neither: `useChatStream` keeps its bespoke SSE `fetch` and writes the live reply
  into `useChatStreamStore`.

### Server state — the generated hooks

- Import the generated hook (`useGetConversation`, `useListConversationsInfinite`, …) from its per-resource
  file, e.g. `@/libs/api/generated/conversations/conversations`. Regenerate with `pnpm frontend
generate:api` after any backend change; generated files are never hand-edited.
- Wrap it in a module hook in `/hooks/` when the view needs another shape: `useConversations` flattens the
  pages with `select`. Type the view with the generated models (`Conversation`, `Message`); never re-declare
  or alias them by hand. Components that call the same hook
  share one request (react-query dedupes by query key), so no provider distributes server state.
- Use the plain, non-suspense hooks (`useSuspenseQuery: false` in `orval.config.ts`) and drive skeletons off
  `isPending` / `isFetchingNextPage`.
- **Errors are typed.** The axios interceptor in `libs/api/client.ts` rejects every failed request with an
  `AppError` from `@nebula-chat/errors`, built by `libs/api/utils/toAppError.ts`: an envelope keeps its code
  and message, anything else gets a code from its status and a generic message. `query.error` is therefore an `AppError` whose `message` is safe to
  show. The global `onError` in `libs/api/queryClient.ts` toasts every failure once; a component reads
  `query.error` only for an inline state. A mutation whose form shows its failure inline sets
  `meta: { inlineError: true }` and is not toasted.
- **After a write the cache cannot see, invalidate** with the generated key helpers:
  `queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() })`. `useChatStream` invalidates the
  list on `conversation-created`, and the list, conversation detail and messages on `end` (a messages
  refetch mid-stream would race the reply). Invalidate rather than hand-seed with `setQueryData`.

### Auth state — better-auth

Auth is not in `openapi.yaml`, so it goes through better-auth's own client (`libs/auth/client.ts`), never
Orval. `AuthGate` (around the routes in `routing/RouterProvider.tsx`) resolves `get-session` and, with no
session, mints a Guest via `signIn.anonymous()` before any route renders — the server never mints one and
every API route `401`s without a session. Read the session with `useAuth`, which wraps better-auth's
`useSession`; never copy it into a Zustand store or `useState`.

### Client state — Zustand

**Never use `useState`.** Client state lives in Zustand stores.

| Scenario                                                       | Use                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| Anything read from or written to the API                       | Generated react-query hook (see above)                      |
| State shared across two or more components                     | Zustand store                                               |
| Global UI state (drawer, search overlay, viewport height)      | Zustand store                                               |
| DOM measurements shared across instances (e.g. `useMultiLine`) | Zustand store keyed by content                              |
| Form field values, validation and submit state                 | react-hook-form (see [Forms](#forms))                       |
| Debounce timers                                                | Module-level variable alongside the store — not React state |
| Tracking a previous value across renders                       | `useRef` — not state                                        |
| Any other "local" state                                        | Zustand store in the owning module                          |

### Folder rules

- Zustand stores go in `/stores/` under the owning module or `shared/stores/` if global.
- Hooks (query wrappers and hooks that consume stores) go in `/hooks/`.
- One store file per concern. A store holds no API calls and does no work at module load; a query hook
  fetches on mount.

### Store conventions

Define state and named actions together in a single `create()` call. Prefer action names that express intent over generic setters:

```ts
// correct — expressive actions
export const useSearchStore = create<SearchState>((set) => ({
  isSearchOpen: false,
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
}));

// avoid — unclear intent at call site
export const useSearchStore = create<SearchState>((set) => ({
  isSearchOpen: false,
  setIsSearchOpen: (value: boolean) => set({ isSearchOpen: value }),
}));
```

Inside an action, read current state with `get()` rather than a value closed over earlier.

Store types that are referenced outside the store file must live in `/types/types.ts`.

### React Context

Server state is shared through the query cache and client state through Zustand, so neither needs a
context. The providers in `App.tsx` (`QueryClientProvider`, theme, Chakra) are library wiring. When a
context is genuinely needed, split it across two files:

- **`context/<Name>Context.tsx`** — `createContext` + the typed `use<Name>Context()` hook. No JSX, no store imports.
- **`providers/<Name>Provider.tsx`** — the provider component, memoizing its value and rendering `<Context.Provider>`.

### Existing stores

| Store                         | Location                        | Owns                                                             |
| ----------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `useConversationsSearchStore` | `modules/conversations/stores/` | Search text and its debounced copy (the results are a query)     |
| `useChatStreamStore`          | `modules/chat/stores/`          | History, stream flag, usage, conversation ID, message allowance  |
| `useMessageStore`             | `modules/chat/stores/`          | Current message input value                                      |
| `useModelStore`               | `modules/chat/stores/`          | Selected AI model                                                |
| `useModelSelectorStore`       | `modules/chat/stores/`          | Model dropdown open state and trigger width                      |
| `useSearchStore`              | `shared/stores/`                | Search overlay open/closed                                       |
| `useDrawerStore`              | `shared/stores/`                | Mobile drawer open/closed                                        |
| `useViewportStore`            | `shared/stores/`                | Viewport height string (updated on resize)                       |
| `useMultiLineStore`           | `shared/stores/`                | Per-content multi-line detection map (`Record<string, boolean>`) |
| `usePasswordVisibilityStore`  | `modules/auth/stores/`          | Which password fields are unmasked, per field name               |
| `usePasswordChangeStore`      | `modules/settings/stores/`      | Whether the Settings Password row's change form is unfolded      |
| `useSettingsSearchStore`      | `modules/settings/stores/`      | The settings search text                                         |

---

## Components

- Components live in `modules/<module>/components/` or `shared/components/`.
- **One component per file.** Never define multiple components, hooks, or significant logic in a single file. No co-located sub-components, no local helper components at the bottom of a file — every component gets its own file.
- Components read from stores and hooks — they do not own significant state themselves.
- Use Chakra UI primitives. Custom UI wrappers live in `shared/components/ui/`.
- Responsive layout decisions (`isMobile`, `showSidePanels`) come from `useResponsiveLayout`.
- **All static text must live in `resources.ts`.** If it is a string shown in the UI — button labels, placeholders, error messages, hints, empty states, tooltips — it goes in `resources.ts`. Never hardcode UI strings inline in components or utilities.

---

## Forms

Forms use [react-hook-form](https://react-hook-form.com) with a [zod](https://zod.dev) schema through
`zodResolver`. `AuthForm` in `modules/auth/components/` is the reference: sign-in, sign-up, forgot and
reset, change password and delete account are one component fed its configs (`utils/authForms.ts`), not copies —
variants of a form differ by config. A config with a `successMessage` replaces the form with it once
submitted; one without clears its fields and calls `onSuccess` (the change-password form stays on `/settings`
and toasts). `header` trims the form's own heading where the page already labels it: `description` under a
dialog's title, `none` inside a labelled settings row.

- **The schema is the source of truth.** It lives in the owning module's `utils/` (`authSchemas.ts`), its
  messages come from `resources.ts`, and the form's value type is `z.infer<typeof schema>` in
  `types/types.ts` — never a hand-written duplicate.
- `useForm({ resolver: zodResolver(schema), mode: 'onTouched' })`: a field validates on first blur, then
  on every change, so an error clears as soon as it is fixed. Set `noValidate` on the `<form>` so the
  browser's own bubbles never pre-empt the schema.
- **A field checked against another** (a confirmation, new ≠ current) sets `comparedWith` in its field
  config, so it re-validates once touched as that other field changes; the rule itself is an object
  refinement in the schema (`compareFields` in `authSchemas.ts`), which zod otherwise skips while any field
  is invalid.
- **Errors render under their field.** Wrap each input in Chakra's `Field.Root invalid={…}` with a
  `Field.ErrorText`; Field wires `aria-invalid` and `aria-errormessage`, so tests assert with
  `toHaveAccessibleErrorMessage`.
- **Server failures go through `setError`.** One that belongs to a field goes under it
  (`setError('password', …)`); anything else goes to `root.server` and renders as an alert above the
  fields. Flag that mutation `meta: { inlineError: true }` so it is not toasted too.
- Field values belong to react-hook-form — never mirror them into a Zustand store. UI state around a form
  (e.g. password masking) is still a Zustand store.

---

## Hooks

Hooks in `/hooks/` are thin wrappers that read from stores or query hooks and compose logic. They must not duplicate state that already lives in a store or the query cache.

```ts
// correct — delegates entirely to stores
export const useDrawer = () => {
  const { isDrawerOpen, openDrawer, closeDrawer, toggleDrawer } = useDrawerStore();
  const { isSearchOpen, openSearch, closeSearch, toggleSearch } = useSearchStore();
  return {
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    isSearchOpen,
    openSearch,
    closeSearch,
    toggleSearch,
  };
};

// wrong — re-introduces local state that belongs in a store
export const useDrawer = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // never do this
};
```

Utility hooks that are inherently parameterised per call-site (`useDebounce`, `useEventListener`) may use `useRef` — they cannot be singleton stores.

---

## `useEffect` rules

**Never use `useEffect`.** Reference: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

| Pattern                            | Wrong                            | Right                                                                             |
| ---------------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| Derived / computed state           | `useEffect` → `setState`         | Compute inline during render or `useMemo`                                         |
| Syncing state on prop/route change | `useEffect` → Zustand `set`      | Guarded render-time write (see `useConversation.ts`)                              |
| Fetching data on mount             | `useEffect(() => fetch(), [])`   | Generated react-query hook, which fetches on mount (see `useConversations.ts`)    |
| Refreshing data after a write      | `useEffect` → refetch            | `queryClient.invalidateQueries` where the write happens (see `useChatStream.ts`)  |
| Reading a browser API value        | `useEffect` + `useState`         | `useSyncExternalStore` (see `useViewportHeight.ts`)                               |
| DOM measurement after mount        | `useRef` + `useEffect`           | Callback ref — `ref={useCallback((node) => { ... }, [])}` (see `useMultiLine.ts`) |
| Registering a DOM event listener   | `useEffect` + `addEventListener` | `useEventListener` via `useSyncExternalStore` subscribe lifecycle                 |

New code reaches for the patterns above. Two `useEffect` calls predate this rule and remain until they are
reworked: `ChatContainer` (clearing the post-stream flags, scrolling to the newest message) and `Layout`
(closing mobile search when the desktop layout appears). Add no others.

---

## Shared Utilities

- `@nebula-chat/errors` — the error vocabulary shared with the server (ADR-0011). The generated hooks already
  reject with its `AppError`; the SSE stream reads an error body or `error` frame with
  `parseErrorEnvelope(value)` and shows its `message`. Switch on the error code (`AppError.code`), not the
  HTTP status (a `MessageAllowanceReached` and a `Forbidden` are both 403s).
- `shared/config/serverConfig.ts` — `SERVER_CONFIG.BASE_URL` (the axios `baseURL`) and `getApiEndpoint(path)`
  (the SSE `fetch`) come from `VITE_API_URL`. Never hardcode API base URLs.
- `shared/config/paginationConfig.ts` — `paginationConfig.defaultLimit` for page sizes.

---

## Environment Variables

`apps/nebula-chat-client/.env`:

| Variable       | Purpose                                                    |
| -------------- | ---------------------------------------------------------- |
| `VITE_API_URL` | Base URL of the backend API (e.g. `http://localhost:3000`) |

---

## Testing

The monorepo-wide rules live in the root [`AGENTS.md`](../../AGENTS.md#testing) and
[ADR-0008](../../docs/adr/0008-vitest-unit-testing-with-an-enforced-coverage-gate.md). Frontend specifics:

```bash
pnpm frontend test             # vitest run
pnpm frontend test:watch
pnpm frontend test:coverage
```

- **Environment is `jsdom`**, not `happy-dom` — Chakra UI v3 leans on layout and `matchMedia` APIs where
  happy-dom has gaps.
- **React Testing Library for components.** Query by role and accessible name, never by test id or class.
  If a component is hard to query by role, that is usually an accessibility bug worth fixing rather than a
  reason to reach for `container.querySelector`.
- **Mock HTTP with the MSW handlers Orval generates, never with a hand-written URL and never by stubbing
  the hooks.** `orval.config.ts` sets `mock.generators: [{ type: 'msw' }]`, so every documented success
  response has a handler beside the client (`src/libs/api/generated/**/**.msw.ts`) built from the same
  OpenAPI document the backend emits:

  ```ts
  server.use(getListConversationsMockHandler({ conversations, nextCursor: null, hasMore: false }));
  ```

  The generated handlers match any origin, which is what keeps `http://localhost:3000` out of tests. Three
  things have no generated handler: failure responses (Orval emits only the documented success),
  `/api/chat/stream` (excluded from Orval by tag — it streams SSE) and better-auth's `/api/auth/*`. Their
  routes live in `@/test/api`, the one place route strings are written; `@/test/auth` holds the auth
  fixture and handlers (`aSession`, `mockGetSession`, `mockAnonymousSignIn`, `mockEmailSignIn`,
  `mockEmailSignUp`, `mockSocialSignIn` (its redirect is a hash change to `providerConsentUrl()`, the one
  navigation jsdom performs), `mockSignOut`, `mockRequestPasswordReset`, `mockResetPassword`, `mockChangePassword`, `mockUpdateUser`, `mockRevokeSessions`, `mockDeleteUser`, `mockListAccounts`,
  `mockSendVerificationEmail`) plus `refreshSession`, which refetches better-auth's module-level session
  store after a render, and `holdSession`, which serves a session and waits until that store holds it. Regenerate with `pnpm frontend generate:api` after any backend change.

- **Pick a Chakra menu item with `selectMenuItem` (`@/test/menu`)**, not `userEvent.click`: Zag only
  selects a pointer-highlighted item, and jsdom's (0, 0) pointer events stop highlighting once anything
  switches its interaction modality, so a click can silently select nothing. Selection navigates a tick
  later, so assert the destination with `findBy*`.

- **One test file per source file, in a `tests/` folder beside it**: `ChatInput.tsx` is tested by
  `components/tests/ChatInput.test.tsx`. Never group several modules into one file.
- **`tsconfig.app.json` declares the Vitest and testing-library types.** The build runs `tsc -b` over
  `include: ["src"]`, so tests are typechecked — without those `types` entries the build fails
  on `describe` and `expect`.
- **Render inside a fresh query client.** `renderWithChakra` and `renderHookWithQueryClient` (`@/test/render`)
  each create one per test with retries off, so no cached response leaks between tests and a failure
  surfaces at once. Pass your own `queryClient` to prime or inspect the cache, e.g. assert an invalidation
  with `queryClient.getQueryState(key)?.isInvalidated`.
- **Hooks and pages are the highest-value targets.** Drive query hooks and the components that use them
  through MSW rather than stubbing the generated hooks. Zustand stores are module-level singletons, so
  reset state between tests rather than relying on fresh imports.
- **Coverage-excluded**: `src/theme/**` (Chakra tokens) and `src/libs/api/generated/**` (Orval output).
  Everything else faces the 80% bar.
