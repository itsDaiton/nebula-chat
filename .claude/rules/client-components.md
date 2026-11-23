---
paths:
  - 'apps/client/src/**/components/**'
  - 'apps/client/src/shared/pages/**'
  - 'apps/client/src/resources.ts'
---

# Components

- Components live in `modules/<module>/components/` or `shared/components/`.
- **One component per file** (not lint-enforced: `react/no-multi-comp` crashes on ESLint 10, so check it in review). Never define multiple components, hooks, or significant logic in a single file. No co-located sub-components, no local helper components at the bottom of a file — every component gets its own file.
- Components read from stores and hooks — they do not own significant state themselves.
- **Base components.** Surfaces build on the shadcn/ui components in `shared/components/ui/`
  (Base UI primitives, `components.json` style `base-nova`; add one with `pnpm dlx shadcn add <name>`, then
  convert it to arrow functions, drop `'use client'` and move any UI string into `resources.ts`). Each such
  file holds one component family with its prop types inline, the exception to one-component-per-file and
  to `types/types.ts`. Style them with Tailwind
  utilities over the tokens in `styles/globals.css` (`bg-panel`, `text-muted-foreground`, `border-border`,
  `font-mono` for metadata and ids, `tabular-nums` for numbers), never raw colours. Tailwind's preflight is
  global, so a bare heading or list has no browser styling.
- **Toasts** are sonner's `toast` (`toast.success(title)`, `toast.error(title, { description })`); the one
  `Toaster` is mounted in `RootLayout`. Icons come from `lucide-react`; a brand mark it lacks is an inline SVG.
- **Icon-only buttons use `IconButton`** (`shared/components/ui/icon-button.tsx`): it takes a `label` that is both the
  accessible name and the tooltip, so no icon is unnamed on hover. A bare `Button` with just an icon is a bug.
- **Chat surfaces (NEB-549)** are Tailwind over the same tokens. Assistant markdown goes through
  `MarkdownContent`: prose styles live in `.chat-prose` (`styles/globals.css`), and a fenced block becomes the
  `CodeBlock` (language label, copy), highlighted by `utils/highlightCode.ts` with Shiki's `css-variables` theme,
  so one render serves both modes from the `--shiki-*` variables. A Message's meta row shows only what the
  Message carries (Model, tokens, estimated cost, Run) and nothing while a field is null.
- **Run inspection (NEB-362).** An assistant Message with a `runId` shows one `RunCard` above its answer: its header
  (status, Step count, duration) calls `selectRun(runId)` and its chevron expands the Steps in place. The Inspector has no tabs: a Run Session shows `RunView` (opened on its newest Run, under a short Session header), a Direct one the Session view, and a new chat follows the Run toggle. `RunView` renders: the end
  status and why, tokens against the Run budget, the Brief, and the Steps grouped by Intake, turn and answer.
  A Step expands to its facts; its full input and output open in a dialog. Both read the Run through `useRun`.
- **Run toggle and Step progress (NEB-652).** `RunToggle` picks a new chat's Reply mode for a Registered
  user, then shows the Session's mode read-only (ADR-0035), and stays disabled for a Guest; while a Run is drafted or a
  Run Session is open, `ModelSelect` is disabled with a tooltip. An assistant Message with a `runId` shows `RunCard` above its answer: live Steps from `message.run`
  while it streams, otherwise the saved Run through `useRun` (`utils/mapSavedRun.ts`), so a reload or route change keeps it.
  It is open while the Run streams and collapsed once it ends; `useRunCardStore` keeps only the User's choice per Run id.
  `RunEndNote` explains a `partial`, `failed` or `cancelled` end inside the open card.
- **Orchestrator turns (NEB-662).** Once a Run has an Orchestrator turn, `RunCard` lists `RunProgressGroup`s:
  Intake, one per turn with its delegate Steps railed under the turn's Step, then the answer. A Run with no turn
  keeps the flat list. `RunEndNote` names each failed delegate and its turn under a partial answer.
- **Clarifying question.** The assistant Message of a waiting Run (`useWaitingRun`) shows `RunWaitingRow`, a
  "Clarifying question" label and `ClarifyingQuestionNote`, with no meta row. `AnswerHintRow` sits above the
  composer with Cancel Run; `RunToggle` is disabled and `ModelSelect` disabled, as in any Run Session.
- **Command palette.** `Ctrl/⌘ K` opens `modules/commandPalette`. A module adds its actions with
  `useRegisterPaletteActions([...])` (`{ id, group, label, keywords, icon, shortcut?, perform, visible? }`),
  called from a component that is always mounted (see `useSessionPaletteActions`, called by `AppShell`); they
  are listed while it stays mounted, and `visible: false` hides one (Open admin). Sessions come from the
  search API, not the registry.
- **A surface that fetches shows its loading and refetch states** per [client-data-states](client-data-states.md).
- **A control that fires a mutation passes `loading`** per [client-loading-states](client-loading-states.md).
- Responsive layout decisions (`isMobile`, `showSidePanels`) come from `useResponsiveLayout`.
- **All static text must live in `resources.ts`.** If it is a string shown in the UI — button labels, placeholders, error messages, hints, empty states, tooltips — it goes in `resources.ts`. Never hardcode UI strings inline in components or utilities. The exception is the decorative Waiting phrases, which live in `src/waitingPhrases.ts` so the list doesn't bloat `resources.ts`.
