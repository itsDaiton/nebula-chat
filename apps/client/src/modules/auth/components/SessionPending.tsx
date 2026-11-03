import { Loader2Icon } from 'lucide-react';
import { resources } from '@/resources';

export const SessionPending = () => (
  <div
    role="status"
    aria-label={resources.auth.loading}
    className="grid h-dvh place-items-center text-muted-foreground"
  >
    <Loader2Icon className="size-6 animate-spin" />
  </div>
);
