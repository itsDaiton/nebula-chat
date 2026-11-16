import { InfoIcon, TriangleAlertIcon } from 'lucide-react';
import { ResendVerificationButton } from '@/modules/auth/components/ResendVerificationButton';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useMessageAllowance } from '@/modules/chat/hooks/useMessageAllowance';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const { emailVerification } = resources.auth;

/** Reminds an unverified Registered user to verify; once they hit the allowance, verifying is the way on. */
export const EmailVerificationPrompt = () => {
  const { needsEmailVerification } = useAuth();
  const { isSpent } = useMessageAllowance();

  if (!needsEmailVerification) return null;

  const Icon = isSpent ? TriangleAlertIcon : InfoIcon;

  return (
    <div
      role={isSpent ? 'alert' : 'status'}
      className={cn(
        'mb-3 flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm',
        isSpent ? 'border-warning/30 bg-warning/10' : 'border-border bg-raised',
      )}
    >
      <Icon className={cn('size-4 shrink-0', isSpent ? 'text-warning' : 'text-muted-foreground')} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">
          {isSpent ? emailVerification.allowanceReachedTitle : emailVerification.title}
        </p>
        <p className="text-muted-foreground">
          {isSpent ? emailVerification.allowanceReachedDescription : emailVerification.description}
        </p>
      </div>
      <ResendVerificationButton />
    </div>
  );
};
