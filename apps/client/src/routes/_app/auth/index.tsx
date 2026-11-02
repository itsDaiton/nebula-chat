import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AuthPage } from '@/modules/auth/AuthPage';
import { optionalSearchError, optionalSearchText } from '@/routing/searchParams';

// `error` and `error_description`: what better-auth's `errorCallbackURL` adds after a failed social sign-in.
// `pending` and `restoreToken`: a social sign-in found the User in Pending deletion (the Purge date, the restore token).
const searchSchema = z.object({
  error: optionalSearchError(),
  error_description: optionalSearchText(),
  pending: optionalSearchText(),
  restoreToken: optionalSearchText(),
});

export const Route = createFileRoute('/_app/auth/')({
  validateSearch: searchSchema,
  component: AuthPage,
});
