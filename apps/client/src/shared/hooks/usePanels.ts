import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { usePanelStore } from '@/shared/stores/usePanelStore';

// One toggle per side panel: a remembered collapse on desktop, a drawer or bottom sheet below it.
export const usePanels = () => {
  const { showSidePanels } = useResponsiveLayout();
  const store = usePanelStore();

  return {
    showSidePanels,
    isSidebarOpen: showSidePanels ? store.isLeftPanelOpen : store.isDrawerOpen,
    isInspectorOpen: showSidePanels ? store.isRightPanelOpen : store.isSheetOpen,
    toggleSidebar: () => {
      if (showSidePanels) store.toggleLeftPanel();
      else if (usePanelStore.getState().isDrawerOpen) store.closeMobilePanels();
      else store.openDrawer();
    },
    toggleInspector: () => {
      if (showSidePanels) store.toggleRightPanel();
      else if (usePanelStore.getState().isSheetOpen) store.closeMobilePanels();
      else store.openSheet();
    },
    closeMobilePanels: store.closeMobilePanels,
  };
};
