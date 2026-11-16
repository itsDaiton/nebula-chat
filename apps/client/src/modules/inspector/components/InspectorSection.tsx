import type { InspectorSectionProps } from '@/modules/inspector/types/types';

export const InspectorSection = ({ label, children }: InspectorSectionProps) => (
  <section>
    <h2 className="mb-2 text-[11.5px] font-medium text-muted-foreground">{label}</h2>
    {children}
  </section>
);
