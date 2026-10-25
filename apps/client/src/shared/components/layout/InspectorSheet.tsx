import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { usePanels } from '@/shared/hooks/usePanels';
import { resources } from '@/resources';

/** The Inspector below the large breakpoint: a bottom sheet. Its contents come with the Inspector ticket. */
export const InspectorSheet = () => {
  const { isInspectorOpen, closeMobilePanels } = usePanels();

  return (
    <Sheet open={isInspectorOpen} onOpenChange={(open) => !open && closeMobilePanels()}>
      <SheetContent side="bottom" className="min-h-[40vh] rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{resources.shell.inspector}</SheetTitle>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
};
