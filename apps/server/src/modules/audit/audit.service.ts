import { auditRepository } from '@server/modules/audit/audit.repository';
import { auditEntryDetailSchema } from '@server/modules/audit/audit.validation';
import type { AuditEntryInput, AuditFilters, AuditOrder } from '@server/modules/audit/audit.types';

export const auditService = {
  // Every Admin and Operator mutation, and every Admin content read, calls this once it has succeeded (ADR-0027 §4).
  append(entry: AuditEntryInput) {
    // Throws on a `detail` key the action does not allow, so a bad write never reaches the log.
    auditEntryDetailSchema.parse({ action: entry.action, detail: entry.detail });
    return auditRepository.insert(entry);
  },
  list(filters: AuditFilters, limit: number, order: AuditOrder, cursor?: string) {
    return auditRepository.list(filters, limit, order, cursor);
  },
};
