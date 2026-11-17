import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { GetModelUsageSeriesAudience } from '@/libs/api/generated/model/getModelUsageSeriesAudience';
import { GetModelUsageSeriesMetric } from '@/libs/api/generated/model/getModelUsageSeriesMetric';
import { GetModelUsageSeriesRange } from '@/libs/api/generated/model/getModelUsageSeriesRange';
import { UsagePage } from '@/modules/admin/components/UsagePage';
import { optionalSearchText } from '@/routing/searchParams';
import { usePanelStore } from '@/shared/stores/usePanelStore';

const searchSchema = z.object({
  metric: z.enum(GetModelUsageSeriesMetric).optional().catch(undefined),
  range: z.enum(GetModelUsageSeriesRange).optional().catch(undefined),
  view: z.enum(['share', 'volume']).optional().catch(undefined),
  models: z.array(z.string()).optional().catch(undefined),
  audience: z.enum(GetModelUsageSeriesAudience).optional().catch(undefined),
  pinned: optionalSearchText(),
});

export const Route = createFileRoute('/_app/admin/usage')({
  validateSearch: searchSchema,
  // A link that pins a Model opens its detail even if the panel was left closed.
  onEnter: ({ search }) => {
    if (search.pinned) usePanelStore.getState().openRight();
  },
  component: UsagePage,
});
