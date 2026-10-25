import { SessionsList } from '@/modules/sessions/components/SessionsList';
import { Sheet, SheetContent, SheetTitle } from '@/shared/components/ui/sheet';
import { usePanels } from '@/shared/hooks/usePanels';
import { useSearchStore } from '@/shared/stores/useSearchStore';
import { resources } from '@/resources';

/** The sidebar below the large breakpoint: a drawer from the left. */
export const SidebarDrawer = () => {
  const { isSidebarOpen, closeMobilePanels } = usePanels();
  const { toggleSearch, closeSearch } = useSearchStore();

  return (
    <Sheet open={isSidebarOpen} onOpenChange={(open) => !open && closeMobilePanels()}>
      <SheetContent side="left" showCloseButton={false} className="w-[270px] gap-0 p-0">
        <SheetTitle className="sr-only">{resources.shell.sidebar}</SheetTitle>
        <SessionsList
          inDrawer
          onClose={closeMobilePanels}
          toggleSearch={toggleSearch}
          closeSearch={closeSearch}
        />
      </SheetContent>
    </Sheet>
  );
};
