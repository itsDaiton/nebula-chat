import type { ReactNode } from 'react';

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
