import type { UsageDetailRowProps } from '@/modules/admin/types/types';

export const UsageDetailRow = ({ label, value }: UsageDetailRowProps) => (
  <div className="flex justify-between gap-3 text-[13px]">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="font-mono tabular-nums">{value}</dd>
  </div>
);
