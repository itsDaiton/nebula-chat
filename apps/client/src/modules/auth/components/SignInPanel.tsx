import { Link } from '@tanstack/react-router';
import { AuthForm } from '@/modules/auth/components/AuthForm';
import { AuthHeading } from '@/modules/auth/components/AuthHeading';
import { AuthSwitch } from '@/modules/auth/components/AuthSwitch';
import { OrDivider } from '@/modules/auth/components/OrDivider';
import { SocialSignIn } from '@/modules/auth/components/SocialSignIn';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import { useAuthPageStore } from '@/modules/auth/stores/useAuthPageStore';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { authOutcomeOf, secondFactorOutcome } from '@/modules/auth/utils/authOutcome';
import { SIGN_IN_FORM } from '@/modules/auth/utils/authForms';
import { resources } from '@/resources';

const { signIn, forms } = resources.auth;

export const SignInPanel = () => {
  const { hidePassword } = usePasswordVisibilityStore();
  const { showSignUp, showOutcome } = useAuthPageStore();
  // The server claims a current Guest's sessions into the account once it signs in.
  const onIdentityChange = useIdentityChange();

  return (
    <>
      <AuthHeading title={signIn.title} description={signIn.description} />
      <SocialSignIn />
      <OrDivider />
      <AuthForm
        config={SIGN_IN_FORM}
        header="none"
        onSuccess={(result) => {
          const challenge = secondFactorOutcome(result);
          if (challenge) showOutcome(challenge);
          else onIdentityChange();
        }}
        onError={(error) => {
          const outcome = authOutcomeOf(error);
          if (outcome) showOutcome(outcome);
        }}
        labelActions={{
          password: (
            <Link
              to="/auth/forgot-password"
              onClick={hidePassword}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {signIn.forgotPassword}
            </Link>
          ),
        }}
      />
      <AuthSwitch
        prompt={signIn.noAccount}
        action={forms.signUp}
        onSwitch={() => {
          hidePassword();
          showSignUp();
        }}
      />
    </>
  );
};
