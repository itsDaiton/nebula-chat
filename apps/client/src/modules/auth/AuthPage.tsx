import { Link, getRouteApi } from '@tanstack/react-router';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { AuthOutcomeView } from '@/modules/auth/components/AuthOutcomeView';
import { SignInPanel } from '@/modules/auth/components/SignInPanel';
import { SignUpPanel } from '@/modules/auth/components/SignUpPanel';
import { useAuthPageStore } from '@/modules/auth/stores/useAuthPageStore';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import type { AuthOutcome } from '@/modules/auth/types/types';
import { resources } from '@/resources';
import { useOnUnmount } from '@/shared/hooks/useOnUnmount';

const routeApi = getRouteApi('/_app/auth/');

// Opt-in: a Guest can use the app without ever coming here.
export const AuthPage = () => {
  const { pending, restoreToken } = routeApi.useSearch();
  const { form, outcome, reset } = useAuthPageStore();
  const { hidePassword } = usePasswordVisibilityStore();
  const resetOnLeave = useOnUnmount(reset);
  // A social sign-in of a User in Pending deletion lands here with the Purge date and a restore token.
  const landed: AuthOutcome | null = pending
    ? { kind: 'pendingDeletion', purgeDate: pending, restoreToken }
    : null;
  const shown = outcome ?? landed;

  return (
    <AuthLayout
      footer={
        !shown && (
          <Link
            to="/"
            onClick={hidePassword}
            className="text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            {resources.auth.page.continueWithoutAccount}
          </Link>
        )
      }
    >
      <div ref={resetOnLeave}>
        {shown ? (
          <AuthOutcomeView outcome={shown} />
        ) : form === 'sign-in' ? (
          <SignInPanel />
        ) : (
          <SignUpPanel />
        )}
      </div>
    </AuthLayout>
  );
};
