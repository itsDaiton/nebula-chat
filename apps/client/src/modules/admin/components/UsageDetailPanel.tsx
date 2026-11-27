import { useSearch } from '@tanstack/react-router';
import { UsageAgentDetailPanel } from '@/modules/admin/components/UsageAgentDetailPanel';
import { UsageModelDetailPanel } from '@/modules/admin/components/UsageModelDetailPanel';
import type { UsageDetailPanelProps, UsageSearch } from '@/modules/admin/types/types';
import { resolveUsageSearch } from '@/modules/admin/utils/usageData';

/** The Model usage page's right panel: a Model's day, or an Agent's on the Runs tab. */
export const UsageDetailPanel = ({ onClose }: UsageDetailPanelProps) => {
  // Not strict: the panel can outlive its route for a render while the dashboard navigates away.
  const params = resolveUsageSearch(useSearch({ strict: false }) as UsageSearch);

  return params.metric === 'runs' ? (
    <UsageAgentDetailPanel params={params} onClose={onClose} />
  ) : (
    <UsageModelDetailPanel params={params} onClose={onClose} />
  );
};
