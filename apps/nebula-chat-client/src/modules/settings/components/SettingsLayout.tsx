import { Box, Flex, IconButton, Stack } from '@chakra-ui/react';
import { LuX } from 'react-icons/lu';
import { Link } from 'react-router';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { SettingsNav } from '@/modules/settings/components/SettingsNav';
import type { SettingsLayoutProps } from '@/modules/settings/types/types';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { useViewportHeight } from '@/shared/hooks/useViewportHeight';

/** Settings' own full-screen shell, apart from the chat: section navigation, the open section, and a way out. */
export const SettingsLayout = ({ children }: SettingsLayoutProps) => {
  const { hidePassword } = usePasswordVisibilityStore();
  const viewportHeight = useViewportHeight();

  return (
    <Flex
      direction={{ base: 'column', md: 'row' }}
      bg="bg.default"
      overflow="hidden"
      style={{ height: viewportHeight }}
    >
      <SettingsNav />
      <Box as="main" position="relative" flex="1" overflowY="auto">
        <IconButton
          asChild
          aria-label={resources.settings.close}
          variant="ghost"
          size="sm"
          position="absolute"
          top={{ base: 3, md: 5 }}
          right={{ base: 3, md: 5 }}
        >
          <Link to={route.chat.root()} onClick={hidePassword}>
            <LuX />
          </Link>
        </IconButton>
        <Stack gap={8} maxW="3xl" mx="auto" px={{ base: 4, md: 8 }} py={{ base: 6, md: 12 }}>
          {children}
        </Stack>
      </Box>
    </Flex>
  );
};
