import { resources } from '@/resources';

export const SessionError = () => (
  <div role="alert" className="grid h-dvh place-items-center text-sm text-foreground">
    <p>{resources.auth.sessionFailed}</p>
  </div>
);
