---
paths:
  - 'apps/client/src/**/components/**'
  - 'apps/client/src/shared/pages/**'
  - 'apps/client/src/resources.ts'
---

# Components

- Components live in `modules/<module>/components/` or `shared/components/`.
- **One component per file.** Never define multiple components, hooks, or significant logic in a single file. No co-located sub-components, no local helper components at the bottom of a file — every component gets its own file.
- Components read from stores and hooks — they do not own significant state themselves.
- Use Chakra UI primitives. Custom UI wrappers live in `shared/components/ui/`.
- **Redesign (epic #530).** New surfaces build on the shadcn/ui base components in `shared/components/ui/`
  (Base UI primitives, `components.json` style `base-nova`; add one with `pnpm dlx shadcn add <name>`, then
  convert it to arrow functions, drop `'use client'` and move any UI string into `resources.ts`). Each such
  file holds one component family with its prop types inline, the exception to one-component-per-file and
  to `types/types.ts`. Style them with Tailwind
  utilities over the tokens in `styles/globals.css` (`bg-panel`, `text-muted-foreground`, `border-border`,
  `font-mono` for metadata and ids, `tabular-nums` for numbers), never raw colours. Until Chakra is removed
  (NEB-555), Tailwind's preflight is off and its utilities are unlayered so they beat Chakra's layered
  reset; a small reset scoped to `[data-slot]` stands in for preflight on the new components.
- **Icon-only buttons use `IconButton`** (`shared/components/ui/icon-button.tsx`): it takes a `label` that is both the
  accessible name and the tooltip, so no icon is unnamed on hover. A bare `Button` with just an icon is a bug.
- **Chat surfaces (NEB-549)** are Tailwind over the same tokens. Assistant markdown goes through
  `MarkdownContent`: prose styles live in `.chat-prose` (`styles/globals.css`), and a fenced block becomes the
  `CodeBlock` (language label, copy), highlighted by `utils/highlightCode.ts` with Shiki's `css-variables` theme,
  so one render serves both modes from the `--shiki-*` variables. A Message's meta row shows only what the
  Message carries (Model, tokens, estimated cost, Run) and nothing while a field is null.
- **Command palette.** `Ctrl/⌘ K` opens `modules/commandPalette`. A module adds its actions with
  `useRegisterPaletteActions([...])` (`{ id, group, label, keywords, icon, shortcut?, perform, visible? }`),
  called from a component that is always mounted (see `useSessionPaletteActions`, called by `AppShell`); they
  are listed while it stays mounted, and `visible: false` hides one (Open admin). Sessions come from the
  search API, not the registry.
- Responsive layout decisions (`isMobile`, `showSidePanels`) come from `useResponsiveLayout`.
- **All static text must live in `resources.ts`.** If it is a string shown in the UI — button labels, placeholders, error messages, hints, empty states, tooltips — it goes in `resources.ts`. Never hardcode UI strings inline in components or utilities.
