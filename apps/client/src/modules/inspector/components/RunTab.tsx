import { RunEmptyState } from '@/modules/inspector/components/RunEmptyState';
import { RunView } from '@/modules/inspector/components/RunView';
import type { RunTabProps } from '@/modules/inspector/types/types';

export const RunTab = ({ runId }: RunTabProps) =>
  runId === null ? <RunEmptyState /> : <RunView runId={runId} />;
