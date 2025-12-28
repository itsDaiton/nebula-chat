import { Drawer } from '@chakra-ui/react';
import { ConversationsList } from './ConversationsList';

export const ConversationDrawer = ({
  isDrawerOpen,
  setIsDrawerOpen,
}: {
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}) => (
  <Drawer.Root
    open={isDrawerOpen}
    onOpenChange={(event) => setIsDrawerOpen(event.open)}
    placement="start"
    size="sm"
    aria-label="Menu"
  >
    <Drawer.Backdrop />
    <Drawer.Positioner>
      <Drawer.Content bg="bg.default" maxW={{ base: '75vw', sm: '320px' }}>
        <Drawer.Body p={0}>
          <ConversationsList onNavigate={() => setIsDrawerOpen(false)} inDrawer />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Positioner>
  </Drawer.Root>
);
