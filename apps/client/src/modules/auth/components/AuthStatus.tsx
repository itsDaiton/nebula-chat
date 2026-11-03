import { AuthFormAlert } from '@/modules/auth/components/AuthFormAlert';
import { AuthHeading } from '@/modules/auth/components/AuthHeading';
import type { AuthStatusProps } from '@/modules/auth/types/types';

/** A titled outcome in place of a form, with any follow-up actions beneath it. */
export const AuthStatus = ({ title, status, message, children }: AuthStatusProps) => (
  <div className="flex flex-col gap-4">
    <AuthHeading title={title} />
    <AuthFormAlert status={status} message={message} />
    {children}
  </div>
);
