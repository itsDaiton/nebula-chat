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
- Responsive layout decisions (`isMobile`, `showSidePanels`) come from `useResponsiveLayout`.
- **All static text must live in `resources.ts`.** If it is a string shown in the UI — button labels, placeholders, error messages, hints, empty states, tooltips — it goes in `resources.ts`. Never hardcode UI strings inline in components or utilities.
