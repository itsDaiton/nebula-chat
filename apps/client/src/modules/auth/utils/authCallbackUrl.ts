import type { LinkProps } from '@tanstack/react-router';

const absoluteUrl = (path: string) => new URL(path, window.location.origin).toString();

/** An absolute client URL for better-auth to redirect an emailed link back to. */
export const authCallbackUrl = (path: NonNullable<LinkProps['to']>) => absoluteUrl(path);

/** Where a verification email's link lands, for sign-up and a resend alike. */
export const verifyEmailCallbackUrl = () => authCallbackUrl('/auth/verify-email');

/** Where better-auth sends the browser once a social sign-in's provider callback succeeds. */
export const socialSignInCallbackUrl = () => authCallbackUrl('/');

/** Where it sends the browser, with `?error=<code>`, when that callback fails. */
export const socialSignInErrorCallbackUrl = () => authCallbackUrl('/auth');
