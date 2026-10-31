---
paths:
  - 'apps/client/src/modules/auth/**'
  - 'apps/client/src/**/*Form*.tsx'
---

# Forms

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
