import { AuthHeading } from '@/modules/auth/components/AuthHeading';
import { TwoFactorCodeForm } from '@/modules/auth/components/TwoFactorCodeForm';
import { useAuthPageStore } from '@/modules/auth/stores/useAuthPageStore';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { twoFactor } = resources.auth;

/** A User with 2FA signed in with their password; the session waits on their code. */
export const TwoFactorChallenge = () => {
  const { twoFactorMethod, toggleTwoFactorMethod, showOutcome } = useAuthPageStore();
  const isTotp = twoFactorMethod === 'totp';

  return (
    <div className="flex flex-col">
      <AuthHeading
        title={twoFactor.title}
        description={isTotp ? twoFactor.description : twoFactor.backupDescription}
      />
      {/* Keyed so a switch starts a fresh form under the other method's schema. */}
      <TwoFactorCodeForm key={twoFactorMethod} method={twoFactorMethod} onOutcome={showOutcome} />
      <Button
        variant="ghost"
        className="mt-2 self-center text-[12.5px] text-muted-foreground"
        onClick={toggleTwoFactorMethod}
      >
        {isTotp ? twoFactor.useBackupCode : twoFactor.useAuthenticator}
      </Button>
    </div>
  );
};
