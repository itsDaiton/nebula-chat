import { BannedNotice } from '@/modules/auth/components/BannedNotice';
import { PendingDeletionPrompt } from '@/modules/auth/components/PendingDeletionPrompt';
import { TwoFactorChallenge } from '@/modules/auth/components/TwoFactorChallenge';
import type { AuthOutcomeViewProps } from '@/modules/auth/types/types';

/** What the auth card shows once a sign-in stops short of a session. */
export const AuthOutcomeView = ({ outcome }: AuthOutcomeViewProps) => {
  switch (outcome.kind) {
    case 'twoFactor':
      return <TwoFactorChallenge canTrustDevice={outcome.canTrustDevice} />;
    case 'pendingDeletion':
      return <PendingDeletionPrompt {...outcome} />;
    case 'banned':
      return <BannedNotice {...outcome} />;
  }
};
