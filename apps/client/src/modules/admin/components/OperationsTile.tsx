import type { OperationsTileProps } from '@/modules/admin/types/types';

export const OperationsTile = ({ label, children }: OperationsTileProps) => (
  <div
    role="group"
    aria-label={label}
    className="rounded-xl border border-border bg-panel px-3.5 pt-3.5 pb-3"
  >
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1.5">{children}</div>
  </div>
);
