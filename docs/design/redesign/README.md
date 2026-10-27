# Redesign visual reference

The agreed look of the redesigned client (epic #530) and the screens that build on it: the admin
dashboard (#531), Model usage (#533), the Run UI from nebula-chat 2.0 (#349) and the CLI's device page
(#563). A ticket that names a screenshot here is implemented to match it.

The screenshots live in a Claude artifact, not in the repo: the one titled **Nebula Redesign Mockups**.
It holds every PNG under `shots/`, the static HTML mock that renders them under `mock/`, and the
review notes. The mock uses the real tokens from `apps/client/src/styles/globals.css`, the model
catalog's labels and the worker's Step labels; copy and data are examples. Where a ticket and a
screenshot disagree, the ticket's acceptance criteria win and the screenshot gets updated.

The artifact is private to the repository owner's Claude account, so only Claude sessions signed in
as the owner can open it.

## How to use it

- **Finding it:** list your artifacts with the Artifact tool (`action: "list"`) and take the one
  titled "Nebula Redesign Mockups".
- **Implementing a ticket:** fetch each screenshot listed for it below with the Artifact tool:
  `action: "read"` on that artifact's URL with `path: "shots/<file>.png"`. Then open the saved file
  with `Read` before writing the UI, and put a screenshot of your result in the PR.
- **Spacing and sizes:** fetch `mock/styles.css` the same way. It holds the exact values (panel
  widths, radii, type sizes); read the class for the element rather than measuring the PNG.
- **Changing the design:** see [Regenerating](#regenerating), then update this README if a rule
  changes and the tickets if a decision does.

## Design rules

These came out of the mockup review and apply to every screen.

- **Logo.** The header keeps today's mark: Tabler's `galaxy` icon (the current `TbGalaxy`) and the
  "nebula chat" wordmark. Lucide has no galaxy, so it is inlined as an SVG component.
- **No solid-white surfaces in dark mode.** The send button is the only element filled with the
  foreground colour. In dark mode, primary buttons use a raised neutral (`#262626`, border
  `#3a3a3a`, foreground text), and badges (Admin included) and tooltips use outline or popover
  surfaces. Light mode keeps the near-black primary.
- **"tokens", never "tok".** Write the full word in every label, tooltip and table.
- **Account in one place.** The left panel's footer is the account menu (Settings, Open admin, sign
  out). The header has no avatar. Guests get Sign in and Sign up in the footer.
- **Avatars are neutral.** Initials sit on a raised neutral circle until the User uploads an image.
- **Session title in the header**, after the panel toggle, on desktop and mobile.
- **Settings is a modal** over the app, like Claude's, with no route of its own (#552).
- **The Inspector's Session tab never shows the system prompt.**
- **Status colours only for status.** Green, amber and red mark state; provider logos are the only
  other colour.

## Screens

| `shots/` file | What it shows | Tickets |
| --- | --- | --- |
| `chat-empty.png` | New chat: greeting, composer, starter prompts; Inspector shows the Model a new chat uses | #547 #548 #549 #551 |
| `chat-thread.png` | Thread with a code block, a GFM table, the meta row (hover state) and the context ring at rest | #549 #551 #665 #666 |
| `model-picker.png` | Model picker filtered by "gpt", grouped by provider | #550 #566 |
| `guest.png` | Guest: disabled Run toggle with its tooltip, the allowance counter, Sign in and Sign up in the footer | #549 #652 |
| `palette.png` | Command palette on ⌘K | #554 |
| `archive.png` | Archive icon on a hovered Session row, and the undo toast | #548 |
| `archived-session.png` | An archived Session opened by id: read-only, with a Restore bar instead of the composer | #552 |
| `context-hover.png` | Context ring tooltip | #666 |
| `context-details.png` | Context ring popover | #666 |
| `run-streaming.png` | Run in progress: Intake, Orchestrator turns with parallel delegates, a failed delegate | #652 #662 |
| `run-finished.png` | Partial Run: end status, Run chip, and the Inspector's Run tab with an expanded failed Step | #662 #362 #551 |
| `run-clarify.png` | Run waiting on a Clarifying question | #585 |
| `settings-security.png` | Settings modal, Security: inline 2FA setup and the Admin 2FA notice | #552 #556 |
| `settings-appearance.png` | Settings modal, Appearance: theme and font | #552 |
| `settings-archived.png` | Settings modal, Archived Sessions: Open and Restore | #552 |
| `settings-account.png` | Settings modal, Account & data: Admin-read notice, Pending-deletion wording | #552 #544 |
| `auth-signin.png` | Sign in | #553 |
| `auth-states.png` | 2FA challenge, Pending deletion restore, banned, sign-up with a pending email | #553 |
| `device.png` | CLI device approval page | #563 |
| `admin-overview.png` | Admin Overview: KPI tiles, sparklines, latest Audit entries, no right panel | #560 #570 |
| `admin-usage.png` | Model usage: toolbar, tiles, stacked area, ranked list, per-Model detail on the right | #569 #568 |
| `admin-users.png` | Users table and a banned User's detail with actions | #557 #558 |
| `admin-ban.png` | Ban dialog | #558 |
| `admin-audit.png` | Audit log with a selected entry's JSON | #556 |
| `admin-session.png` | Read-only Session transcript with the audit banner | #559 |
| `m-chat.png`, `m-drawer.png`, `m-sheet.png` | Mobile (390 px): chat, left panel as a drawer, Inspector as a bottom sheet | #547 #551 |
| `*-light.png` | Light-mode versions of `chat-empty`, `chat-thread`, `run-finished`, `admin-usage`, `settings-appearance` | as above |

## Regenerating

1. Fetch every file under `mock/` from the artifact (`action: "list"`, `scope: "files"` names them)
   into one folder.
2. Edit `screens.js` (one function per screen) or `lib.js` (shell, composer, Inspector) and
   `styles.css`. Open `index.html?s=<screen>&theme=light` in a browser to see a screen live.
3. Render with Playwright and Chromium: `node shoot.js . shots all 2` for every screen at 2x, or
   `node shoot.js . shots chat-thread 2` for one.
4. Republish the artifact at the same URL with the changed `shots/` and `mock/` files.
