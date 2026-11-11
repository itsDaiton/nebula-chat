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
- **Run inspection (NEB-362).** An assistant Message with a `runId` shows the `RunChip` (status, Step count,
  duration), which calls `openInspector('run', runId)`. The Inspector's Run tab renders `RunView`: the end
  status and why, tokens against the Run budget, the Brief, and the Steps grouped by Intake, turn and answer.
  A Step expands to its facts; its full input and output open in a dialog. Both read the Run through `useRun`.
- **Run toggle and Step progress (NEB-652).** `RunToggle` switches the next message to Run mode for a Registered
  user and stays disabled for a Guest; while a Run is drafted or in flight, `ModelSelect` is `dimmed` and
  `ChatComposerFooter` says why. An assistant Message carrying `run` shows `RunStepProgress` above its answer
  (one row per Step, labelled by the stream) and `RunEndLine` under it for a `partial` or `failed` end.
- **Command palette.** `Ctrl/⌘ K` opens `modules/commandPalette`. A module adds its actions with
  `useRegisterPaletteActions([...])` (`{ id, group, label, keywords, icon, shortcut?, perform, visible? }`),
  called from a component that is always mounted (see `useSessionPaletteActions`, called by `AppShell`); they
  are listed while it stays mounted, and `visible: false` hides one (Open admin). Sessions come from the
  search API, not the registry.
- Responsive layout decisions (`isMobile`, `showSidePanels`) come from `useResponsiveLayout`.
- **All static text must live in `resources.ts`.** If it is a string shown in the UI — button labels, placeholders, error messages, hints, empty states, tooltips — it goes in `resources.ts`. Never hardcode UI strings inline in components or utilities. The exception is the decorative Waiting phrases, which live in `src/waitingPhrases.ts` so the list doesn't bloat `resources.ts`.
