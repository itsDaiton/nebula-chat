import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ResetPasswordPage } from '@/modules/auth/ResetPasswordPage';
import { optionalSearchError, optionalSearchText } from '@/routing/searchParams';

// better-auth redirects the emailed link here with `?token`, or `?error` once it rejected it.
const searchSchema = z.object({
  token: optionalSearchText(),
  error: optionalSearchError(),
});

export const Route = createFileRoute('/_app/auth/reset-password')({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
});
