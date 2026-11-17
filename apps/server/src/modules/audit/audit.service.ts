import { auditRepository } from '@server/modules/audit/audit.repository';
import type { AuditEntryInput, AuditFilters, AuditOrder } from '@server/modules/audit/audit.types';

export const auditService = {
  // Every Admin and Operator mutation, and every Admin content read, calls this once it has succeeded (ADR-0027 §4).
  append(entry: AuditEntryInput) {
    return auditRepository.insert(entry);
  },
  list(filters: AuditFilters, limit: number, order: AuditOrder, cursor?: string) {
    return auditRepository.list(filters, limit, order, cursor);
  },
};
