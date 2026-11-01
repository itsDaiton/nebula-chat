import { CircleAlertIcon, CircleCheckIcon } from 'lucide-react';
import type { AuthFormAlertProps } from '@/modules/auth/types/types';
import { cn } from '@/shared/utils/cn';

/** An outcome that belongs to the whole form rather than one field. */
export const AuthFormAlert = ({ message, status = 'error' }: AuthFormAlertProps) => {
  if (!message) return null;
  const Icon = status === 'error' ? CircleAlertIcon : CircleCheckIcon;

  const className = cn(
    'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm',
    status === 'error'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : 'border-success/30 bg-success/10 text-success',
  );
  const content = (
    <>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p className="font-medium">{message}</p>
    </>
  );

  // <output> is the live region for a result; an error keeps role="alert" to interrupt.
  return status === 'error' ? (
    <div role="alert" className={className}>
      {content}
    </div>
  ) : (
    <output className={className}>{content}</output>
  );
};
