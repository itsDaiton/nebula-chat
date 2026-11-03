import { useSyncExternalStore } from 'react';

const SIDE_PANELS_QUERY = '(min-width: 62em)';
const RIGHT_PANEL_QUERY = '(min-width: 80em)';

const subscribeTo = (query: string) => (callback: () => void) => {
  const list = window.matchMedia(query);
  list.addEventListener('change', callback);
  return () => list.removeEventListener('change', callback);
};

const subscribeToSidePanels = subscribeTo(SIDE_PANELS_QUERY);
const subscribeToRightPanel = subscribeTo(RIGHT_PANEL_QUERY);
const matchesSidePanels = () => window.matchMedia(SIDE_PANELS_QUERY).matches;
const matchesRightPanel = () => window.matchMedia(RIGHT_PANEL_QUERY).matches;
const assumeNarrow = () => false;

export const useResponsiveLayout = () => {
  const showSidePanels = useSyncExternalStore(
    subscribeToSidePanels,
    matchesSidePanels,
    assumeNarrow,
  );
  const showRightPanel = useSyncExternalStore(
    subscribeToRightPanel,
    matchesRightPanel,
    assumeNarrow,
  );

  return { isMobile: !showSidePanels, showSidePanels, showRightPanel };
};
