import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AuditEntryAction } from '@/libs/api/generated/model/auditEntryAction';
import { AuditEntryActorType } from '@/libs/api/generated/model/auditEntryActorType';
import { AuditLogPage } from '@/modules/admin/components/AuditLogPage';
import { optionalSearchText } from '@/routing/searchParams';

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);

const searchSchema = z.object({
  actor: z.enum(AuditEntryActorType).optional().catch(undefined),
  action: z.enum(AuditEntryAction).optional().catch(undefined),
  target: optionalSearchText(),
  from: day,
  to: day,
  cursor: optionalSearchText(),
});

export const Route = createFileRoute('/_app/admin/audit')({
  validateSearch: searchSchema,
  component: AuditLogPage,
});
