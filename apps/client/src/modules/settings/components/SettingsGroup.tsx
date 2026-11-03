import type { ReactNode } from 'react';

/** A bordered card whose rows are separated by hairlines. */
export const SettingsGroup = ({ children }: { children: ReactNode }) => (
  <div className="divide-y divide-border rounded-xl border border-border">{children}</div>
);
