import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ListAuditEntriesAction } from '@/libs/api/generated/model/listAuditEntriesAction';
import { ListAuditEntriesActorType } from '@/libs/api/generated/model/listAuditEntriesActorType';
import { ListAuditEntriesOrder } from '@/libs/api/generated/model/listAuditEntriesOrder';
import { AuditLogPage } from '@/modules/admin/components/AuditLogPage';
import { optionalSearchText } from '@/routing/searchParams';

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);

const searchSchema = z.object({
  actor: z.enum(ListAuditEntriesActorType).optional().catch(undefined),
  action: z.enum(ListAuditEntriesAction).optional().catch(undefined),
  target: optionalSearchText(),
  from: day,
  to: day,
  dir: z.enum(ListAuditEntriesOrder).optional().catch(undefined),
  cursor: optionalSearchText(),
});

export const Route = createFileRoute('/_app/admin/audit')({
  validateSearch: searchSchema,
  component: AuditLogPage,
});
