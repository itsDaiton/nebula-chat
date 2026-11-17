import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { GetAdminOverviewRange } from '@/libs/api/generated/model/getAdminOverviewRange';
import { OverviewPage } from '@/modules/admin/components/OverviewPage';

const searchSchema = z.object({
  range: z.enum(GetAdminOverviewRange).optional().catch(undefined),
});

// No row to select here, so the layout shows no right panel.
export const Route = createFileRoute('/_app/admin/')({
  validateSearch: searchSchema,
  component: OverviewPage,
});
