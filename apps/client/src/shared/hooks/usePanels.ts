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
    toggleSidebar: showSidePanels ? store.toggleLeftPanel : store.toggleDrawer,
    toggleInspector: showSidePanels ? store.toggleRightPanel : store.toggleSheet,
    closeMobilePanels: store.closeMobilePanels,
  };
};
