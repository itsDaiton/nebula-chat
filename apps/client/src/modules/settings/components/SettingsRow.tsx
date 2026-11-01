import type { SettingsRowProps } from '@/modules/settings/types/types';

/** Label and description anchored left, the control right; stacked on mobile. */
export const SettingsRow = ({ label, description, children }: SettingsRowProps) => (
  <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
    <div className="min-w-0">
      <p className="text-sm font-medium">{label}</p>
      {description && <div className="text-[13px] text-muted-foreground">{description}</div>}
    </div>
    {children && <div className="shrink-0">{children}</div>}
  </div>
);
