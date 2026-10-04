import { Button } from '@chakra-ui/react';
import { Link, useSearchParams } from 'react-router';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { AuthStatus } from '@/modules/auth/components/AuthStatus';
import { ResendVerificationButton } from '@/modules/auth/components/ResendVerificationButton';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

const { verifyEmail } = resources.auth;

/**
 * /auth/verify-email — better-auth verifies the emailed token, refreshes the session cookie and
 * redirects here, adding `?error=TOKEN_EXPIRED` (or another code) when it rejects the token.
 */
export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const { user, isPending, needsEmailVerification } = useAuth();
  const error = searchParams.get('error');
  // Wait for the refreshed session rather than flash a failure on a valid link.
  if (!error && isPending) return null;

  // Trust the session, not the bare URL: success means the email reads as verified.
  const isVerified = !error && user?.emailVerified === true;
  const failure = error === 'TOKEN_EXPIRED' ? verifyEmail.linkExpired : verifyEmail.linkInvalid;

  return (
    <AuthLayout>
      <AuthStatus
        title={isVerified ? verifyEmail.verifiedTitle : verifyEmail.failedTitle}
        status={isVerified ? 'success' : 'error'}
        message={isVerified ? verifyEmail.verified : failure}
      >
        {needsEmailVerification && <ResendVerificationButton />}
        <Button asChild variant={isVerified ? 'solid' : 'outline'}>
          <Link to={route.chat.root()}>{verifyEmail.continueToChat}</Link>
        </Button>
      </AuthStatus>
    </AuthLayout>
  );
};
