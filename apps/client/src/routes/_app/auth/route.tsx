import { createFileRoute } from '@tanstack/react-router';

// The auth layout: each page renders its own AuthLayout card, and the `_app` session guard already
// mints the Guest these pages need, so the layout only groups the four routes under `/auth`.
export const Route = createFileRoute('/_app/auth')({});
