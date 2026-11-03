import { ArchiveIcon, ArchiveRestoreIcon } from 'lucide-react';
import { useSessionRestore } from '@/modules/sessions/hooks/useSessionRestore';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { archived } = resources.settings;

/** Stands in for the composer on an archived Session, which the server refuses sends to. */
export const ArchivedSessionBar = ({ sessionId }: { sessionId: string }) => {
  const { mutate, isPending } = useSessionRestore();

  return (
    <div
      data-slot="archived-session-bar"
      className="mx-auto w-full max-w-(--transcript-width) shrink-0 px-3 pb-3 sm:px-7"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
        <ArchiveIcon className="size-4 shrink-0 text-muted-foreground" />
        <p className="flex-1 text-sm">{archived.bar}</p>
        <Button variant="outline" disabled={isPending} onClick={() => mutate({ sessionId })}>
          <ArchiveRestoreIcon />
          {archived.restore}
        </Button>
      </div>
    </div>
  );
};
