import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AuthPage } from '@/modules/auth/AuthPage';
import { optionalSearchText } from '@/routing/searchParams';

// `error`: the code better-auth's `errorCallbackURL` adds after a failed social sign-in.
const searchSchema = z.object({
  error: optionalSearchText(),
});

export const Route = createFileRoute('/auth/')({
  validateSearch: searchSchema,
  component: AuthPage,
});
