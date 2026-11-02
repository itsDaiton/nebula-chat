import { FaGithub, FaGoogle } from 'react-icons/fa';
import type { SocialProviderConfig } from '@/modules/auth/types/types';
import { resources } from '@/resources';

const { social } = resources.auth;

export const SOCIAL_PROVIDERS: SocialProviderConfig[] = [
  { provider: 'github', label: social.github, icon: FaGithub },
  { provider: 'google', label: social.google, icon: FaGoogle },
];

// The `?error=` better-auth's OAuth callback (or the provider, for `access_denied`) redirects with.
const CALLBACK_ERRORS: Partial<Record<string, string>> = {
  access_denied: social.errors.cancelled,
  account_not_linked: social.errors.accountNotLinked,
  email_not_found: social.errors.emailNotFound,
};

/** The copy for a failed provider callback's `?error=` code, or nothing without one. */
export const socialCallbackError = (code: string | undefined) =>
  code ? (CALLBACK_ERRORS[code] ?? social.errors.failed) : undefined;
