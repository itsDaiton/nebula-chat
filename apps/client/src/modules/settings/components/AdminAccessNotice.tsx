import { EyeIcon } from 'lucide-react';
import { resources } from '@/resources';

const { adminNotice } = resources.settings.account;

/** Tells the user that Admins can read their Sessions, and that each read is audited. */
export const AdminAccessNotice = () => (
  <div className="flex gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
    <EyeIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
    <p>
      <strong className="font-medium">{adminNotice.title}</strong> {adminNotice.body}
    </p>
  </div>
);
