import { route } from '@/routing/routes';

/** An absolute client URL for better-auth to redirect an emailed link back to. */
export const authCallbackUrl = (path: string) => new URL(path, window.location.origin).toString();

/** Where a verification email's link lands, for sign-up and a resend alike. */
export const verifyEmailCallbackUrl = () => authCallbackUrl(route.auth.verifyEmail());
