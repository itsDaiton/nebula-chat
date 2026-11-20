import { Loader2Icon } from 'lucide-react';
import { resources } from '@/resources';

// The router's default while a loader or guard is awaited; a route with its own shell overrides it.
export const RoutePending = () => (
  <output
    aria-label={resources.routing.loading}
    className="grid min-h-0 flex-1 place-items-center text-muted-foreground"
  >
    <Loader2Icon className="size-6 animate-spin" />
  </output>
);
