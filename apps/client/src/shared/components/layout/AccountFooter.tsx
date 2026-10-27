import { AccountStatus } from '@/modules/auth/components/AccountStatus';

export const AccountFooter = () => (
  <div className="flex shrink-0 justify-end border-t border-border p-2">
    <AccountStatus />
  </div>
);
