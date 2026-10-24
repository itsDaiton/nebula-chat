import { Button } from '@chakra-ui/react';
import { Link, getRouteApi } from '@tanstack/react-router';
import { AuthForm } from '@/modules/auth/components/AuthForm';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { AuthStatus } from '@/modules/auth/components/AuthStatus';
import { BackToSignIn } from '@/modules/auth/components/BackToSignIn';
import { AuthRequestError } from '@/modules/auth/utils/AuthRequestError';
import { resetPasswordForm } from '@/modules/auth/utils/authForms';
import { resources } from '@/resources';

const { resetPassword } = resources.auth;
const routeApi = getRouteApi('/auth/reset-password');

/** /auth/reset-password — better-auth redirects the emailed link here with `?token` or `?error`. */
export const ResetPasswordPage = () => {
  const { token, error } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  // A spent, expired or hand-edited token only shows up on submit; show the same state as a bad link.
  const showInvalidLink = (requestError: Error) => {
    if (requestError instanceof AuthRequestError && requestError.authCode === 'INVALID_TOKEN') {
      void navigate({ search: { error: 'INVALID_TOKEN' }, replace: true });
    }
  };

  return (
    <AuthLayout footer={<BackToSignIn />}>
      {token && error === undefined ? (
        <AuthForm config={resetPasswordForm(token)} onError={showInvalidLink} />
      ) : (
        <AuthStatus title={resetPassword.title} status="error" message={resetPassword.linkInvalid}>
          <Button asChild>
            <Link to="/auth/forgot-password">{resetPassword.requestNewLink}</Link>
          </Button>
        </AuthStatus>
      )}
    </AuthLayout>
  );
};
