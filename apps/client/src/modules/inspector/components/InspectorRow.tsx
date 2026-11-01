import type { InspectorRowProps } from '@/modules/inspector/types/types';

export const InspectorRow = ({ label, value }: InspectorRowProps) => (
  <>
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-right font-mono text-xs text-foreground-secondary tabular-nums">{value}</dd>
  </>
);
