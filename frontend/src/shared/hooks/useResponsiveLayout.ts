import { useBreakpointValue } from '@chakra-ui/react';

export const useResponsiveLayout = () => {
  const isMobile = useBreakpointValue({ base: true, lg: false }, { ssr: false });
  const showSidePanels = useBreakpointValue({ base: false, lg: true }, { ssr: false });
  const showRightPanel = useBreakpointValue({ base: false, xl: true }, { ssr: false });

  return {
    isMobile: isMobile ?? true,
    showSidePanels: showSidePanels ?? false,
    showRightPanel: showRightPanel ?? false,
  };
};
