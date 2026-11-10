import { ExternalLinkIcon } from 'lucide-react';
import { StepIo } from '@/modules/inspector/components/StepIo';
import type { StepProps } from '@/modules/inspector/types/types';
import { stepLabel } from '@/modules/inspector/utils/stepLabel';
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

const { step: text } = resources.inspector.run;

/** The button under a Step's summary, and the dialog holding its whole input and output. */
export const RunStepDialog = ({ step }: StepProps) => {
  const { name, phase, turn, input, output, error } = step;

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" className="self-start" />}>
        <ExternalLinkIcon />
        {text.showFull}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {stepLabel(name)} <span className="font-mono text-xs text-faint">{name}</span>
          </DialogTitle>
          <DialogDescription>{text.dialogDescription(phase, turn)}</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <StepIo label={text.input} value={input} />
          {error ? (
            <StepIo label={text.error} value={error} />
          ) : (
            <StepIo label={text.output} value={output ?? text.noOutput} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
