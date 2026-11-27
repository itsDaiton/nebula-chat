import { createFileRoute } from '@tanstack/react-router';
import { OperationsPage } from '@/modules/admin/components/OperationsPage';

export const Route = createFileRoute('/_app/admin/operations')({
  component: OperationsPage,
});
