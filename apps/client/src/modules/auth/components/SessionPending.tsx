import { Loader2Icon } from 'lucide-react';
import { resources } from '@/resources';

// <output> is the live region (implicit role="status") that Sonar S6819 prefers over a div with the role.
export const SessionPending = () => (
  <output
    aria-label={resources.auth.loading}
    className="grid h-dvh place-items-center text-muted-foreground"
  >
    <Loader2Icon className="size-6 animate-spin" />
  </output>
);
