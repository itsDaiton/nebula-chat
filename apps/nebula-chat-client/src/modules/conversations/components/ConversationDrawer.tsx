import { Drawer } from '@chakra-ui/react';
import { ConversationsList } from '@/modules/conversations/components/ConversationsList';

export const ConversationDrawer = ({
  isDrawerOpen,
  closeDrawer,
  toggleSearch,
  closeSearch,
}: {
  isDrawerOpen: boolean;
  closeDrawer: () => void;
  toggleSearch: () => void;
  closeSearch: () => void;
}) => (
  <Drawer.Root
    open={isDrawerOpen}
    onOpenChange={(event) => !event.open && closeDrawer()}
    placement="start"
    size="sm"
    aria-label="Menu"
  >
    <Drawer.Backdrop />
    <Drawer.Positioner>
      <Drawer.Content bg="bg.default" maxW={{ base: '75vw', sm: '320px' }}>
        <Drawer.Body p={0}>
          <ConversationsList
            onClose={closeDrawer}
            inDrawer
            toggleSearch={toggleSearch}
            closeSearch={closeSearch}
          />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Positioner>
  </Drawer.Root>
);
