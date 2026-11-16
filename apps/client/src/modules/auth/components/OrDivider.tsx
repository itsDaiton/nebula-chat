import { resources } from '@/resources';

/** Splits the social sign-in buttons from the email form. */
export const OrDivider = () => (
  <div className="mt-4 mb-0.5 flex items-center gap-2.5 text-[11.5px] text-faint">
    <span className="h-px flex-1 bg-border" />
    {resources.auth.page.or}
    <span className="h-px flex-1 bg-border" />
  </div>
);
