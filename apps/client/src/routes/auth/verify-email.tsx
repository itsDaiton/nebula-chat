import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { VerifyEmailPage } from '@/modules/auth/VerifyEmailPage';
import { optionalSearchError } from '@/routing/searchParams';

// better-auth verifies the emailed token itself and redirects here, adding `?error` on a rejection.
const searchSchema = z.object({
  error: optionalSearchError(),
});

export const Route = createFileRoute('/auth/verify-email')({
  validateSearch: searchSchema,
  component: VerifyEmailPage,
});
