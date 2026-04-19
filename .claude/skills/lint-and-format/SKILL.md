---
name: lint-and-format
description: Run pnpm lint:fix and pnpm format across the monorepo and surface any remaining issues. Use before commits, after large edits, or when the user says "lint" or "clean up formatting".
allowed-tools: Bash
---

# Lint and Format

Runs the monorepo-wide ESLint (auto-fix) and Prettier.

## Steps
1. Auto-fix:
   ```
   pnpm lint:fix
   ```
2. Format:
   ```
   pnpm format
   ```
3. Verify zero-warning policy:
   ```
   pnpm lint
   ```
4. If step 3 reports any errors/warnings, list them with file:line references — do not attempt to auto-suppress.
