import { ExternalLinkIcon } from 'lucide-react';
import { StepIo } from '@/modules/inspector/components/StepIo';
import type { RunBriefProps } from '@/modules/inspector/types/types';
import { briefParts } from '@/modules/inspector/utils/briefParts';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';

const { run: text } = resources.inspector;

/** The button under the Brief's clipped look, and the dialog holding every Intake Agent's part in full. */
export const RunBriefDialog = ({ brief }: RunBriefProps) => (
  <Dialog>
    <DialogTrigger render={<Button variant="outline" size="sm" className="mt-2" />}>
      <ExternalLinkIcon />
      {text.briefShowFull}
    </DialogTrigger>
    <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{text.brief}</DialogTitle>
        <DialogDescription>{text.briefDescription}</DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        {briefParts(brief).map(({ agent, text: part }) => (
          <StepIo key={agent} label={agent} value={part} />
        ))}
      </div>
    </DialogContent>
  </Dialog>
);
