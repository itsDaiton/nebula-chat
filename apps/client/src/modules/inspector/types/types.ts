import type { ReactNode } from 'react';
import type { Run } from '@/libs/api/generated/model/run';
import type { RunStatus } from '@/libs/api/generated/model/runStatus';
import type { Step } from '@/libs/api/generated/model/step';
import type { StepStatus } from '@/libs/api/generated/model/stepStatus';

export type InspectorTab = 'session' | 'run';

export type InspectorState = {
  activeTab: InspectorTab;
  /** The Run the Run tab shows; null while none is selected. */
  selectedRunId: string | null;
  setActiveTab: (tab: InspectorTab) => void;
  /** Shows the Inspector on a tab, selecting a Run when the tab is the Run tab. */
  openInspector: (tab: InspectorTab, runId?: string) => void;
};

export type InspectorProps = {
  onClose: () => void;
};

export type RunTabProps = {
  runId: string | null;
};

export type InspectorSectionProps = {
  label: string;
  children: ReactNode;
};

export type InspectorRowProps = {
  label: string;
  value: string;
};

export type RunViewProps = {
  runId: string;
};

export type RunProps = {
  run: Run;
};

export type RunStatusBadgeProps = {
  status: RunStatus;
  /** The header's badge leads with a status dot; the tab's is bare. */
  withDot?: boolean;
  className?: string;
};

export type RunBriefProps = {
  brief: NonNullable<Run['brief']>;
};

export type Timed = {
  startedAt: string | null;
  finishedAt: string | null;
};

/** A Step in its group, indented under the Step that started it. */
export type RunStepRow = {
  step: Step;
  depth: number;
};

export type RunStepGroup = {
  key: string;
  kind: 'intake' | 'turn' | 'output';
  turn: number;
  /** How many of the group's Steps ran side by side; 0 when none did. */
  parallel: number;
  rows: RunStepRow[];
};

export type RunStepGroupProps = {
  group: RunStepGroup;
};

export type RunStepProps = RunStepRow;

export type StepProps = {
  step: Step;
};

export type StepStatusIconProps = {
  status: StepStatus;
};

export type StepIoProps = {
  label: string;
  value: unknown;
};

export type RunEndExplanation = {
  title: string;
  reason: string;
};
