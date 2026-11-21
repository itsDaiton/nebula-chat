---
paths:
  - 'apps/client/src/**/components/**'
---

# Loading states — what a control shows while its action runs

A control that fires a mutation or async request shows that it is working. Data a surface fetches is a
separate concern: see [client-data-states](client-data-states.md).

- **Pass `loading={mutation.isPending}`** to `Button` or `IconButton`. The primitive owns the behaviour: a
  spinner that replaces the leading icon (or goes before the label), native `disabled`, `aria-busy`, no clicks,
  same size. Never hand-roll a `Loader2Icon` or set `aria-busy` on a button yourself.
- **Menu items** take the same `loading` prop on `DropdownMenuItem`; keep the menu open (`closeOnClick={false}`)
  so the spinner is seen.
- **A text button that names an action also swaps its label**: `isPending ? copy.saving : copy.save`, with both
  strings in `resources.ts`. Icon buttons, menu items and toggles show only the spinner.
- **Grouped controls compete for one pending action** (Approve/Deny, per-row Restore, social providers): only
  the clicked control gets `loading`, found from the mutation's `variables`; its siblings are `disabled`.
- **State over two mutations needs the combined flag**, or each control its own mutation's flag when the user
  can tell which one they used (`ProfileImageSetting`).
- **Not covered:** `SendButton` (the transcript shows the stream), instant local actions such as copy, and
  optimistic updates that remove the control at once (archive).
- **Tests** assert `aria-busy="true"` on the control while the request is held, as `client-data-states` does for
  regions; a group test asserts the siblings are `disabled` and not busy.
