import type { AuthHeadingProps } from '@/modules/auth/types/types';

export const AuthHeading = ({ title, description }: AuthHeadingProps) => (
  <div className="flex flex-col gap-1">
    <h1 className="text-xl font-semibold tracking-[-0.02em]">{title}</h1>
    {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
  </div>
);
