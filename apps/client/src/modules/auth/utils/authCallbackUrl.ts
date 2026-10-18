import { route } from '@/routing/routes';

/** An absolute client URL for better-auth to redirect an emailed link back to. */
export const authCallbackUrl = (path: string) => new URL(path, window.location.origin).toString();

/** Where a verification email's link lands, for sign-up and a resend alike. */
export const verifyEmailCallbackUrl = () => authCallbackUrl(route.auth.verifyEmail());

/** Where better-auth sends the browser once a social sign-in's provider callback succeeds. */
export const socialSignInCallbackUrl = () => authCallbackUrl(route.chat.root());

/** Where it sends the browser, with `?error=<code>`, when that callback fails. */
export const socialSignInErrorCallbackUrl = () => authCallbackUrl(route.auth.root());
