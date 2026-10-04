import { AuthForm } from '@/modules/auth/components/AuthForm';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { BackToSignIn } from '@/modules/auth/components/BackToSignIn';
import { FORGOT_PASSWORD_FORM } from '@/modules/auth/utils/authForms';

/** /auth/forgot-password — emails a reset link, never revealing whether the account exists. */
export const ForgotPasswordPage = () => (
  <AuthLayout footer={<BackToSignIn />}>
    <AuthForm config={FORGOT_PASSWORD_FORM} />
  </AuthLayout>
);
