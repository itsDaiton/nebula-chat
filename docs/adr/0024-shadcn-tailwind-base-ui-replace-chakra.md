# ADR-0024: Replace Chakra UI with shadcn/ui on Base UI and Tailwind v4, rewritten on one integration branch

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** @itsDaiton

## Context

The client is built on Chakra UI v3: about 70 files import it, the theme lives in Chakra semantic
tokens, and the test helpers (`renderWithChakra`, `selectMenuItem`) lean on Chakra and Zag. The app
is getting a full visual redesign (a monochrome, dense, T3 Code-like look inside the existing header
and three-panel layout), an admin dashboard, and chat surfaces that most current references build
from shadcn-style components: T3 Code (Tailwind v4 + Base UI), Vercel's chatbot template, shadcn's
own chat components, prompt-kit.

Chakra's token and recipe system could produce the same look. The redesign touches every component anyway, so the cost of switching is at its lowest now.

## Decision

1. **Tailwind v4 + shadcn/ui, with Base UI as the primitive layer.** Components are copied into the client and owned there (`shared/components/ui/`); theming is CSS variables, light and dark, through the existing `next-themes`.
2. **lucide** replaces `react-icons`. Geist and Geist Mono are the type families.
3. **Chat building blocks come from shadcn's chat components and prompt-kit**, copied in. Vercel AI Elements is not used: it is coupled to the AI SDK's `useChat`, and our stream contract is our own (ADR-0014). `react-markdown` and `shiki` stay.
4. **react-hook-form stays.** shadcn's `Field` components are form-library agnostic.
5. **One big-bang rewrite on a long-lived integration branch.** Each redesign ticket is a PR into that branch; one PR merges it into `main` as a major client release. Client work on `main` is frozen meanwhile, apart from fixes, so nebula-chat 2.0's client tickets land after the redesign.

## Consequences

- Chakra, Emotion, Zag and `react-icons` leave the client. Test helpers become `renderWithProviders`, and the client AGENTS.md rules about Chakra are rewritten.
- The integration branch has to be kept merged with `main` (server and lib changes keep landing there).
- The look is specified by tokens, not by a component library's defaults, so a later restyle is a token change.

## Alternatives considered

- **Keep Chakra and retheme it.** Lowest churn, but the ecosystem of chat and dashboard blocks we want to copy is shadcn-shaped, and the redesign touches every file anyway.
- **Radix as shadcn's primitive layer.** Older and with more community blocks; Base UI is actively developed and is what T3 Code uses. shadcn supports both, so this is the cheapest part of the decision to reverse.
- **Incremental migration with Chakra and Tailwind side by side.** Every PR ships on its own, but two resets and two styling systems coexist for weeks and `main` carries a half-styled app.
