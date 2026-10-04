import { Button } from '@chakra-ui/react';
import { Link, useSearchParams } from 'react-router';
import { AuthForm } from '@/modules/auth/components/AuthForm';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { AuthStatus } from '@/modules/auth/components/AuthStatus';
import { BackToSignIn } from '@/modules/auth/components/BackToSignIn';
import { resetPasswordForm } from '@/modules/auth/utils/authForms';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

const { resetPassword } = resources.auth;

/** /auth/reset-password — better-auth redirects the emailed link here with `?token` or `?error`. */
export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  return (
    <AuthLayout footer={<BackToSignIn />}>
      {token && !searchParams.has('error') ? (
        <AuthForm config={resetPasswordForm(token)} />
      ) : (
        <AuthStatus title={resetPassword.title} status="error" message={resetPassword.linkInvalid}>
          <Button asChild>
            <Link to={route.auth.forgotPassword()}>{resetPassword.requestNewLink}</Link>
          </Button>
        </AuthStatus>
      )}
    </AuthLayout>
  );
};
