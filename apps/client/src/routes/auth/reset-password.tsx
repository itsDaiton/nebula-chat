import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ResetPasswordPage } from '@/modules/auth/ResetPasswordPage';
import { optionalSearchText } from '@/routing/searchParams';

// better-auth redirects the emailed link here with `?token`, or `?error` once it rejected it.
const searchSchema = z.object({
  token: optionalSearchText(),
  error: optionalSearchText(),
});

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
});
