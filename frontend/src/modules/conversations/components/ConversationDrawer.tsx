import { Drawer } from '@chakra-ui/react';
import { ConversationsList } from './ConversationsList';

export const ConversationDrawer = ({
  isDrawerOpen,
  setIsDrawerOpen,
  handleDrawerClose,
}: {
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  handleDrawerClose: () => void;
}) => (
  <Drawer.Root
    open={isDrawerOpen}
    onOpenChange={(e) => setIsDrawerOpen(e.open)}
    placement="start"
    size="sm"
  >
    <Drawer.Backdrop />
    <Drawer.Positioner>
      <Drawer.Content bg="bg.default">
        <Drawer.Body p={0}>
          <ConversationsList onNavigate={handleDrawerClose} inDrawer />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Positioner>
  </Drawer.Root>
);
