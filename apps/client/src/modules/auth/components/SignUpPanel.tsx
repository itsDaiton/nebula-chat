import { AuthForm } from '@/modules/auth/components/AuthForm';
import { AuthHeading } from '@/modules/auth/components/AuthHeading';
import { AuthSwitch } from '@/modules/auth/components/AuthSwitch';
import { OrDivider } from '@/modules/auth/components/OrDivider';
import { SocialSignIn } from '@/modules/auth/components/SocialSignIn';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import { useAuthPageStore } from '@/modules/auth/stores/useAuthPageStore';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { AuthRequestError } from '@/modules/auth/utils/AuthRequestError';
import { SIGN_UP_FORM } from '@/modules/auth/utils/authForms';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { signUp, forms, page } = resources.auth;

export const SignUpPanel = () => {
  const { hidePassword } = usePasswordVisibilityStore();
  const { showSignIn, emailPendingDeletion, markEmailPendingDeletion } = useAuthPageStore();
  // The server claims a current Guest's sessions into the new account.
  const onIdentityChange = useIdentityChange();
  const goToSignIn = () => {
    hidePassword();
    showSignIn();
  };

  return (
    <>
      <AuthHeading title={signUp.title} description={signUp.description} />
      <SocialSignIn />
      <OrDivider />
      <AuthForm
        config={SIGN_UP_FORM}
        header="none"
        onSuccess={() => onIdentityChange()}
        onError={(error) => {
          if (error instanceof AuthRequestError && error.authCode === 'EMAIL_PENDING_DELETION') {
            markEmailPendingDeletion();
          }
        }}
      />
      {/* That account can only come back by signing in to it, which offers the restore. */}
      {emailPendingDeletion && (
        <Button variant="outline" size="lg" className="mt-3 w-full" onClick={goToSignIn}>
          {page.goToSignIn}
        </Button>
      )}
      <AuthSwitch prompt={signUp.haveAccount} action={forms.signIn} onSwitch={goToSignIn} />
    </>
  );
};
