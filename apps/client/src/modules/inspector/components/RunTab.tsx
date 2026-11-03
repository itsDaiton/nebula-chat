import { RunEmptyState } from '@/modules/inspector/components/RunEmptyState';
import type { RunTabProps } from '@/modules/inspector/types/types';

// NEB-362 replaces the null branch with the Run's Steps.
export const RunTab = ({ runId }: RunTabProps) => (runId === null ? <RunEmptyState /> : null);
