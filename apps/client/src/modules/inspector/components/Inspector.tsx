import { MessageSquareIcon, WorkflowIcon, XIcon } from 'lucide-react';
import { RunTab } from '@/modules/inspector/components/RunTab';
import { SessionTab } from '@/modules/inspector/components/SessionTab';
import { useInspectorStore } from '@/modules/inspector/stores/useInspectorStore';
import type { InspectorProps, InspectorTab } from '@/modules/inspector/types/types';
import { resources } from '@/resources';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

const tabClass = 'flex-none gap-1.5 px-2.5 text-[12.5px] after:bottom-0';

export const Inspector = ({ onClose }: InspectorProps) => {
  const { activeTab, selectedRunId, setActiveTab } = useInspectorStore();

  return (
    <Tabs
      value={activeTab}
      onValueChange={(tab) => setActiveTab(tab as InspectorTab)}
      className="min-h-0 flex-1 gap-0"
    >
      <div className="flex items-center border-b border-border px-2 pt-2">
        <TabsList variant="line" className="h-8 w-auto flex-1 justify-start p-0">
          <TabsTrigger value="session" className={tabClass}>
            <MessageSquareIcon />
            {resources.inspector.tabs.session}
          </TabsTrigger>
          <TabsTrigger value="run" className={tabClass}>
            <WorkflowIcon />
            {resources.inspector.tabs.run}
          </TabsTrigger>
        </TabsList>
        <IconButton
          variant="ghost"
          size="icon"
          className="mb-1 size-7 text-muted-foreground"
          label={resources.inspector.close}
          onClick={onClose}
        >
          <XIcon />
        </IconButton>
      </div>
      <TabsContent value="session" className="overflow-y-auto">
        <SessionTab />
      </TabsContent>
      <TabsContent value="run" className="flex flex-col overflow-y-auto">
        <RunTab runId={selectedRunId} />
      </TabsContent>
    </Tabs>
  );
};
